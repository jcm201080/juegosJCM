from flask import request, session
from flask_socketio import join_room, leave_room, emit


# ✅ IMPORTS CORREGIDOS A CLASSIC
from bingo.classic.logic.cartones import generar_carton
from bingo.classic.logic.bolas import BomboBingo
from bingo.classic.logic.validaciones import (
    comprobar_linea,
    comprobar_bingo,
    comprobar_cruz,
    comprobar_x
)
from bingo.classic.routes.bingo_routes import codigos_validos

from config import (
    BINGO_MAX_PLAYERS,
    BINGO_MIN_PLAYERS,
    BINGO_MAX_CARTONES,
    BINGO_MIN_CARTONES,
)

from bingo.classic.logic.bingo_stats import (
    ensure_bingo_stats,
    registrar_linea,
    registrar_bingo,
    crear_partida_bingo,
    registrar_cruz,
    registrar_partida_jugada
)

# =========================
# ESTADO EN MEMORIA
# =========================
salas_bingo = {}

NAMESPACE = "/bingo-classic"

# =========================
# UTILIDADES
# =========================
def perder_vidas(sala, sid, cantidad):
    jugador = sala["jugadores"].get(sid)
    if not jugador:
        return

    jugador["vidas"] = max(0, jugador["vidas"] - cantidad)
    emit("vidas_actualizadas", {"vidas": jugador["vidas"]}, room=sid, namespace=NAMESPACE)

    if jugador["vidas"] == 0:
        emit("sin_vidas", room=sid, namespace=NAMESPACE)


def emitir_estado(sala, jugador_sid):
    emit(
        "lista_jugadores",
        {
            "jugadores": [j["nombre"] for j in sala["jugadores"].values()],
            "host": jugador_sid == sala["host"],  # 🔥 CLAVE (como el bueno)
            "en_partida": sala["en_partida"],
            "actuales": len(sala["jugadores"]),
            "max": BINGO_MAX_PLAYERS,
            "min": BINGO_MIN_PLAYERS,
            "linea_cantada": sala.get("linea_cantada", False),
            "x_cantada": sala.get("x_cantado", False),
            "cruz_cantada": sala.get("cruz_cantada", False),
            "bingo_cantado": sala.get("bingo_cantado", False),
        },
        room=jugador_sid,
        namespace=NAMESPACE,
    )


def emitir_estado_a_todos(sala):
    for jugador_sid in sala["jugadores"]:
        emitir_estado(sala, jugador_sid)

def sumar_puntos(jugador, puntos):
    jugador["puntos"] += puntos


def emitir_ranking(socketio, codigo, sala):
    ranking = sorted(
        sala["jugadores"].values(),
        key=lambda j: j["puntos"],
        reverse=True
    )

    socketio.emit(
        "ranking_update",
        {
            "ranking": [
                {"nombre": j["nombre"], "puntos": j["puntos"]}
                for j in ranking
            ]
        },
        room=codigo,
        namespace=NAMESPACE
    )


# =========================
# SOCKETS
# =========================
def register_bingo_sockets(socketio):

    # -------------------------
    # UNIRSE A SALA
    # -------------------------
    @socketio.on("join_bingo", namespace=NAMESPACE)
    def join_bingo(data):
        codigo = data["codigo"]
        sid = request.sid

        nombre = (data.get("nombre") or "").strip() or "Invitado"
        num_cartones = max(1, min(int(data.get("cartones", 1)), 4))

        if codigo not in salas_bingo:
            if codigo not in codigos_validos:
                emit("codigo_erroneo", room=sid, namespace=NAMESPACE)
                return

            salas_bingo[codigo] = {
                "host": sid,
                "jugadores": {},
                "cartones": {},
                "en_partida": False,
                "bombo": BomboBingo(),
                "auto": {"activo": False, "intervalo": 20},
                "linea_cantada": False,
                "x_cantado": False,
                "cruz_cantada": False,
                "bingo_cantado": False,
            }

        sala = salas_bingo[codigo]

        if len(sala["jugadores"]) >= BINGO_MAX_PLAYERS:
            emit("sala_llena", room=sid, namespace=NAMESPACE)
            return

        sala["jugadores"][sid] = {
            "nombre": nombre,
            "vidas": 3,
            "puntos": 0,
            "cartones": num_cartones,
            "user_id": session.get("user_id"),
        }

        user_id = session.get("user_id")
        if user_id:
            ensure_bingo_stats(user_id)

        join_room(codigo, namespace=NAMESPACE)
        emitir_estado_a_todos(sala)

    # -------------------------
    # INICIAR PARTIDA
    # -------------------------
    @socketio.on("start_game", namespace=NAMESPACE)
    def start_game(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        if not sala or sala["host"] != sid:
            return

        num_cartones = max(1, min(int(data.get("cartones", 1)), 4))

        for jugador in sala["jugadores"].values():
            jugador["cartones"] = num_cartones

        sala["en_partida"] = True
        sala["linea_cantada"] = False
        sala["x_cantado"] = False
        sala["cruz_cantada"] = False
        sala["bingo_cantado"] = False
        sala["auto"]["activo"] = False
        sala["bombo"] = BomboBingo()
        sala["cartones"] = {}
        sala["partida_id"] = crear_partida_bingo(len(sala["jugadores"]))

        for jugador_sid, jugador in sala["jugadores"].items():
            cartones = [generar_carton() for _ in range(jugador["cartones"])]
            sala["cartones"][jugador_sid] = cartones
            emit("send_carton", {"cartones": cartones}, room=jugador_sid, namespace=NAMESPACE)

        emit("game_started", room=codigo, namespace=NAMESPACE)
        emitir_estado_a_todos(sala)

    # -------------------------
    # SACAR BOLA
    # -------------------------
    @socketio.on("new_ball", namespace=NAMESPACE)
    def new_ball(data):
        codigo = data["codigo"]
        sala = salas_bingo.get(codigo)

        if not sala or not sala["en_partida"] or sala["host"] != request.sid:
            return

        bola = sala["bombo"].sacar_bola()
        if bola is None:
            return

        emit(
            "bola_cantada",
            {"bola": bola, "historial": sala["bombo"].historial},
            room=codigo,
             namespace=NAMESPACE,
        )

    # -------------------------
    # AUTOPLAY
    # -------------------------
    @socketio.on("start_autoplay", namespace=NAMESPACE)
    def start_autoplay(data):
        codigo = data["codigo"]
        intervalo = int(data.get("interval", 20))
        sala = salas_bingo.get(codigo)

        if not sala or sala["host"] != request.sid or not sala["en_partida"]:
            return

        if sala["auto"]["activo"]:
            return

        sala["auto"]["activo"] = True
        sala["auto"]["intervalo"] = intervalo

        def loop():
            while sala["auto"]["activo"]:
                for i in range(intervalo, 0, -1):
                    if not sala["auto"]["activo"]:
                        return

                    socketio.emit(
                        "autoplay_tick",
                        {"seconds": i},
                        room=codigo,
                        namespace=NAMESPACE,
                    )
                    socketio.sleep(1)

                bola = sala["bombo"].sacar_bola()
                if bola is None:
                    sala["auto"]["activo"] = False
                    return

                socketio.emit(
                    "bola_cantada",
                    {
                        "bola": bola,
                        "historial": sala["bombo"].historial,
                    },
                    room=codigo,
                    namespace=NAMESPACE,
                )

        socketio.start_background_task(loop)



    @socketio.on("stop_autoplay", namespace=NAMESPACE)
    def stop_autoplay(data):
        codigo = data["codigo"]
        sala = salas_bingo.get(codigo)

        if sala and sala["host"] == request.sid:
            sala["auto"]["activo"] = False
            emit("autoplay_paused", room=codigo, namespace=NAMESPACE)


    # -------------------------
    # SALIR DE SALA
    # -------------------------
    @socketio.on("leave_bingo", namespace=NAMESPACE)
    def leave_bingo(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        if not sala:
            emit("salida_ok", room=sid, namespace=NAMESPACE)
            return

        sala["jugadores"].pop(sid, None)
        leave_room(codigo, namespace=NAMESPACE)

        if not sala["jugadores"]:
            salas_bingo.pop(codigo)
        else:
            if sala["host"] == sid:
                sala["host"] = next(iter(sala["jugadores"]))
            emitir_estado_a_todos(sala)

        emit("salida_ok", room=sid, namespace=NAMESPACE)

    # -------------------------
    # CANTAR LÍNEA
    # -------------------------
    @socketio.on("cantar_linea", namespace=NAMESPACE)
    def cantar_linea(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        if not sala or sala.get("linea_cantada"):
            emit("linea_invalida", room=sid, namespace=NAMESPACE)
            return

        jugador = sala["jugadores"].get(sid)
        for carton in sala["cartones"].get(sid, []):
            if comprobar_linea(carton, sala["bombo"].historial):
                sala["linea_cantada"] = True

                sumar_puntos(jugador, 1)
                emitir_ranking(socketio, codigo, sala)

                if jugador["user_id"]:
                    registrar_linea(jugador["user_id"], sala["partida_id"])

                emit("linea_valida", {"nombre": jugador["nombre"]}, room=codigo, namespace=NAMESPACE)
                emitir_estado_a_todos(sala)
                return


        perder_vidas(sala, sid, 1)
        emit("linea_invalida", room=sid, namespace=NAMESPACE)

    # -------------------------
    # CANTAR X
    # -------------------------
    @socketio.on("cantar_x", namespace=NAMESPACE)
    def cantar_x(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        # 🔒 BLOQUEO GLOBAL CORRECTO
        if not sala or sala.get("x_cantado"):
            emit("x_invalida", room=sid, namespace=NAMESPACE)
            return

        jugador = sala["jugadores"].get(sid)

        for carton in sala["cartones"].get(sid, []):
            if comprobar_x(carton, sala["bombo"].historial):
                sala["x_cantado"] = True   # ✅ AQUÍ

                sumar_puntos(jugador, 2)
                emitir_ranking(socketio, codigo, sala)

                emit(
                    "x_valida",
                    {"nombre": jugador["nombre"]},
                    room=codigo,
                    namespace=NAMESPACE,
                )

                emitir_estado_a_todos(sala)
                return

        perder_vidas(sala, sid, 1)
        emit("x_invalida", room=sid, namespace=NAMESPACE)




    # -------------------------
    # CANTAR CRUZ
    # -------------------------
    @socketio.on("cantar_cruz", namespace=NAMESPACE)
    def cantar_cruz(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        if not sala or sala.get("cruz_cantada"):
            emit("cruz_invalida", room=sid, namespace=NAMESPACE)
            return

        jugador = sala["jugadores"].get(sid)

        for carton in sala["cartones"].get(sid, []):
            if comprobar_cruz(carton, sala["bombo"].historial):
                sala["cruz_cantada"] = True

                # ✅ SUMAR PUNTOS
                sumar_puntos(jugador, 2)
                emitir_ranking(socketio, codigo, sala)

                if jugador["user_id"]:
                    registrar_cruz(jugador["user_id"], sala["partida_id"])

                emit(
                    "cruz_valida",
                    {"nombre": jugador["nombre"]},
                    room=codigo,
                    namespace=NAMESPACE
                )

                emitir_estado_a_todos(sala)
                return

        perder_vidas(sala, sid, 1)
        emit("cruz_invalida", room=sid, namespace=NAMESPACE)


    # -------------------------
    # CANTAR BINGO
    # -------------------------
    @socketio.on("cantar_bingo", namespace=NAMESPACE)
    def cantar_bingo(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        if not sala:
            return

        jugador = sala["jugadores"].get(sid)

        for carton in sala["cartones"].get(sid, []):
            if comprobar_bingo(carton, sala["bombo"].historial):
                sala["bingo_cantado"] = True
                sala["en_partida"] = False
                sala["auto"]["activo"] = False

                # ✅ SUMAR PUNTOS
                sumar_puntos(jugador, 5)
                emitir_ranking(socketio, codigo, sala)

                for j in sala["jugadores"].values():
                    if j["user_id"]:
                        registrar_partida_jugada(j["user_id"])

                if jugador["user_id"]:
                    registrar_bingo(
                        jugador["user_id"],
                        sala["partida_id"],
                        len(sala["bombo"].historial) * 5,
                    )

                emit(
                    "bingo_valido",
                    {"nombre": jugador["nombre"]},
                    room=codigo,
                    namespace=NAMESPACE
                )

                emitir_estado_a_todos(sala)
                return

        perder_vidas(sala, sid, 2)
        emit("bingo_invalido", room=sid, namespace=NAMESPACE)


    # -------------------------
    # DESCONECTAR
    # -------------------------
    @socketio.on("disconnect", namespace=NAMESPACE)
    def disconnect():
        sid = request.sid
        for codigo, sala in list(salas_bingo.items()):
            if sid in sala["jugadores"]:
                sala["jugadores"].pop(sid)
                if not sala["jugadores"]:
                    salas_bingo.pop(codigo)
                else:
                    if sala["host"] == sid:
                        sala["host"] = next(iter(sala["jugadores"]))
                    emitir_estado_a_todos(sala)
                break

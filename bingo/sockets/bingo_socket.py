from flask import request, session
from flask_socketio import join_room, leave_room, emit

from bingo.logic.cartones import generar_carton
from bingo.logic.bolas import BomboBingo
from bingo.logic.validaciones import comprobar_linea, comprobar_bingo, comprobar_cruz
from bingo.routes.bingo_routes import codigos_validos
from config import (  
    BINGO_MAX_PLAYERS,
    BINGO_MIN_PLAYERS,
    BINGO_MAX_CARTONES,
    BINGO_MIN_CARTONES,
)

from bingo.logic.bingo_stats import registrar_linea, registrar_bingo, crear_partida_bingo, registrar_cruz, registrar_partida_jugada







# =========================
# ESTADO EN MEMORIA
# =========================
salas_bingo = {}


# =========================
# UTILIDADES
# =========================
def perder_vidas(sala, sid, cantidad):
    jugador = sala["jugadores"].get(sid)
    if not jugador:
        return

    jugador["vidas"] = max(0, jugador["vidas"] - cantidad)
    emit("vidas_actualizadas", {"vidas": jugador["vidas"]}, room=sid)

    if jugador["vidas"] == 0:
        emit("sin_vidas", room=sid)


def emitir_estado(sala, jugador_sid):
    emit(
        "lista_jugadores",
        {
            "jugadores": [j["nombre"] for j in sala["jugadores"].values()],
            "host": jugador_sid == sala["host"],
            "en_partida": sala["en_partida"],
            "actuales": len(sala["jugadores"]),
            "max": BINGO_MAX_PLAYERS,
            "min": BINGO_MIN_PLAYERS,
            "linea_cantada": sala.get("linea_cantada", False),
            "cruz_cantada": sala.get("cruz_cantada", False),
            "bingo_cantado": sala.get("bingo_cantado", False),

        },
        room=jugador_sid,
    )


def emitir_estado_a_todos(sala):
    for jugador_sid in sala["jugadores"]:
        emitir_estado(sala, jugador_sid)


# =========================
# SOCKETS
# =========================
def register_bingo_sockets(socketio):

    # -------------------------
    # UNIRSE A SALA
    # -------------------------
    @socketio.on("join_bingo")
    def join_bingo(data):
        codigo = data["codigo"]
        sid = request.sid

        # 🧠 Nombre recibido (puede venir vacío)
        nombre = (data.get("nombre") or "").strip()
        if not nombre:
            nombre = "Invitado"


        num_cartones = int(data.get("cartones", 1))
        num_cartones = max(1, min(num_cartones, 4))

        # ───────── Crear sala si no existe ─────────
        if codigo not in salas_bingo:
            if codigo not in codigos_validos:
                emit("codigo_erroneo", room=sid)
                return

            salas_bingo[codigo] = {
                "host": sid,
                "jugadores": {},
                "cartones": {},
                "en_partida": False,
                "bombo": BomboBingo(),
                "auto": {"activo": False, "intervalo": 20},
                "linea_cantada": False,
                "cruz_cantada": False,
                "bingo_cantado": False,                
            }

        sala = salas_bingo[codigo]

        # ───────── Sala llena ─────────
        if len(sala["jugadores"]) >= BINGO_MAX_PLAYERS:
            emit("sala_llena", room=sid)
            return

        # 🏷️ Nombre automático si no escribió nada
        if not nombre:
            numero = len(sala["jugadores"]) + 1
            nombre = f"Jugador {numero}"

        # ───────── Registrar jugador ─────────
        sala["jugadores"][sid] = {
            "nombre": nombre,
            "vidas": 3,
            "cartones": num_cartones,
            "user_id": session.get("user_id"), 
        }

        join_room(codigo)
        emitir_estado_a_todos(sala)


    # -------------------------
    # INICIAR PARTIDA
    # -------------------------
    @socketio.on("start_game")
    def start_game(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        if not sala or sala["host"] != sid:
            return

        num_cartones = int(data.get("cartones", 1))
        num_cartones = max(1, min(num_cartones, 4))

        for jugador in sala["jugadores"].values():
            jugador["cartones"] = num_cartones

        sala["en_partida"] = True
        sala["linea_cantada"] = False
        sala["cruz_cantada"] = False
        sala["bingo_cantado"] = False
        sala["auto"]["activo"] = False
        sala["bombo"] = BomboBingo()
        sala["cartones"] = {}
        sala["partida_id"] = crear_partida_bingo(len(sala["jugadores"]))

        for jugador_sid, jugador in sala["jugadores"].items():
            lista_cartones = [generar_carton() for _ in range(jugador["cartones"])]
            sala["cartones"][jugador_sid] = lista_cartones

            emit(
                "send_carton",
                {"cartones": lista_cartones},
                room=jugador_sid,
            )

        emit("game_started", room=codigo)
        emitir_estado_a_todos(sala)

    # -------------------------
    # SACAR BOLA
    # -------------------------
    @socketio.on("new_ball")
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
        )

    # -------------------------
    # AUTOPLAY
    # -------------------------
    @socketio.on("start_autoplay")
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
                    socketio.emit("autoplay_tick", {"seconds": i}, room=codigo)
                    socketio.sleep(1)

                bola = sala["bombo"].sacar_bola()
                if bola is None:
                    sala["auto"]["activo"] = False
                    return

                socketio.emit(
                    "bola_cantada",
                    {"bola": bola, "historial": sala["bombo"].historial},
                    room=codigo,
                )

        socketio.start_background_task(loop)

    @socketio.on("stop_autoplay")
    def stop_autoplay(data):
        sala = salas_bingo.get(data["codigo"])
        if sala and sala["host"] == request.sid:
            sala["auto"]["activo"] = False
            emit("autoplay_paused", room=data["codigo"])

    # -------------------------
    # SALIR DE SALA
    # -------------------------
    @socketio.on("leave_bingo")
    def leave_bingo(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        if not sala:
            emit("salida_ok", room=sid)
            return

        sala["jugadores"].pop(sid, None)
        leave_room(codigo)

        if not sala["jugadores"]:
            salas_bingo.pop(codigo)
        else:
            if sala["host"] == sid:
                sala["host"] = next(iter(sala["jugadores"]))
            emitir_estado_a_todos(sala)

        emit("salida_ok", room=sid)

    # -------------------------
    # CANTAR LÍNEA
    # -------------------------
    @socketio.on("cantar_linea")
    def cantar_linea(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        if not sala or sala.get("linea_cantada"):
            emit("linea_invalida", room=sid)
            return

        jugador = sala["jugadores"].get(sid)
        cartones = sala["cartones"].get(sid, [])
        bolas = sala["bombo"].historial

        for carton in cartones:
            if comprobar_linea(carton, bolas):
                sala["linea_cantada"] = True

                user_id = jugador.get("user_id")
                if user_id:
                    registrar_linea(user_id, sala["partida_id"])

                emit(
                    "linea_valida",
                    {"nombre": jugador["nombre"]},
                    room=codigo
                )
                emitir_estado_a_todos(sala)
                return


        perder_vidas(sala, sid, 1)
        emit("linea_invalida", room=sid)

    # -------------------------
    # CANTAR CRUZ
    # -------------------------
    @socketio.on("cantar_cruz")
    def cantar_cruz(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        if not sala or sala.get("cruz_cantada"):
            emit("cruz_invalida", room=sid)
            return

        jugador = sala["jugadores"].get(sid)
        cartones = sala["cartones"].get(sid, [])
        bolas = sala["bombo"].historial

    
        for carton in cartones:
            if comprobar_cruz(carton, bolas):
                sala["cruz_cantada"] = True

                user_id = jugador.get("user_id")
                if user_id:
                    registrar_cruz(user_id, sala["partida_id"])

                emit(
                    "cruz_valida",
                    {"nombre": jugador["nombre"]},
                    room=codigo
                )

                emitir_estado_a_todos(sala)
                return   # ← SOLO aquí



        perder_vidas(sala, sid, 1)
        emit("cruz_invalida", room=sid)


    # -------------------------
    # CANTAR BINGO
    # -------------------------
    @socketio.on("cantar_bingo")
    def cantar_bingo(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        if not sala:
            return

        jugador = sala["jugadores"].get(sid)
        cartones = sala["cartones"].get(sid, [])
        bolas = sala["bombo"].historial

        for carton in cartones:
            if comprobar_bingo(carton, bolas):
                sala["bingo_cantado"] = True
                sala["en_partida"] = False
                sala["auto"]["activo"] = False

                # 🔹 Registrar partida jugada para TODOS los jugadores
                for j in sala["jugadores"].values():
                    uid = j.get("user_id")
                    if uid:
                        registrar_partida_jugada(uid)

                # 🔹 Registrar bingo SOLO del ganador
                user_id = jugador.get("user_id")
                if user_id:
                    registrar_bingo(
                        user_id=user_id,
                        partida_id=sala["partida_id"],
                        duracion_sec=len(bolas) * 5
                    )

                emit(
                    "bingo_valido",
                    {"nombre": jugador["nombre"]},
                    room=codigo,
                )
                emitir_estado_a_todos(sala)
                return

        perder_vidas(sala, sid, 2)
        emit("bingo_invalido", room=sid)



    # -------------------------
    # DESCONECTAR
    # -------------------------
    @socketio.on("disconnect")
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

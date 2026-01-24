from flask import request
from flask_socketio import join_room, leave_room, emit
from bingo.logic.cartones import generar_carton
from bingo.logic.bolas import BomboBingo
from bingo.logic.validaciones import comprobar_linea, comprobar_bingo
from bingo.routes.bingo_routes import codigos_validos
from config import BINGO_MAX_PLAYERS, BINGO_MIN_PLAYERS, BINGO_MAX_CARTONES, BINGO_MIN_CARTONES

# =========================
# ESTADO EN MEMORIA
# =========================
salas_bingo = {}


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
            "bingo_cantado": sala.get("bingo_cantado", False),
        },
        room=jugador_sid
    )


def emitir_estado_a_todos(sala):
    for jugador_sid in sala["jugadores"]:
        emitir_estado(sala, jugador_sid)


# =========================
# SOCKETS
# =========================
def register_bingo_sockets(socketio):

    @socketio.on("join_bingo")
    def join_bingo(data):
        codigo = data["codigo"]
        sid = request.sid
        nombre = data.get("nombre", "Jugador")

        num_cartones = int(data.get("cartones", 1))
        num_cartones = max(1, min(num_cartones, 4))  # límite 1–4

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
            }

        sala = salas_bingo[codigo]

        if len(sala["jugadores"]) >= BINGO_MAX_PLAYERS:
            emit("sala_llena", room=sid)
            return

        # ✅ AQUÍ está la clave
        sala["jugadores"][sid] = {
            "nombre": nombre,
            "vidas": 3,
            "cartones": num_cartones
        }

        join_room(codigo)
        emitir_estado_a_todos(sala)




    @socketio.on("start_game")
    def start_game(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        if not sala or sala["host"] != sid:
            return

        # 🆕 LEEMOS CUÁNTOS CARTONES HA ELEGIDO EL HOST
        num_cartones = int(data.get("cartones", 1))
        num_cartones = max(1, min(num_cartones, 4))  # límite 1–4

        # ✅ ACTUALIZAMOS A TODOS LOS JUGADORES
        for jugador in sala["jugadores"].values():
            jugador["cartones"] = num_cartones

        print("🎟️ Cartones por jugador:")
        for jsid, jugador in sala["jugadores"].items():
            print(jsid, jugador["cartones"])

        # 🎬 Estado de partida
        sala["en_partida"] = True
        sala["linea_cantada"] = False
        sala["bingo_cantado"] = False
        sala["auto"]["activo"] = False
        sala["bombo"] = BomboBingo()

        # 🔄 Reiniciar cartones
        sala["cartones"] = {}

        # 🎟️ Repartir VARIOS cartones por jugador
        for jugador_sid, jugador in sala["jugadores"].items():
            lista_cartones = []

            for _ in range(jugador["cartones"]):
                lista_cartones.append(generar_carton())

            # 💾 Guardamos todos los cartones del jugador
            sala["cartones"][jugador_sid] = lista_cartones

            # 📤 Enviamos todos sus cartones al cliente
            emit(
                "send_carton",
                {"cartones": lista_cartones},
                room=jugador_sid
            )

        emit("game_started", room=codigo)
        emitir_estado_a_todos(sala)




    @socketio.on("new_ball")
    def new_ball(data):
        codigo = data["codigo"]
        sala = salas_bingo.get(codigo)

        if not sala or not sala["en_partida"] or sala["host"] != request.sid:
            return

        bola = sala["bombo"].sacar_bola()
        if bola is None:
            return

        emit("bola_cantada", {"bola": bola, "historial": sala["bombo"].historial}, room=codigo)


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
                    room=codigo
                )

        socketio.start_background_task(loop)


    @socketio.on("stop_autoplay")
    def stop_autoplay(data):
        sala = salas_bingo.get(data["codigo"])
        if sala and sala["host"] == request.sid:
            sala["auto"]["activo"] = False
            emit("autoplay_paused", room=data["codigo"])


    @socketio.on("leave_bingo")
    def leave_bingo(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        if not sala:
            emit("salida_ok")
            return

        sala["jugadores"].pop(sid, None)
        leave_room(codigo)

        if not sala["jugadores"]:
            salas_bingo.pop(codigo)
        else:
            if sala["host"] == sid:
                sala["host"] = next(iter(sala["jugadores"]))
            emitir_estado_a_todos(sala)

        emit("salida_ok")


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


    @socketio.on("cantar_linea")
    def cantar_linea(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        if not sala or sala.get("linea_cantada"):
            emit("linea_invalida", room=sid)
            return

        cartones = sala["cartones"].get(sid, [])
        bolas = sala["bombo"].historial

        for carton in cartones:
            if comprobar_linea(carton, bolas):
                sala["linea_cantada"] = True
                emit("linea_valida", room=codigo)
                emitir_estado_a_todos(sala)
                return

        # ❌ Ningún cartón tenía línea
        perder_vidas(sala, sid, 1)
        emit("linea_invalida", room=sid)




    @socketio.on("cantar_bingo")
    def cantar_bingo(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        if not sala:
            return

        cartones = sala["cartones"].get(sid, [])
        bolas = sala["bombo"].historial

        for carton in cartones:
            if comprobar_bingo(carton, bolas):
                sala["bingo_cantado"] = True
                sala["en_partida"] = False
                sala["auto"]["activo"] = False

                emit("bingo_valido", room=codigo)
                emitir_estado_a_todos(sala)
                return

        # ❌ Ningún cartón tenía bingo
        perder_vidas(sala, sid, 2)
        emit("bingo_invalido", room=sid)





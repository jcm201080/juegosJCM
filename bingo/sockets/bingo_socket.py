from flask import request
from flask_socketio import join_room, leave_room, emit
from threading import Thread
import time

from bingo.logic.cartones import generar_carton
from bingo.logic.bolas import BomboBingo


# =========================
# ESTADO EN MEMORIA
# =========================
salas_bingo = {}
# {
#   "AB3F": {
#       "host": sid,
#       "jugadores": { sid: nombre },
#       "en_partida": False,
#       "bombo": BomboBingo(),
#       "auto": {
#           "activo": False,
#           "intervalo": 20,
#           "remaining": 0
#       }
#   }
# }


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
        nombre = data["nombre"]
        sid = request.sid

        if codigo not in salas_bingo:
            salas_bingo[codigo] = {
                "host": sid,
                "jugadores": {},
                "en_partida": False,
                "bombo": BomboBingo(),
                "auto": {
                    "activo": False,
                    "intervalo": 20,
                    "remaining": 0
                }
            }

        sala = salas_bingo[codigo]

        if len(sala["jugadores"]) >= 8:
            emit("sala_llena")
            return

        sala["jugadores"][sid] = nombre
        join_room(codigo)

        for jugador_sid in sala["jugadores"]:
            emit(
                "lista_jugadores",
                {
                    "jugadores": list(sala["jugadores"].values()),
                    "host": jugador_sid == sala["host"],
                    "en_partida": sala["en_partida"],
                    "actuales": len(sala["jugadores"]),
                    "max": 8
                },
                room=jugador_sid
            )

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

        sala["en_partida"] = True

        for jugador_sid in sala["jugadores"]:
            emit(
                "send_carton",
                {"carton": generar_carton()},
                room=jugador_sid
            )

        emit("game_started", room=codigo)

        for jugador_sid in sala["jugadores"]:
            emit(
                "lista_jugadores",
                {
                    "jugadores": list(sala["jugadores"].values()),
                    "host": jugador_sid == sala["host"],
                    "en_partida": True,
                    "actuales": len(sala["jugadores"]),
                    "max": 8
                },
                room=jugador_sid
            )

    # -------------------------
    # SACAR BOLA MANUAL (HOST)
    # -------------------------
    @socketio.on("new_ball")
    def new_ball(data):
        codigo = data["codigo"]
        sid = request.sid

        sala = salas_bingo.get(codigo)
        if not sala or not sala["en_partida"] or sala["host"] != sid:
            return

        bola = sala["bombo"].sacar_bola()
        if bola is None:
            return

        emit(
            "bola_cantada",
            {
                "bola": bola,
                "historial": sala["bombo"].historial
            },
            room=codigo
        )

    # -------------------------
    # AUTOPLAY START (HOST)
    # -------------------------
    @socketio.on("start_autoplay")
    def start_autoplay(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        if not sala:
            return

        # 🔒 solo host
        if sala["host"] != sid:
            return

        # 🛑 partida iniciada
        if not sala["en_partida"]:
            return

        # 🛑 no duplicar autoplay
        if sala["auto"]["activo"]:
            return

        sala["auto"]["activo"] = True
        intervalo = sala["auto"]["intervalo"]

        def autoplay_loop():
            while sala["auto"]["activo"]:
                # ⏳ cuenta atrás
                for i in range(intervalo, 0, -1):
                    if not sala["auto"]["activo"]:
                        return

                    socketio.emit(
                        "autoplay_tick",
                        {"seconds": i},
                        room=codigo
                    )
                    socketio.sleep(1)   # ✅ SIEMPRE socketio.sleep

                # 🎱 sacar bola (MISMA lógica que manual)
                bola = sala["bombo"].sacar_bola()
                if bola is None:
                    sala["auto"]["activo"] = False
                    return

                socketio.emit(
                    "bola_cantada",
                    {
                        "bola": bola,
                        "historial": sala["bombo"].historial
                    },
                    room=codigo
                )

        # ✅ ESTO ES LA CLAVE
        socketio.start_background_task(autoplay_loop)


       # -------------------------
    # AUTOPLAY STOP (HOST)
    # -------------------------
    @socketio.on("stop_autoplay")
    def stop_autoplay(data):
        codigo = data["codigo"]
        sid = request.sid
        sala = salas_bingo.get(codigo)

        if not sala or sala["host"] != sid:
            return

        sala["auto"]["activo"] = False
        socketio.emit("autoplay_paused", room=codigo)



    # -------------------------
    # SALIR DE SALA
    # -------------------------
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

        if sala["host"] == sid:
            emit("sala_cerrada", room=codigo)
            salas_bingo.pop(codigo, None)
            emit("salida_ok")
            return

        if not sala["jugadores"]:
            salas_bingo.pop(codigo, None)
            emit("salida_ok")
            return

        emit(
            "lista_jugadores",
            {
                "jugadores": list(sala["jugadores"].values()),
                "actuales": len(sala["jugadores"]),
                "max": 8,
                "host": False,
                "en_partida": sala["en_partida"]
            },
            room=codigo
        )

        emit("salida_ok")


    # -------------------------
    # DISCONNECT
    # -------------------------
    @socketio.on("disconnect")
    def desconectar():
        sid = request.sid

        for codigo, sala in list(salas_bingo.items()):
            if sid in sala["jugadores"]:
                sala["jugadores"].pop(sid)

                if sala["host"] == sid and sala["jugadores"]:
                    sala["host"] = next(iter(sala["jugadores"]))

                if not sala["jugadores"]:
                    salas_bingo.pop(codigo)
                else:
                    emit(
                        "lista_jugadores",
                        {
                            "jugadores": list(sala["jugadores"].values()),
                            "host": False,
                            "en_partida": sala["en_partida"]
                        },
                        room=codigo
                    )
                break

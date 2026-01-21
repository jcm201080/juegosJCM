from flask import request
from flask_socketio import join_room, emit

from bingo.logic.cartones import generar_carton
from bingo.logic.bolas import BomboBingo
from flask_socketio import join_room, leave_room, emit




# Estado en memoria
salas_bingo = {}
# {
#   "AB3F": {
#       "host": sid,
#       "jugadores": { sid: nombre },
#       "en_partida": False
#   }
# }


def register_bingo_sockets(socketio):

    @socketio.on("join_bingo")
    def join_bingo(data):
        codigo = data["codigo"]
        nombre = data["nombre"]
        sid = request.sid  # 🔹 SIEMPRE del servidor

        # Crear sala si no existe
        if codigo not in salas_bingo:
            salas_bingo[codigo] = {
                "host": sid,
                "jugadores": {},
                "en_partida": False,
                "bombo": BomboBingo()
            }



        sala = salas_bingo[codigo]

        # Máximo 8 jugadores
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






    @socketio.on("start_game")
    def start_game(data):
        codigo = data["codigo"]
        sid = request.sid

        sala = salas_bingo.get(codigo)
        if not sala:
            return

        if sala["host"] != sid:
            emit("error", {"msg": "Solo el host puede iniciar la partida"})
            return

        sala["en_partida"] = True

        # 🔥 Generar cartón para cada jugador
        for jugador_sid in sala["jugadores"]:
            carton = generar_carton()
            emit(
                "send_carton",
                {"carton": carton},
                room=jugador_sid
            )

        emit(
            "game_started",
            {"msg": "La partida ha comenzado"},
            room=codigo
        )


    @socketio.on("disconnect")
    def desconectar():
        sid = request.sid

        for codigo, sala in list(salas_bingo.items()):
            if sid in sala["jugadores"]:
                sala["jugadores"].pop(sid)

                # Reasignar host si hace falta
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
    
    @socketio.on("new_ball")
    def new_ball(data):
        codigo = data["codigo"]
        sid = request.sid

        sala = salas_bingo.get(codigo)
        if not sala or not sala["en_partida"]:
            return

        if sala["host"] != sid:
            emit("error", {"msg": "Solo el host puede sacar bola"})
            return

        bola = sala["bombo"].sacar_bola()
        if bola is None:
            emit("error", {"msg": "No quedan bolas"})
            return

        emit(
            "bola_cantada",
            {
                "bola": bola,
                "historial": sala["bombo"].historial
            },
            room=codigo
        )

    @socketio.on("leave_bingo")
    def leave_bingo(data):
        codigo = data.get("codigo")
        sid = request.sid

        sala = salas_bingo.get(codigo)
        if not sala:
            emit("salida_ok")
            return

        sala["jugadores"].pop(sid, None)
        leave_room(codigo)

        # Si se va el host → cerrar sala
        if sala["host"] == sid:
            emit("sala_cerrada", room=codigo)
            salas_bingo.pop(codigo, None)
            emit("salida_ok")
            return

        # Si no quedan jugadores → borrar sala
        if not sala["jugadores"]:
            salas_bingo.pop(codigo, None)
            emit("salida_ok")
            return

        # Actualizar al resto
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
        print("🚪 leave_bingo:", sid, "sala:", codigo)



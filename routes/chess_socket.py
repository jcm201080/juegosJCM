from flask import request
from flask_socketio import emit

import time
from routes.chess_rooms import rooms, sid_to_room


# 🔗 Importamos el mapa sid → room
from routes.chess_rooms import sid_to_room


def register_chess_sockets(socketio):

    # =========================
    # 🔌 CONEXIÓN
    # =========================
    @socketio.on("connect")
    def on_connect():
        print("🔌 Chess socket conectado:", request.sid)

    # =========================
    # ❌ DESCONEXIÓN
    # =========================
    @socketio.on("disconnect")
    def on_disconnect():
        sid = request.sid
        room = sid_to_room.get(sid)

        print("❌ Chess socket desconectado:", sid)

        if room:
            emit("player_left", room=room)

    # =========================
    # ♟️ MOVIMIENTO (AÚN GLOBAL)
    # =========================
    @socketio.on("move")
    def on_move(data):
        sid = request.sid
        room = sid_to_room.get(sid)

        if not room:
            return

        r = rooms.get(room)
        if not r or r["game_over"]:
            return

        # 🔁 CAMBIAR TURNO
        r["turn"] = "black" if r["turn"] == "white" else "white"

        # ⏱️ REINICIAR RELOJ PARA EL NUEVO TURNO
        if r["clock"]["enabled"]:
            r["clock"]["last_tick"] = time.time()

        # 🔁 REENVIAR MOVIMIENTO (incluye promoción si viene)
        socketio.emit("move", data, room=room)



    # =========================
    # 🤝 TABLAS
    # =========================
    @socketio.on("offer_draw")
    def on_offer_draw():
        sid = request.sid
        room = sid_to_room.get(sid)

        if not room:
            return

        emit("draw_offered", room=room)


    @socketio.on("accept_draw")
    def on_accept_draw():
        sid = request.sid
        room = sid_to_room.get(sid)
        if not room:
            return

        r = rooms.get(room)
        if r:
            r["game_over"] = True
            r["clock"]["enabled"] = False

        emit("draw_accepted", room=room)


    @socketio.on("reject_draw")
    def on_reject_draw():
        sid = request.sid
        room = sid_to_room.get(sid)

        if not room:
            return

        emit("draw_rejected", room=room, skip_sid=sid)

    # =========================
    # 🏳️ RENDICIÓN
    # =========================
    @socketio.on("resign")
    def on_resign():
        sid = request.sid
        room = sid_to_room.get(sid)
        if not room:
            return

        r = rooms.get(room)
        if not r or r["game_over"]:
            return

        # 🔍 Determinar quién se rinde
        if r["white"] == sid:
            resigned_color = "white"
        elif r["black"] == sid:
            resigned_color = "black"
        else:
            return  # espectador u error

        # 🛑 Finalizar partida
        r["game_over"] = True
        r["clock"]["enabled"] = False

        # 📢 Avisar a todos
        socketio.emit(
            "player_resigned",
            {"resigned": resigned_color},
            room=room
        )





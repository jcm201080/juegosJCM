from flask import request
from flask_socketio import emit

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

        emit("move", {
            "from": data["from"],
            "to": data["to"]
        }, room=room)

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

        emit(
            "player_resigned",
            {"sid": sid},
            room=room
        )



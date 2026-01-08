# routes/chess_socket.py
from flask_socketio import emit
from flask import request

players = {
    "white": None,
    "black": None
}

def register_chess_sockets(socketio):

    # =========================
    # 🔌 CONEXIÓN
    # =========================
    @socketio.on("connect")
    def on_connect():
        print("🔌 Chess socket conectado")

        role = None

        if players["white"] is None:
            players["white"] = request.sid
            role = "white"
        elif players["black"] is None:
            players["black"] = request.sid
            role = "black"
        else:
            role = "spectator"

        emit("role_assigned", {"role": role})

        if players["white"] and players["black"]:
            socketio.emit("game_start")

        print(f"♟️ Rol asignado: {role}")

    # =========================
    # ❌ DESCONEXIÓN
    # =========================
    @socketio.on("disconnect")
    def on_disconnect():
        sid = request.sid
        print("❌ Chess socket desconectado:", sid)

        for color in ["white", "black"]:
            if players[color] == sid:
                players[color] = None
                socketio.emit("player_left", {"color": color})
                break

    # =========================
    # ♟️ MOVIMIENTO ONLINE
    # =========================
    @socketio.on("move")
    def on_move(data):
        sid = request.sid

        if players["white"] == sid:
            color = "white"
        elif players["black"] == sid:
            color = "black"
        else:
            return  # espectador no mueve

        print(f"♟️ Movimiento recibido de {color}: {data}")

        socketio.emit("move", {
            "from": data["from"],
            "to": data["to"],
            "color": color
        })

    # =========================
    # 🔄 RESET DE PARTIDA
    # =========================
    @socketio.on("reset_game")
    def on_reset_game():
        print("🔄 Partida reiniciada por un jugador")

        socketio.emit("game_reset")

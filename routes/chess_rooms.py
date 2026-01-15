# routes/chess_rooms.py
import random
import string
from flask import request
from flask_socketio import emit, join_room

rooms = {}
sid_to_room = {}

def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))


def register_chess_rooms(socketio):

    @socketio.on("create_room")
    def on_create_room():
        room = generate_room_code()
        sid = request.sid

        rooms[room] = {
            "white": sid,
            "black": None,
            "spectators": [],
            "game_over": False
        }

        sid_to_room[sid] = room
        join_room(room)

        emit("room_created", {
            "room": room,
            "role": "white"
        })

        print(f"🏠 Sala creada: {room} (white)")


    @socketio.on("join_room")
    def on_join_room(data):
        room = data.get("room")
        sid = request.sid

        if room not in rooms:
            emit("room_error", {"msg": "La sala no existe"})
            return

        if rooms[room]["black"] is None:
            rooms[room]["black"] = sid
            role = "black"
        else:
            rooms[room]["spectators"].append(sid)
            role = "spectator"

        sid_to_room[sid] = room
        join_room(room)

        emit("room_joined", {
            "room": room,
            "role": role
        })

        if rooms[room]["white"] and rooms[room]["black"]:
            socketio.emit("game_start", room=room)
            print(f"♟️ Partida iniciada en sala {room}")


        print(f"👤 {sid} unido a {room} como {role}")

# routes/chess_rooms.py
import random
import string
from flask import request
from flask_socketio import emit, join_room
import time

rooms = {}
sid_to_room = {}
socketio_ref = None


def generate_room_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))


def register_chess_rooms(socketio):
    global socketio_ref
    socketio_ref = socketio

    @socketio.on("create_room")
    def on_create_room(data=None):
        data = data or {}
        time_control = data.get("time")  # segundos o None

        room = generate_room_code()
        sid = request.sid

        clock_enabled = time_control is not None

        rooms[room] = {
            "white": sid,
            "black": None,
            "spectators": [],
            "game_over": False,
            "turn": "white",

            "clock": {
                "enabled": clock_enabled,
                "white": time_control,
                "black": time_control,
                "last_tick": None,
                "task": None
            }
        }

        sid_to_room[sid] = room
        join_room(room)

        emit("room_created", {
            "room": room,
            "role": "white"
        })

        print(f"🏠 Sala creada: {room} ⏱️ reloj={clock_enabled}")



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

            if rooms[room]["clock"]["enabled"] and rooms[room]["clock"]["task"] is None:
                rooms[room]["clock"]["last_tick"] = time.time()
                rooms[room]["clock"]["task"] = socketio.start_background_task(
                    chess_clock_loop,
                    room
    )




        print(f"👤 {sid} unido a {room} como {role}")


def chess_clock_loop(room):
    while room in rooms:
        r = rooms.get(room)
        if not r or r["game_over"]:
            return

        clock = r["clock"]
        if not clock["enabled"]:
            socketio_ref.sleep(1)
            continue

        now = time.time()
        last = clock["last_tick"]

        if last is None:
            clock["last_tick"] = now
            socketio_ref.sleep(1)
            continue

        elapsed = int(now - last)
        if elapsed <= 0:
            socketio_ref.sleep(1)
            continue

        turn = r["turn"]
        clock[turn] -= elapsed
        clock["last_tick"] = now

        if clock[turn] <= 0:
            clock[turn] = 0
            r["game_over"] = True

            socketio_ref.emit("time_over", {
                "loser": turn,
                "winner": "black" if turn == "white" else "white"
            }, room=room)
            return

        socketio_ref.emit("clock_update", {
            "enabled": True,
            "white": clock["white"],
            "black": clock["black"]
        }, room=room)

        socketio_ref.sleep(1)


def stop_clock(room):
    r = rooms.get(room)
    if not r:
        return

    clock = r["clock"]
    clock["enabled"] = False
    clock["last_tick"] = None

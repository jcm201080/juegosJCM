# routes/oca_online_api.py
from flask import Blueprint, request, jsonify
import random
import string
import time

oca_api = Blueprint("oca_api", __name__, url_prefix="/api/oca")

# ⚠️ Para Render lo ideal es DB. Esto en memoria vale para local/dev.
GAMES = {}

NUM_CASILLAS = 55
CASILLA_FINAL = NUM_CASILLAS - 1

def new_code(n=5):
    return "".join(random.choice(string.ascii_uppercase + string.digits) for _ in range(n))

def hsl_color(i):
    # mismo “rollo” que tu JS
    return f"hsl({i*60}, 70%, 50%)"

def initial_state(code):
    return {
        "code": code,
        "players": [],
        "turn_index": 0,
        "last_roll": None,
        "message": "Partida creada. Comparte el código para que se unan.",
        "finished": False,
        "winner_id": None,
        "winner_name": None,
        "updated_at": time.time()
    }

def add_player(state, name):
    pid = new_code(8)
    idx = len(state["players"])
    state["players"].append({
        "id": pid,
        "name": name,
        "pos": -1,
        "skip": False,
        "color": hsl_color(idx)
    })
    state["updated_at"] = time.time()
    return pid

def find_player(state, player_id):
    for p in state["players"]:
        if p["id"] == player_id:
            return p
    return None

def apply_specials(p, state):
    # devuelve event: premio/penalizacion/muerte/None
    event = None
    num = p["pos"] + 1

    # cárcel 12 y 46
    if num in (12, 46):
        p["skip"] = True
        state["message"] = f"{p['name']} cae en cárcel ({num}) y pierde un turno. ⛓️"
        event = "penalizacion"

    # impulso 4 y 22 (+2)
    elif num in (4, 22):
        p["pos"] = min(p["pos"] + 2, CASILLA_FINAL)
        state["message"] = f"{p['name']} recibe impulso y avanza +2 (ahora {p['pos']+1}). ⚡"
        event = "premio"

    # 40 retrocede 7
    elif num == 40:
        p["pos"] = max(p["pos"] - 7, 0)
        state["message"] = f"{p['name']} cae en 40 y retrocede 7 (ahora {p['pos']+1}). ⬅️"
        event = "penalizacion"

    # 18 -> 36
    elif num == 18:
        p["pos"] = 35
        state["message"] = f"{p['name']} cae en 18 y salta a 36. 🚀"
        event = "premio"

    # 36 -> 18
    elif num == 36:
        p["pos"] = 17
        state["message"] = f"{p['name']} cae en 36 y rebota a 18. 🔁"
        event = "penalizacion"

    # 50 -> 25
    elif num == 50:
        p["pos"] = 24
        state["message"] = f"{p['name']} cae en 50 y vuelve a 25. ⏪"
        event = "penalizacion"

    # 34 muerte -> salida
    elif num == 34:
        p["pos"] = -1
        state["message"] = f"{p['name']} cae en muerte (34) y vuelve a SALIDA. 💀"
        event = "muerte"

    return event

def check_win(p, state):
    if p["pos"] == CASILLA_FINAL:
        state["finished"] = True
        state["winner_id"] = p["id"]
        state["winner_name"] = p["name"]
        state["message"] = f"🎉 {p['name']} ha ganado (casilla 55)."
        return True
    return False

@oca_api.post("/create")
def create_game():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "Jugador").strip()

    code = new_code()
    state = initial_state(code)
    player_id = add_player(state, name)
    GAMES[code] = state

    return jsonify({"code": code, "player_id": player_id, "state": state})

@oca_api.post("/join")
def join_game():
    data = request.get_json(force=True) or {}
    code = (data.get("code") or "").strip().upper()
    name = (data.get("name") or "Jugador").strip()

    state = GAMES.get(code)
    if not state:
        return jsonify({"error": "Partida no encontrada"}), 404

    if len(state["players"]) >= 6:
        return jsonify({"error": "Partida llena (máximo 6)"}), 400

    player_id = add_player(state, name)
    state["message"] = f"{name} se ha unido a la partida."
    return jsonify({"code": code, "player_id": player_id, "state": state})

@oca_api.get("/state/<code>")
def get_state(code):
    code = (code or "").strip().upper()
    state = GAMES.get(code)
    if not state:
        return jsonify({"error": "Partida no encontrada"}), 404
    return jsonify({"state": state})

@oca_api.post("/roll")
def roll():
    data = request.get_json(force=True) or {}
    code = (data.get("code") or "").strip().upper()
    player_id = (data.get("player_id") or "").strip()

    state = GAMES.get(code)
    if not state:
        return jsonify({"error": "Partida no encontrada"}), 404
    if state["finished"]:
        return jsonify({"error": "La partida ya terminó"}), 400

    players = state["players"]
    if not players:
        return jsonify({"error": "No hay jugadores"}), 400

    current = players[state["turn_index"]]
    if current["id"] != player_id:
        return jsonify({"error": "No es tu turno"}), 403

    # pierde turno por cárcel
    if current.get("skip"):
        current["skip"] = False
        state["message"] = f"{current['name']} pierde el turno por penalización."
        state["turn_index"] = (state["turn_index"] + 1) % len(players)
        state["updated_at"] = time.time()
        return jsonify({"event": "penalizacion", "state": state})

    pasos = random.randint(1, 6)
    state["last_roll"] = pasos

    # mover
    nueva = current["pos"] + pasos
    if nueva > CASILLA_FINAL:
        exceso = nueva - CASILLA_FINAL
        nueva = CASILLA_FINAL - exceso
        state["message"] = f"{current['name']} saca {pasos} y rebota a {nueva+1}."
    else:
        state["message"] = f"{current['name']} tira y saca {pasos}."

    current["pos"] = nueva

    # victoria directa
    if check_win(current, state):
        state["updated_at"] = time.time()
        return jsonify({"event": None, "state": state})

    # casillas especiales
    event = apply_specials(current, state)

    # victoria tras especial
    if check_win(current, state):
        state["updated_at"] = time.time()
        return jsonify({"event": event, "state": state})

    # siguiente turno
    state["turn_index"] = (state["turn_index"] + 1) % len(players)
    state["updated_at"] = time.time()

    return jsonify({"event": event, "state": state})

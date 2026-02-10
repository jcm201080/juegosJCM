# =========================
# ⚙️ Detectar entorno
# =========================
import os
import json
from dotenv import load_dotenv

# =================
# Version
# =================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_app_version():
    try:
        with open(os.path.join(BASE_DIR, "package.json"), "r", encoding="utf-8") as f:
            return json.load(f).get("version", "unknown")
    except Exception:
        return "unknown"

APP_VERSION = get_app_version()

load_dotenv()
IS_PROD = os.environ.get("FLASK_ENV") == "production"

# =========================
# 🧵 Eventlet SOLO en producción
# =========================
if IS_PROD:
    import eventlet
    eventlet.monkey_patch()

# =========================
# 📦 Imports Flask
# =========================
from flask import Flask, request, session
from flask_cors import CORS
from flask_socketio import SocketIO

from db import init_db

# =========================
# 📦 Blueprints
# =========================
from routes.main_routes import main_bp
from routes.auth_routes import auth_bp
from routes.juego_mate_routes import game_bp
from routes.puzzle_routes import puzzle_bp
from routes.english_games_routes import english_games_bp
from routes.oca_online_apy import oca_api
from routes.chess import chess_routes
from routes.admin_routes import admin_bp

# ♟️ Chess sockets
from routes.chess_socket import register_chess_sockets
from routes.chess_rooms import register_chess_rooms

# 🎱 Bingo CLASSIC
from bingo.classic.routes.bingo_routes import bingo_routes
from bingo.classic.sockets.bingo_socket import register_bingo_sockets

from bingo.routes import bingo_bp

# 🎱 Bingo ONLINE
from bingo.bingo_online.routes.bingo_online_routes import bingo_online_routes
from bingo.bingo_online.sockets.bingo_online_socket import register_bingo_online_sockets



from utils.visitas import registrar_visita

import config
from config_validator import validate_config

validate_config(config)


# =========================
# 🚀 Crear app
# =========================
app = Flask(__name__)

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-key")
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

# =========================
# 🔑 Base de datos
# =========================
init_db()

# =========================
# 🍪 Cookies
# =========================
app.config.update(
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False,  # True solo con HTTPS real
)

# =========================
# 👀 Contar visitas
# =========================
@app.before_request
def contar_visitas():
    if request.path.startswith("/static"):
        return
    if request.path.startswith("/api/track"):
        return
    if request.path in ("/favicon.ico", "/robots.txt"):
        return

    if not session.get("visitado"):
        session["visitado"] = True
        session["ruta_entrada"] = request.path
        registrar_visita()

# =========================
# 📌 Version global
# =========================
@app.context_processor
def inject_app_version():
    return dict(APP_VERSION=APP_VERSION)

# =========================
# 🔌 Socket.IO
# =========================
socketio = SocketIO(app, cors_allowed_origins="*")

# =========================
# 🔗 Registrar sockets
# =========================
register_chess_sockets(socketio)
register_chess_rooms(socketio)
register_bingo_sockets(socketio)      # classic
register_bingo_online_sockets(socketio)   # online


# =========================
# 🌍 CORS
# =========================
CORS(app, supports_credentials=True)

# =========================
# 🧠 Blueprints
# =========================
app.register_blueprint(main_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(game_bp)
app.register_blueprint(puzzle_bp)
app.register_blueprint(english_games_bp)
app.register_blueprint(oca_api)
app.register_blueprint(chess_routes)

app.register_blueprint(bingo_bp)              # bingo general (home, reglas, etc)
app.register_blueprint(bingo_routes)          # classic
app.register_blueprint(bingo_online_routes)   # online

app.register_blueprint(admin_bp)

# =========================
# ▶️ Arranque local
# =========================
if __name__ == "__main__":
    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=True,
        allow_unsafe_werkzeug=True
    )

# =========================
# ⚙️ Detectar entorno
# =========================
import os
from dotenv import load_dotenv
from bingo.routes.bingo_routes import bingo_routes





load_dotenv()
IS_PROD = os.environ.get("FLASK_ENV") == "production"


# =========================
# 🧵 Eventlet SOLO en producción
# =========================
if IS_PROD:
    import eventlet
    eventlet.monkey_patch()


# =========================
# 📦 Imports normales
# =========================
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

from db import init_db

# Blueprints
from routes.main_routes import main_bp
from routes.auth_routes import auth_bp
from routes.juego_mate_routes import game_bp
from routes.puzzle_routes import puzzle_bp
from routes.english_games_routes import english_games_bp
from routes.oca_online_apy import oca_api
from routes.chess import chess_routes

# Sockets ajedrez
from routes.chess_socket import register_chess_sockets
from routes.chess_rooms import register_chess_rooms

# Sockets bingo
from bingo.sockets.bingo_socket import register_bingo_sockets



# =========================
# 🚀 Crear app
# =========================
app = Flask(__name__)

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-key")
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

# =========================
# 🗄️ Ajuste de cookies
# =========================
app.config.update(
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False,  # ⚠️ True SOLO si usas HTTPS real
)



# =========================
# 🔌 Socket.IO
# =========================
socketio = SocketIO(
    app,
    cors_allowed_origins="*"
)


# =========================
# ♟️ Registrar sockets
# =========================
register_chess_sockets(socketio)
register_chess_rooms(socketio)
register_bingo_sockets(socketio)

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
app.register_blueprint(bingo_routes)


# =========================
# ▶️ Arranque LOCAL
# =========================
if __name__ == "__main__":
    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=True,
        allow_unsafe_werkzeug=True
    )

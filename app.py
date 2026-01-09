# app.py
from flask import Flask
from flask_cors import CORS
from db import init_db
from flask_socketio import SocketIO

# Importar blueprints
from routes.main_routes import main_bp
from routes.auth_routes import auth_bp
from routes.juego_mate_routes import game_bp
from routes.puzzle_routes import puzzle_bp
from routes.english_games_routes import english_games_bp
from routes.oca_online_apy import oca_api
from routes.chess import chess_routes
from routes.chess_socket import register_chess_sockets

from dotenv import load_dotenv
import os

load_dotenv()


app = Flask(__name__)



# ✅ CLAVE PARA SESIONES
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-key")


# ✅ Socket.IO (PRIMERO se crea)
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading",
    path="/juegos/socket.io"
)



# ✅ Registrar sockets del ajedrez (DESPUÉS)
register_chess_sockets(socketio)

# ✅ CORS
CORS(app, supports_credentials=True)

# Inicializar base de datos
# with app.app_context():
#    init_db()


# Registrar blueprints (TODOS bajo /juegos)
app.register_blueprint(main_bp, url_prefix="/juegos")
app.register_blueprint(auth_bp, url_prefix="/juegos")
app.register_blueprint(game_bp, url_prefix="/juegos")
app.register_blueprint(puzzle_bp, url_prefix="/juegos")
app.register_blueprint(english_games_bp, url_prefix="/juegos")
app.register_blueprint(oca_api, url_prefix="/juegos")
app.register_blueprint(chess_routes, url_prefix="/juegos")


if __name__ == "__main__":
    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=False,
        allow_unsafe_werkzeug=True
    )






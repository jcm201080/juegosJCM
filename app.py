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

app = Flask(__name__)

# ✅ CLAVE PARA SESIONES
app.config["SECRET_KEY"] = "jcma4812"

# ✅ Socket.IO (PRIMERO se crea)
socketio = SocketIO(app, cors_allowed_origins="*")

# ✅ Registrar sockets del ajedrez (DESPUÉS)
register_chess_sockets(socketio)

# ✅ CORS
CORS(app, supports_credentials=True)

# Inicializar base de datos
with app.app_context():
    init_db()

# Registrar blueprints
app.register_blueprint(main_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(game_bp)
app.register_blueprint(puzzle_bp)
app.register_blueprint(english_games_bp)
app.register_blueprint(oca_api)
app.register_blueprint(chess_routes)

if __name__ == "__main__":
    socketio.run(app, debug=True)

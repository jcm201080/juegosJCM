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
from routes.chess_rooms import register_chess_rooms

from dotenv import load_dotenv
import os

load_dotenv()


app = Flask(__name__)

app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0



# ✅ CLAVE PARA SESIONES
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-key")


# ✅ Socket.IO (PRIMERO se crea)
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading"
)



# ✅ Registrar sockets del ajedrez (DESPUÉS)
register_chess_sockets(socketio)
register_chess_rooms(socketio)

# ✅ CORS
CORS(app, supports_credentials=True)

# Inicializar base de datos
# with app.app_context():
#    init_db()


# Registrar blueprints (TODOS bajo /juegos)
app.register_blueprint(main_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(game_bp)
app.register_blueprint(puzzle_bp)
app.register_blueprint(english_games_bp)
app.register_blueprint(oca_api)
app.register_blueprint(chess_routes)




if __name__ == "__main__":
    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=True,
        allow_unsafe_werkzeug=True
    )






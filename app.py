# app.py
from flask import Flask
from flask_cors import CORS
from db import init_db

# Importar blueprints
from routes.main_routes import main_bp
from routes.auth_routes import auth_bp
from routes.juego_mate_routes import game_bp
from routes.puzzle_routes import puzzle_bp
from routes.english_games_routes import english_games_bp
from routes.oca_online_apy import oca_api

app = Flask(__name__)
CORS(app)

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

if __name__ == "__main__":
    app.run(debug=True)

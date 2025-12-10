# routes/english_games_routes.py

from flask import Blueprint, render_template

english_games_bp = Blueprint("english_games", __name__)

@english_games_bp.route("/english-games")
def english_games():
    return render_template("english_games.html")

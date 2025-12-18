# routes/main_routes.py
from flask import Blueprint, render_template

main_bp = Blueprint("main", __name__)

@main_bp.route("/")
def home():
    # Portada Juegos JCM
    return render_template("home.html")

@main_bp.route("/juego-mate")
def juego_mate():
    return render_template("juego_mate.html")

@main_bp.route("/tablero-oca")
def tablero_oca():
    return render_template("tablero_oca.html")

@main_bp.route("/tablero-oca-online")
def tablero_oca_online():
    return render_template("tablero_oca_online.html")

@main_bp.route("/puzzle-mate")
def puzzle_mate():
    return render_template("puzzle_mate.html")

@main_bp.route("/juegos-linea")
def juegos_linea():
    return render_template("juego_linea.html")

@main_bp.route("/historial")
def historial():
    return render_template("historial.html")

# routes/main_routes.py
from flask import Blueprint, render_template, request, jsonify

from routes.auth_routes import login_required

from utils.visitas import registrar_visita

main_bp = Blueprint("main", __name__)

@main_bp.route("/")
def home():
    force_login = request.args.get("login_required")
    return render_template("home.html", force_login=force_login)


@main_bp.route("/juego-mate")
@login_required
def juego_mate():
    return render_template("juego_mate.html")

@main_bp.route("/tablero-oca")
@login_required
def tablero_oca():
    return render_template("tablero_oca.html")

@main_bp.route("/tablero-oca-online")
@login_required
def tablero_oca_online():
    return render_template("tablero_oca_online.html")

@main_bp.route("/puzzle-mate")  
@login_required
def puzzle_mate():
    return render_template("puzzle_mate.html")

@main_bp.route("/juegos-linea")
@login_required
def juegos_linea():
    return render_template("juego_linea.html")

@main_bp.route("/historial")
@login_required
def historial():
    return render_template("historial.html")


@main_bp.route("/api/track", methods=["POST"])
def track_visita():
    data = request.get_json(silent=True) or {}

    ruta = data.get("ruta", "/")
    origen = data.get("origen", "desconocido")

    registrar_visita(
        ruta=ruta,
        origen=origen
    )

    return jsonify({"status": "ok"})

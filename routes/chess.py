from flask import Blueprint, render_template
from routes.auth_routes import login_required

chess_routes = Blueprint("chess_routes", __name__)

@chess_routes.route("/chess")
@login_required
def chess():
    # Ajedrez local
    return render_template("chess.html")


@chess_routes.route("/chess-online")
@login_required
def chess_online():
    # Ajedrez online (Socket.IO aquí luego)
    return render_template("chess_online.html")

from flask import Blueprint, render_template

chess_routes = Blueprint("chess_routes", __name__)

@chess_routes.route("/chess")
def chess():
    return render_template("chess.html")

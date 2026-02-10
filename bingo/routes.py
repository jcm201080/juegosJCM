from flask import Blueprint, render_template

bingo_bp = Blueprint(
    "bingo",
    __name__,
    url_prefix="/bingo"
)

@bingo_bp.route("/")
def bingo_home():
    return render_template("bingo/home_bingo.html")

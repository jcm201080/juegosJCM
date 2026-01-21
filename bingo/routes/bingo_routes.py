from flask import Blueprint, render_template, request, redirect, url_for
import random
import string
from flask import session, abort
from functools import wraps

def solo_jcm(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if session.get("username") != "jcm":
            abort(403)
        return f(*args, **kwargs)
    return wrapper

bingo_routes = Blueprint(
    "bingo_routes",
    __name__,
    template_folder="../templates"
)


def generar_codigo_sala(longitud=4):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=longitud))


@bingo_routes.route("/bingo", methods=["GET", "POST"])
@solo_jcm
def bingo_lobby():
    if request.method == "POST":
        codigo = generar_codigo_sala()
        return redirect(url_for("bingo_routes.bingo_sala", codigo=codigo))

    return render_template("bingo_lobby.html")


@bingo_routes.route("/bingo/<codigo>")
@solo_jcm
def bingo_sala(codigo):
    return render_template("bingo_sala.html", codigo=codigo)

from flask import Blueprint, render_template, request, redirect, url_for, session
import random
import string
from routes.auth_routes import login_required

salas = {}
codigos_validos = set()

bingo_routes = Blueprint(
    "bingo_classic",
    __name__,
    template_folder="../templates"
)

def generar_codigo_sala(longitud=4):
    return ''.join(
        random.choices(string.ascii_uppercase + string.digits, k=longitud)
    )

@bingo_routes.route("/bingo/classic", methods=["GET", "POST"])
@login_required
def bingo_lobby():
    if request.method == "POST":
        codigo = generar_codigo_sala()

        salas[codigo] = {
            "host": session["username"]
        }

        codigos_validos.add(codigo)

        return redirect(
            url_for("bingo_classic.bingo_sala", codigo=codigo)
        )

    # 👇 AQUÍ ESTABA EL FALLO
    return render_template("bingo_classic_lobby.html")


@bingo_routes.route("/bingo/classic/<codigo>")
@login_required
def bingo_sala(codigo):
    sala = salas.get(codigo)

    if not sala:
        return redirect(
            url_for("bingo_classic.bingo_lobby")
        )

    es_host = sala["host"] == session["username"]

    return render_template(
        "bingo_sala.html",
        codigo=codigo,
        es_host=es_host
    )

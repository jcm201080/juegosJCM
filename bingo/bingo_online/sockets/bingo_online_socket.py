import random

from flask import request
from flask_socketio import join_room, emit

from bingo.bingo_online.state import salas_bingo_online, online_lobby
from bingo.bingo_online.logic.cartones import generar_carton
from bingo.bingo_online.logic.bolas import BomboBingo
from bingo.bingo_online.logic.validaciones import (
    comprobar_linea,
    comprobar_bingo,
    comprobar_cruz,
    comprobar_x
)

from config import BINGO_MAX_PLAYERS

ONLINE_COUNTDOWN_SECONDS = 30
BOLA_INTERVAL_SECONDS = 5


BOT_NAMES = [
    # 🇪🇸 Españoles clásicos
    "Juan",
    "María",
    "Pepe",
    "Lucía",
    "Antonio",
    "Carmen",
    "David",
    "Laura",
    "José Luis",
    "María Victoria",
    "Elena CM",

    # 🇪🇸 Con apellido
    "Juan Pérez",
    "María López",
    "Antonio García",
    "Carmen Ruiz",
    "Luis Fernández",
    "Ana Martínez",

    # 😈 Apodos y personajes
    "La loca del bingo",
    "El notas",
    "Don Cartón",
    "La Reina del Bingo",
    "El Niño de la Suerte",
    "Doña Bolilla",
    "El Cantaor",
    "La Abuela Leti",

    # 🌍 Internacionales
    "John",
    "Michael",
    "Sarah",
    "Emily",
    "Robert",
    "Jessica",
    "James",
    "Laura Smith",

    # 🇫🇷
    "Pierre",
    "Marie Dupont",
    "Luc Moreau",

    # 🇮🇹
    "Giovanni",
    "Marco Rossi",
    "Francesca",

    # 🇩🇪
    "Hans",
    "Klara Müller",
    "Fritz",

    # 🇧🇷 / 🇵🇹
    "João",
    "Pedro Silva",
    "Ana Paula",

    # 🇯🇵
    "Hiro",
    "Takashi",
    "Yuki",

    # 🇷🇺
    "Ivan",
    "Nikolai",
    "Anastasia",

    # 🤖 Guiños frikis
    "Bot-9000",
    "Skynet Jr",
    "HAL Bingo",
    "ChatBingo"
]


# Puntos por cantar:
def sumar_puntos(jugador, puntos):
    jugador["puntos"] += puntos



#Ranqking
def emitir_ranking(socketio, codigo, sala):
    ranking = sorted(
        sala["jugadores"].values(),
        key=lambda j: j["puntos"],
        reverse=True
    )

    socketio.emit(
        "ranking_update",
        {
            "ranking": [
                {"nombre": j["nombre"], "puntos": j["puntos"]}
                for j in ranking
            ]
        },
        room=codigo
    )


# =====================================================
# UTILIDADES
# =====================================================

def emitir_estado_a_todos(socketio, codigo, sala):
    socketio.emit(
        "lista_jugadores",
        {
            "jugadores": [j["nombre"] for j in sala["jugadores"].values()],
            "en_partida": sala["en_partida"],
        },
        room=codigo,
    )



# =====================================================
# 🤖 BOTS
# =====================================================

def fill_with_bots():
    faltan = online_lobby["max_players"] - len(online_lobby["players"])
    nombres = random.sample(BOT_NAMES, faltan)

    for nombre in nombres:
        online_lobby["players"].append({
            "sid": None,
            "nombre": nombre,
            "bot": True
        })



# =====================================================
# ⏳ COUNTDOWN ONLINE
# =====================================================

def start_online_countdown(socketio):

    def run():
        while online_lobby["countdown"] > 0:
            socketio.sleep(1)
            online_lobby["countdown"] -= 1

            socketio.emit("online_lobby_update", {
                "players": [p["nombre"] for p in online_lobby["players"]],
                "countdown": online_lobby["countdown"],
                "max_players": online_lobby["max_players"]
            })


        print("👥 PLAYERS EN LOBBY ANTES DE BOTS:", online_lobby["players"])

        fill_with_bots()

        socketio.emit("online_lobby_update", {
            "players": [p["nombre"] for p in online_lobby["players"]],
            "countdown": 0
        })


        codigo = "".join(__import__("random").choices("ABCDEFGH123456789", k=4))

        salas_bingo_online[codigo] = {
            "jugadores": {},
            "cartones": {},
            "en_partida": True,
            "bombo": BomboBingo(),
            "online": True,
        }


        for p in online_lobby["players"]:
            salas_bingo_online[codigo]["jugadores"][p["nombre"]] = {
                "nombre": p["nombre"],
                "vidas": 3,
                "puntos": 0,
                "cartones": p.get("cartones", 1),  # 👈 AQUI
                "sid": p["sid"],
                "bot": p.get("bot", False),
                "cantado": {
                    "linea": False,
                    "cruz": False,
                    "x": False
                }
            }




        # 🎟️ CARTONES PARA BOTS
        for nombre, jugador in salas_bingo_online[codigo]["jugadores"].items():
            if jugador.get("bot"):
                salas_bingo_online[codigo]["cartones"][nombre] = [generar_carton()]

        # 👇 DESPUÉS ya rediriges humanos
        for p in online_lobby["players"]:
            if p["sid"]:
                socketio.emit(
                    "redirect_to_game",
                    {"url": f"/bingo/online/{codigo}"},
                    room=p["sid"]
                )

        online_lobby.update({
            "players": [],
            "active": False,
            "timer_running": False,
            "countdown": ONLINE_COUNTDOWN_SECONDS
        })

    socketio.start_background_task(run)



# =====================================================
# AUTOPLAY
# =====================================================
def start_online_autoplay(socketio, codigo):
    def run():
        print("🎱 AUTOPLAY ACTIVO EN SALA", codigo)

        sala = salas_bingo_online.get(codigo)
        if not sala:
            print("❌ Sala no encontrada en autoplay")
            return

        while sala["en_partida"]:
            socketio.sleep(BOLA_INTERVAL_SECONDS)

            bola = sala["bombo"].sacar_bola()
            print("🎱 Bola:", bola)

            if bola is None:
                sala["en_partida"] = False
                print("🏁 Fin de partida")
                return

            # 🔔 Emitir bola a todos
            socketio.emit(
                "bola_cantada",
                {
                    "bola": bola,
                    "historial": sala["bombo"].historial
                },
                room=codigo
            )

            bolas = sala["bombo"].historial

            # 🤖 LÓGICA DE BOTS
            for nombre, jugador in sala["jugadores"].items():
                if not jugador.get("bot"):
                    continue

                cartones = sala["cartones"].get(nombre)
                if not cartones:
                    continue

                carton = cartones[0]

                # ⏱️ pequeño retraso humano
                socketio.sleep(random.uniform(0.4, 1.2))

                # LINEA
                if (
                    not jugador["cantado"]["linea"]
                    and comprobar_linea(carton, bolas)
                ):
                    jugador["cantado"]["linea"] = True
                    socketio.emit(
                        "resultado_cantar",
                        {
                            "tipo": "linea",
                            "valida": True,
                            "jugador": nombre
                        },
                        room=codigo
                    )
                    continue

                # CRUZ
                if (
                    not jugador["cantado"]["cruz"]
                    and comprobar_cruz(carton, bolas)
                ):
                    jugador["cantado"]["cruz"] = True
                    socketio.emit(
                        "resultado_cantar",
                        {
                            "tipo": "cruz",
                            "valida": True,
                            "jugador": nombre
                        },
                        room=codigo
                    )
                    continue

                # X
                if (
                    not jugador["cantado"]["x"]
                    and comprobar_x(carton, bolas)
                ):
                    jugador["cantado"]["x"] = True
                    socketio.emit(
                        "resultado_cantar",
                        {
                            "tipo": "x",
                            "valida": True,
                            "jugador": nombre
                        },
                        room=codigo
                    )
                    continue

                # BINGO (cierra partida)
                if comprobar_bingo(carton, bolas):
                    sala["en_partida"] = False
                    socketio.emit(
                        "resultado_cantar",
                        {
                            "tipo": "bingo",
                            "valida": True,
                            "jugador": nombre
                        },
                        room=codigo
                    )
                    return

    socketio.start_background_task(run)


#penalizar jugador
def penalizar_jugador(jugador, puntos):
    jugador["vidas"] -= puntos
    if jugador["vidas"] < 0:
        jugador["vidas"] = 0


# =====================================================
# SOCKETS
# =====================================================

def register_bingo_online_sockets(socketio):

    # -------------------------
    # LOBBY ONLINE
    # -------------------------
    @socketio.on("join_online_lobby")
    def join_online_lobby(data):
        sid = request.sid
        nombre = data.get("nombre", "Invitado")
        max_players = int(data.get("max_players", 6))
        cartones = int(data.get("cartones", 1))  # 👈 AQUI


        if not online_lobby["active"]:
            online_lobby.update({
                "players": [],
                "max_players": max_players,
                "countdown": ONLINE_COUNTDOWN_SECONDS,
                "active": True,
                "timer_running": False
            })

        if not any(p["sid"] == sid for p in online_lobby["players"]):
            online_lobby["players"].append({
                "sid": sid,
                "nombre": nombre,
                "cartones": cartones,   # 👈 GUARDADO
                "bot": False
            })


        if not online_lobby["timer_running"]:
            online_lobby["timer_running"] = True
            start_online_countdown(socketio)

        emit("online_lobby_update", {
            "players": [p["nombre"] for p in online_lobby["players"]],
            "countdown": online_lobby["countdown"],
            "max_players": online_lobby["max_players"]
        })



    # -------------------------
    # ENTRAR EN SALA ONLINE
    # -------------------------
    @socketio.on("join_online_game")
    def join_online_game(data):
        codigo = data.get("codigo")
        nombre = data.get("nombre")
        sid = request.sid

        print("👉 join_online_game:", codigo, nombre, sid)

        sala = salas_bingo_online.get(codigo)
        if not sala:
            print("❌ Sala no existe")
            return

        jugador = sala["jugadores"].get(nombre)
        if not jugador:
            print("❌ Jugador no existe en sala:", nombre)
            return

        # 🔗 Asociar SID real
        jugador["sid"] = sid

        join_room(codigo)

        emitir_estado_a_todos(socketio, codigo, sala)


        # 🎟️ Generar cartón SOLO aquí
        if sid not in sala["cartones"]:
            num_cartones = jugador.get("cartones", 1)

            cartones = [generar_carton() for _ in range(num_cartones)]
            sala["cartones"][sid] = cartones

        else:
            cartones = sala["cartones"][sid]

        print("🎟️ Enviando cartón a", nombre)

        emit("send_carton", {"cartones": cartones}, room=sid)

        # 🔥 Arrancar autoplay UNA vez
        if not sala.get("autoplay"):
            sala["autoplay"] = True
            print("🎱 Arrancando autoplay")
            start_online_autoplay(socketio, codigo)

        emit("game_started", {}, room=sid)

    # -------------------------
    # CANTAR LINEA
    # -------------------------

    @socketio.on("cantar_linea")
    def cantar_linea(data):
        codigo = data.get("codigo")
        sid = request.sid

        sala = salas_bingo_online.get(codigo)
        if not sala:
            return

        cartones = sala["cartones"].get(sid)
        if not cartones:
            return

        carton = cartones[0]

        jugador = next(
            (j for j in sala["jugadores"].values() if j["sid"] == sid),
            None
        )
        if not jugador:
            return

        es_valida = comprobar_linea(carton, sala["bombo"].historial)

        if es_valida:
            jugador["cantado"]["linea"] = True
            sumar_puntos(jugador, 1)
            emitir_ranking(socketio, codigo, sala)

            emit(
                "resultado_cantar",
                {
                    "tipo": "linea",
                    "valida": True,
                    "jugador": jugador["nombre"],
                    "puntos": jugador["puntos"]
                },
                room=codigo   # 👈 TODOS LO VEN
            )
        else:
            penalizar_jugador(jugador, 1)

            emit(
                "resultado_cantar",
                {
                    "tipo": "linea",
                    "valida": False,
                    "vidas": jugador["vidas"],
                    "jugador": jugador["nombre"]
                },
                room=sid
            )




    # -------------------------
    # CANTAR CRUZ
    # -------------------------
    @socketio.on("cantar_cruz")
    def cantar_cruz(data):
        codigo = data.get("codigo")
        sid = request.sid

        sala = salas_bingo_online.get(codigo)
        if not sala:
            return

        cartones = sala["cartones"].get(sid)
        if not cartones:
            return

        carton = cartones[0]

        jugador = next(
            (j for j in sala["jugadores"].values() if j["sid"] == sid),
            None
        )
        if not jugador:
            return

        es_valida = comprobar_cruz(carton, sala["bombo"].historial)

        if es_valida:
            jugador["cantado"]["cruz"] = True
            sumar_puntos(jugador, 2)
            emitir_ranking(socketio, codigo, sala)

            emit(
                "resultado_cantar",
                {
                    "tipo": "cruz",
                    "valida": True,
                    "jugador": jugador["nombre"],
                    "puntos": jugador["puntos"]
                },
                room=codigo
            )
        else:
            penalizar_jugador(jugador, 1)

            emit(
                "resultado_cantar",
                {
                    "tipo": "cruz",
                    "valida": False,
                    "vidas": jugador["vidas"],
                    "jugador": jugador["nombre"]
                },
                room=sid
            )



    # -------------------------
    # CANTAR X
    # -------------------------
    @socketio.on("cantar_x")
    def cantar_x(data):
        codigo = data.get("codigo")
        sid = request.sid

        sala = salas_bingo_online.get(codigo)
        if not sala:
            return

        cartones = sala["cartones"].get(sid)
        if not cartones:
            return

        carton = cartones[0]

        jugador = next(
            (j for j in sala["jugadores"].values() if j["sid"] == sid),
            None
        )
        if not jugador:
            return

        es_valida = comprobar_x(carton, sala["bombo"].historial)

        if es_valida:
            jugador["cantado"]["x"] = True
            sumar_puntos(jugador, 2)
            emitir_ranking(socketio, codigo, sala)

            emit(
                "resultado_cantar",
                {
                    "tipo": "x",
                    "valida": True,
                    "jugador": jugador["nombre"],
                    "puntos": jugador["puntos"]
                },
                room=codigo
            )
        else:
            penalizar_jugador(jugador, 1)

            emit(
                "resultado_cantar",
                {
                    "tipo": "x",
                    "valida": False,
                    "vidas": jugador["vidas"],
                    "jugador": jugador["nombre"]
                },
                room=sid
            )



    # -------------------------
    # CANTAR BINGO
    # -------------------------
    @socketio.on("cantar_bingo")
    def cantar_bingo(data):
        codigo = data.get("codigo")
        sid = request.sid

        sala = salas_bingo_online.get(codigo)
        if not sala:
            return

        cartones = sala["cartones"].get(sid)
        if not cartones:
            return

        carton = cartones[0]

        jugador = next(
            (j for j in sala["jugadores"].values() if j["sid"] == sid),
            None
        )
        if not jugador:
            return

        es_valida = comprobar_bingo(carton, sala["bombo"].historial)

        if es_valida:
            sala["en_partida"] = False
            sumar_puntos(jugador, 5)
            emitir_ranking(socketio, codigo, sala)

            emit(
                "resultado_cantar",
                {
                    "tipo": "bingo",
                    "valida": True,
                    "jugador": jugador["nombre"],
                    "puntos": jugador["puntos"]
                },
                room=codigo
            )
        else:
            penalizar_jugador(jugador, 2)

            emit(
                "resultado_cantar",
                {
                    "tipo": "bingo",
                    "valida": False,
                    "vidas": jugador["vidas"],
                    "jugador": jugador["nombre"]
                },
                room=sid
            )


    # -------------------------
    # SALIR DE LA SALA
    # -------------------------
    @socketio.on("salir_sala")
    def salir_sala(data):
        codigo = data.get("codigo")
        sid = request.sid

        sala = salas_bingo_online.get(codigo)
        if not sala:
            return

        sala["cartones"].pop(sid, None)

        for jugador in sala["jugadores"].values():
            if jugador.get("sid") == sid:
                jugador["sid"] = None

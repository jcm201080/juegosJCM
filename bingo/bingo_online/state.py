# bingo/bingo_online/state.py

# Salas de bingo ONLINE
# clave: codigo_sala
# valor: dict con estado completo de la partida
salas_bingo_online = {}

# Lobby de matchmaking
online_lobby = {
    "players": [],        # [{sid, nombre}]
    "max_players": 0,
    "countdown": 10,
    "active": False,
    "timer_running": False
}

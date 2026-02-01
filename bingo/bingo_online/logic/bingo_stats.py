# bingo/logic/bingo_stats.py

from db import get_connection

# Asegurar stats del usuario (MUY importante)
def ensure_bingo_stats(user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT OR IGNORE INTO bingo_stats (user_id)
        VALUES (?)
        """,
        (user_id,)
    )

    conn.commit()
    conn.close()

# Registra nueva Partida
def crear_partida_bingo(jugadores):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO bingo_partidas (jugadores)
        VALUES (?)
        """,
        (jugadores,)
    )

    partida_id = cur.lastrowid
    conn.commit()
    conn.close()

    return partida_id


#Registrar linea básica
def registrar_linea(user_id, partida_id):
    conn = get_connection()
    cur = conn.cursor()

    # Aseguramos stats
    cur.execute(
        "INSERT OR IGNORE INTO bingo_stats (user_id) VALUES (?)",
        (user_id,)
    )

    cur.execute(
        """
        UPDATE bingo_stats
        SET lineas = lineas + 1
        WHERE user_id = ?
        """,
        (user_id,)
    )

    cur.execute(
        """
        INSERT INTO bingo_eventos (partida_id, user_id, tipo)
        VALUES (?, ?, 'linea')
        """,
        (partida_id, user_id)
    )

    conn.commit()
    conn.close()


# Registrar bingo ganador
def registrar_bingo(user_id, partida_id, duracion_sec):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "INSERT OR IGNORE INTO bingo_stats (user_id) VALUES (?)",
        (user_id,)
    )

    cur.execute(
        """
        UPDATE bingo_stats
        SET 
            bingos = bingos + 1,
            partidas_jugadas = partidas_jugadas + 1
        WHERE user_id = ?
        """,
        (user_id,)
    )

    cur.execute(
        """
        UPDATE bingo_partidas
        SET ganador_id = ?, duracion_sec = ?
        WHERE id = ?
        """,
        (user_id, duracion_sec, partida_id)
    )

    cur.execute(
        """
        INSERT INTO bingo_eventos (partida_id, user_id, tipo)
        VALUES (?, ?, 'bingo')
        """,
        (partida_id, user_id)
    )

    conn.commit()
    conn.close()


#Registrar bingo fallido
def registrar_bingo_fallido(user_id, partida_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "INSERT OR IGNORE INTO bingo_stats (user_id) VALUES (?)",
        (user_id,)
    )

    cur.execute(
        """
        UPDATE bingo_stats
        SET bingos_fallidos = bingos_fallidos + 1
        WHERE user_id = ?
        """,
        (user_id,)
    )

    cur.execute(
        """
        INSERT INTO bingo_eventos (partida_id, user_id, tipo)
        VALUES (?, ?, 'bingo_fallido')
        """,
        (partida_id, user_id)
    )

    conn.commit()
    conn.close()


# Contar todas las pártidas
def registrar_partida_jugada(user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        "INSERT OR IGNORE INTO bingo_stats (user_id) VALUES (?)",
        (user_id,)
    )

    cur.execute(
        """
        UPDATE bingo_stats
        SET partidas_jugadas = partidas_jugadas + 1
        WHERE user_id = ?
        """,
        (user_id,)
    )

    conn.commit()
    conn.close()


#REGISTRAR CRUZ

def registrar_cruz(user_id, partida_id):
    conn = get_connection()
    cur = conn.cursor()

    # Asegurar fila de stats
    cur.execute(
        "INSERT OR IGNORE INTO bingo_stats (user_id) VALUES (?)",
        (user_id,)
    )

    # Sumar cruz
    cur.execute(
        """
        UPDATE bingo_stats
        SET cruces = cruces + 1
        WHERE user_id = ?
        """,
        (user_id,)
    )

    # Guardar evento
    cur.execute(
        """
        INSERT INTO bingo_eventos (partida_id, user_id, tipo)
        VALUES (?, ?, 'cruz')
        """,
        (partida_id, user_id)
    )

    conn.commit()
    conn.close()

from flask import request
from db import get_connection

def registrar_visita(ruta=None, origen="juegos"):
    ip = request.remote_addr
    user_agent = request.headers.get("User-Agent")

    # Si no nos pasan ruta, usamos la actual de Flask
    ruta_final = ruta if ruta else request.path

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO visitas (ip, user_agent, ruta, origen)
        VALUES (?, ?, ?, ?)
        """,
        (ip, user_agent, ruta_final, origen)
    )

    conn.commit()
    conn.close()

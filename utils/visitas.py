from flask import request
from db import get_connection

def registrar_visita():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO visitas (ip, user_agent, ruta)
        VALUES (?, ?, ?)
        """,
        (
            request.remote_addr,
            request.headers.get("User-Agent"),
            request.path,
        )
    )

    conn.commit()
    conn.close()

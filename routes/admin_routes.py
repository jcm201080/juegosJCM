from flask import Blueprint, render_template
from db import get_connection, contar_usuarios
from routes.auth_routes import admin_required

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

@admin_bp.route("/dashboard")
@admin_required
def dashboard():
    conn = get_connection()
    cur = conn.cursor()

    # 👀 VISITAS
    cur.execute("SELECT COUNT(*) FROM visitas")
    total_visitas = cur.fetchone()[0]

    cur.execute("""
        SELECT ruta, COUNT(*) as total
        FROM visitas
        GROUP BY ruta
        ORDER BY total DESC
    """)
    visitas_por_ruta = cur.fetchall()

    cur.execute("""
        SELECT ruta, fecha, origen
        FROM visitas
        ORDER BY fecha DESC
        LIMIT 20
    """)
    ultimas_visitas = cur.fetchall()

    cur.execute("""
        SELECT DATE(fecha) as dia, COUNT(*) as total
        FROM visitas
        GROUP BY dia
        ORDER BY dia
    """)
    visitas_por_dia = cur.fetchall()

    # 🎱 BINGO STATS
    cur.execute("SELECT COUNT(*) FROM bingo_partidas")
    bingo_partidas = cur.fetchone()[0]

    cur.execute("SELECT COALESCE(SUM(bingos), 0) FROM bingo_stats")
    total_bingos = cur.fetchone()[0]

    cur.execute("SELECT COALESCE(SUM(lineas), 0) FROM bingo_stats")
    total_lineas = cur.fetchone()[0]

    cur.execute("SELECT COALESCE(SUM(bingos_fallidos), 0) FROM bingo_stats")
    bingos_fallidos = cur.fetchone()[0]

    # 👥 USUARIOS
    total_usuarios = contar_usuarios()

    # 🏆 TOP JUGADORES DE BINGO
    cur.execute("""
        SELECT u.username,
            bs.bingos,
            bs.lineas,
            bs.bingos_fallidos
        FROM bingo_stats bs
        JOIN users u ON u.id = bs.user_id
        ORDER BY bs.bingos DESC, bs.lineas DESC
        LIMIT 10
    """)
    top_jugadores = cur.fetchall()


    conn.close()

    return render_template(
        "admin/dashboard.html",
        total_visitas=total_visitas,
        total_usuarios=total_usuarios,
        bingo_partidas=bingo_partidas,
        total_bingos=total_bingos,
        total_lineas=total_lineas,
        bingos_fallidos=bingos_fallidos,
        visitas_por_ruta=visitas_por_ruta,
        ultimas_visitas=ultimas_visitas,
        visitas_por_dia=visitas_por_dia,
        top_jugadores=top_jugadores  
    )

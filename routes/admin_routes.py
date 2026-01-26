from flask import Blueprint, render_template
from db import get_connection

from routes.auth_routes import admin_required


admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

@admin_bp.route("/dashboard")
@admin_required
def dashboard():
    conn = get_connection()
    cur = conn.cursor()

    # Total visitas
    cur.execute("SELECT COUNT(*) FROM visitas")
    total_visitas = cur.fetchone()[0]

    # Visitas por ruta
    cur.execute("""
        SELECT ruta, COUNT(*) as total
        FROM visitas
        GROUP BY ruta
        ORDER BY total DESC
    """)
    visitas_por_ruta = cur.fetchall()

    # últimas visitas
    cur.execute("""
        SELECT ruta, fecha, origen
        FROM visitas
        ORDER BY fecha DESC
        LIMIT 20
    """)
    ultimas_visitas = cur.fetchall()

    #Visitas por día (para gráfico)
    cur.execute("""
        SELECT DATE(fecha) as dia, COUNT(*) as total
        FROM visitas
        GROUP BY dia
        ORDER BY dia
    """)
    visitas_por_dia = cur.fetchall()



    conn.close()

    return render_template(
        "admin/dashboard.html",
        total_visitas=total_visitas,
        visitas_por_ruta=visitas_por_ruta,
        ultimas_visitas=ultimas_visitas,
        visitas_por_dia=visitas_por_dia
    )

from flask import Blueprint, render_template
from db import get_connection

from routes.auth_routes import admin_required


admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

@admin_bp.route("/dashboard")
@admin_required
def dashboard():
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM visitas")
    total_visitas = cur.fetchone()[0]

    cur.execute("""
        SELECT ruta, COUNT(*) as total
        FROM visitas
        GROUP BY ruta
        ORDER BY total DESC
    """)
    visitas_por_ruta = cur.fetchall()

    conn.close()

    return render_template(
        "admin/dashboard.html",
        total_visitas=total_visitas,
        visitas_por_ruta=visitas_por_ruta
    )

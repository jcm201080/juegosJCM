import os
import sqlite3

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_NAME = os.path.join(BASE_DIR, "users.db")

def get_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn



def init_db():
    conn = get_connection()
    cur = conn.cursor()

    # Tabla de usuarios
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            best_score INTEGER DEFAULT 0,
            total_score INTEGER DEFAULT 0,          -- 🔹 NUEVO: acumulado
            level_unlocked INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # Tabla de puntuaciones por partida/nivel
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            level INTEGER NOT NULL,
            score INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )

    # 🔹 NUEVA TABLA: partidas del Puzzle Matemático
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS puzzle_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            difficulty TEXT NOT NULL,      -- easy / medium / pro / infernal
            solved INTEGER NOT NULL,       -- operaciones correctas
            total_eq INTEGER NOT NULL,     -- total de operaciones del puzzle
            mistakes INTEGER NOT NULL,     -- fallos cometidos
            lives_left INTEGER NOT NULL,   -- vidas restantes al final
            duration_sec INTEGER NOT NULL, -- duración de la partida en segundos
            score INTEGER NOT NULL,        -- puntuación calculada
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )

        # 🔹 NUEVA TABLA: puntuaciones del juego de colores en inglés
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS english_color_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            level INTEGER NOT NULL,
            score INTEGER NOT NULL,
            duration_sec INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )

   
    # 🔹 NUEVA TABLA: visitas a la web
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS visitas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT DEFAULT CURRENT_TIMESTAMP,
            ip TEXT,
            user_agent TEXT,
            ruta TEXT
        )
        """
    )

    # =====================================================
    # 🔹 TABLAS PARA EL BINGO
    # =====================================================

    # Estadísticas acumuladas por usuario
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS bingo_stats (
            user_id INTEGER PRIMARY KEY,
            partidas_jugadas INTEGER DEFAULT 0,
            lineas INTEGER DEFAULT 0,
            cruces INTEGER DEFAULT 0,
            bingos INTEGER DEFAULT 0,
            bingos_fallidos INTEGER DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )

    # Historial de partidas de bingo
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS bingo_partidas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ganador_id INTEGER,
            duracion_sec INTEGER,
            jugadores INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(ganador_id) REFERENCES users(id)
        )
        """
    )

    # Eventos dentro de una partida (línea, cruce, bingo…)
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS bingo_eventos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            partida_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            tipo TEXT NOT NULL, -- linea | cruce | bingo | bingo_fallido
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(partida_id) REFERENCES bingo_partidas(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
    )



    conn.commit()
    conn.close()


    
def ensure_bingo_stats(user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT OR IGNORE INTO bingo_stats (user_id)
        VALUES (?)
    """, (user_id,))

    conn.commit()
    conn.close()


def sumar_partida(user_id):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO bingo_stats (user_id, partidas_jugadas)
        VALUES (?, 1)
        ON CONFLICT(user_id) DO UPDATE SET
            partidas_jugadas = partidas_jugadas + 1
    """, (user_id,))

    conn.commit()
    conn.close()

def sumar_evento(user_id, tipo):
    campo = {
        "linea": "lineas",
        "cruce": "cruces",
        "bingo": "bingos",
        "bingo_fallido": "bingos_fallidos"
    }.get(tipo)

    if not campo:
        return

    conn = get_connection()
    cur = conn.cursor()

    cur.execute(f"""
        INSERT INTO bingo_stats (user_id, {campo})
        VALUES (?, 1)
        ON CONFLICT(user_id) DO UPDATE SET
            {campo} = {campo} + 1
    """, (user_id,))

    conn.commit()
    conn.close()


def crear_partida_bingo(ganador_id, duracion, jugadores):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO bingo_partidas (ganador_id, duracion_sec, jugadores)
        VALUES (?, ?, ?)
    """, (ganador_id, duracion, jugadores))

    partida_id = cur.lastrowid
    conn.commit()
    conn.close()

    return partida_id


def registrar_evento(partida_id, user_id, tipo):
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO bingo_eventos (partida_id, user_id, tipo)
        VALUES (?, ?, ?)
    """, (partida_id, user_id, tipo))

    conn.commit()
    conn.close()


#Contar usuarios:
def contar_usuarios():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM users")
    total = cur.fetchone()[0]
    conn.close()
    return total

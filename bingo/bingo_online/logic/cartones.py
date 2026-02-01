import random


def generar_carton():
    """
    Genera un cartón de bingo 5x5 con reglas estándar.
    Devuelve una matriz 5x5.
    """

    columnas = {
        0: range(1, 16),    # B
        1: range(16, 31),   # I
        2: range(31, 46),   # N
        3: range(46, 61),   # G
        4: range(61, 76)    # O
    }

    carton = [[None for _ in range(5)] for _ in range(5)]

    for col in range(5):
        numeros = random.sample(columnas[col], 5)
        for fila in range(5):
            carton[fila][col] = numeros[fila]

    # Casilla central libre
    carton[2][2] = "FREE"

    return carton

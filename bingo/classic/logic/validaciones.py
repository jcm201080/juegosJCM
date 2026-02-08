def comprobar_linea(carton, bolas):
    for i, fila in enumerate(carton):
        completa = True

        for j, numero in enumerate(fila):
            if i == 2 and j == 2:
                continue
            if numero not in bolas:
                completa = False
                break

        if completa:
            return True

    return False



def comprobar_bingo(carton, bolas):
    for i, fila in enumerate(carton):
        for j, numero in enumerate(fila):

            # ⭐ Casilla central (FREE)
            if i == 2 and j == 2:
                continue

            if numero not in bolas:
                return False

    return True


def comprobar_cruz(carton, bolas):
    bolas_set = set(bolas)
    size = len(carton)
    centro = size // 2

    # ➕ Fila central
    for j in range(size):
        if j == centro:
            continue  # FREE
        if carton[centro][j] not in bolas_set:
            return False

    # ➕ Columna central
    for i in range(size):
        if i == centro:
            continue  # FREE
        if carton[i][centro] not in bolas_set:
            return False

    return True



def comprobar_x(carton, bolas):
    bolas_set = set(bolas)
    size = len(carton)
    centro = size // 2

    for i in range(size):
        # Diagonal principal
        if i != centro and carton[i][i] not in bolas_set:
            return False

        # Diagonal secundaria
        if i != centro and carton[i][size - 1 - i] not in bolas_set:
            return False

    return True

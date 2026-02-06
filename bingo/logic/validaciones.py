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


def comprobar_x(carton, bolas):
    bolas_set = set(bolas)
    size = len(carton)
    centro = size // 2

    diag1 = all(
        (i == centro) or carton[i][i] in bolas_set
        for i in range(size)
    )

    diag2 = all(
        (i == centro) or carton[i][size - 1 - i] in bolas_set
        for i in range(size)
    )

    return diag1 and diag2


def comprobar_cruz(carton, bolas):
    bolas_set = set(bolas)
    size = len(carton)
    centro = size // 2

    # Fila central
    fila_central = all(
        (j == centro) or carton[centro][j] in bolas_set
        for j in range(size)
    )

    # Columna central
    columna_central = all(
        (i == centro) or carton[i][centro] in bolas_set
        for i in range(size)
    )

    return fila_central and columna_central

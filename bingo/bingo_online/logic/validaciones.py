def comprobar_linea(carton, bolas):
    bolas_set = set(bolas)

    for i, fila in enumerate(carton):
        completa = True

        for j, numero in enumerate(fila):
            # Casilla central FREE
            if i == 2 and j == 2:
                continue

            # Ignorar FREE por seguridad
            if numero == "FREE":
                continue

            if numero not in bolas_set:
                completa = False
                break

        if completa:
            return True

    return False


def comprobar_cruz(carton, bolas):
    bolas_set = set(bolas)
    size = len(carton)
    centro = size // 2

    # Diagonal principal \
    diag1 = all(
        i == centro or carton[i][i] in bolas_set
        for i in range(size)
        if carton[i][i] != "FREE"
    )

    # Diagonal secundaria /
    diag2 = all(
        i == centro or carton[i][size - 1 - i] in bolas_set
        for i in range(size)
        if carton[i][size - 1 - i] != "FREE"
    )

    return diag1 and diag2



def comprobar_x(carton, bolas):
    bolas_set = set(bolas)
    size = len(carton)

    for i in range(size):
        # Diagonal \
        if carton[i][i] != "FREE" and carton[i][i] not in bolas_set:
            return False

        # Diagonal /
        if carton[i][size - 1 - i] != "FREE" and carton[i][size - 1 - i] not in bolas_set:
            return False

    return True


def comprobar_bingo(carton, bolas):
    bolas_set = set(bolas)

    for i, fila in enumerate(carton):
        for j, numero in enumerate(fila):
            if i == 2 and j == 2:
                continue
            if numero == "FREE":
                continue
            if numero not in bolas_set:
                return False

    return True




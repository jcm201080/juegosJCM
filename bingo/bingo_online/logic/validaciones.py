def casilla_valida(numero, i=None, j=None):
    # Casilla central
    if i == 2 and j == 2:
        return True

    # FREE explícito
    if numero == "FREE":
        return True

    return False


def comprobar_linea(carton, bolas):
    bolas_set = set(bolas)

    for i, fila in enumerate(carton):
        completa = True
        for j, numero in enumerate(fila):
            if casilla_valida(numero, i, j):
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

    # Fila central
    for j in range(size):
        numero = carton[centro][j]
        if not casilla_valida(numero, centro, j) and numero not in bolas_set:
            return False

    # Columna central
    for i in range(size):
        numero = carton[i][centro]
        if not casilla_valida(numero, i, centro) and numero not in bolas_set:
            return False

    return True




def comprobar_x(carton, bolas):
    bolas_set = set(bolas)
    size = len(carton)

    for i in range(size):
        # Diagonal \
        n1 = carton[i][i]
        if not casilla_valida(n1, i, i) and n1 not in bolas_set:
            return False

        # Diagonal /
        n2 = carton[i][size - 1 - i]
        if not casilla_valida(n2, i, size - 1 - i) and n2 not in bolas_set:
            return False

    return True



def comprobar_bingo(carton, bolas):
    bolas_set = set(bolas)

    for i, fila in enumerate(carton):
        for j, numero in enumerate(fila):
            if casilla_valida(numero, i, j):
                continue
            if numero not in bolas_set:
                return False

    return True





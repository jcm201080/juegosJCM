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

export function isValidRookMove(board, from, to, piece) {
    // Debe moverse en fila o columna
    if (from.r !== to.r && from.c !== to.c) {
        return { valid: false };
    }

    const stepR = to.r === from.r ? 0 : (to.r > from.r ? 1 : -1);
    const stepC = to.c === from.c ? 0 : (to.c > from.c ? 1 : -1);

    let r = from.r + stepR;
    let c = from.c + stepC;

    // Comprobar que el camino está libre
    while (r !== to.r || c !== to.c) {
        if (board[r][c] !== "") {
            return { valid: false };
        }
        r += stepR;
        c += stepC;
    }

    // Casilla destino:
    // válida si está vacía o hay pieza rival
    return { valid: true };
}

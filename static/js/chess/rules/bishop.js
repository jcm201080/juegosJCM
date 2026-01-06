export function isValidBishopMove(board, from, to, piece) {
    const dr = to.r - from.r;
    const dc = to.c - from.c;

    // Debe moverse en diagonal
    if (Math.abs(dr) !== Math.abs(dc)) {
        return { valid: false };
    }

    const stepR = dr > 0 ? 1 : -1;
    const stepC = dc > 0 ? 1 : -1;

    let r = from.r + stepR;
    let c = from.c + stepC;

    // Comprobar camino libre
    while (r !== to.r && c !== to.c) {
        if (board[r][c] !== "") {
            return { valid: false };
        }
        r += stepR;
        c += stepC;
    }

    return { valid: true };
}

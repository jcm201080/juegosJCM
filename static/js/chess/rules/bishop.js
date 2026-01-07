export function isValidBishopMove(board, from, to, piece) {
    const dr = to.r - from.r;
    const dc = to.c - from.c;

    if (Math.abs(dr) !== Math.abs(dc)) return { valid: false };

    const stepR = Math.sign(dr);
    const stepC = Math.sign(dc);

    let r = from.r + stepR;
    let c = from.c + stepC;

    while (r !== to.r || c !== to.c) {
        // 🔒 PROTECCIÓN CLAVE
        if (r < 0 || r > 7 || c < 0 || c > 7) return { valid: false };

        if (board[r][c] !== "") return { valid: false };

        r += stepR;
        c += stepC;
    }

    return { valid: true };
}

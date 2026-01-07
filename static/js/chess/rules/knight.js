export function isValidKnightMove(from, to) {
    const dr = Math.abs(to.r - from.r);
    const dc = Math.abs(to.c - from.c);

    // Movimiento en L: (2,1) o (1,2)
    if ((dr === 2 && dc === 1) || (dr === 1 && dc === 2)) {
        return { valid: true };
    }

    return { valid: false };
}

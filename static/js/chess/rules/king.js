export function isValidKingMove(from, to) {
    const dr = Math.abs(to.r - from.r);
    const dc = Math.abs(to.c - from.c);

    // El rey se mueve 1 casilla en cualquier dirección
    if (dr <= 1 && dc <= 1) {
        return { valid: true };
    }

    return { valid: false };
}

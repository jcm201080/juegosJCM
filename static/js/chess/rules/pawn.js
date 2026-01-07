export function isValidPawnMove(board, from, to, piece, lastMove) {
    const direction = piece === "♙" ? -1 : 1;
    const startRow = piece === "♙" ? 6 : 1;

    // movimiento normal
    if (from.c === to.c && to.r === from.r + direction && board[to.r][to.c] === "") {
        return { valid: true };
    }

    // doble paso inicial
    if (
        from.c === to.c &&
        from.r === startRow &&
        to.r === from.r + 2 * direction &&
        board[from.r + direction][to.c] === "" &&
        board[to.r][to.c] === ""
    ) {
        return { valid: true, doubleStep: true };
    }

    // captura diagonal normal
    if (Math.abs(from.c - to.c) === 1 && to.r === from.r + direction && board[to.r][to.c] !== "") {
        return { valid: true };
    }

    // 🔥 EN PASSANT
    if (
        lastMove &&
        lastMove.piece === (piece === "♙" ? "♟" : "♙") &&
        Math.abs(lastMove.from.r - lastMove.to.r) === 2 &&
        lastMove.to.r === from.r &&
        Math.abs(lastMove.to.c - from.c) === 1 &&
        to.c === lastMove.to.c &&
        to.r === from.r + direction
    ) {
        return { valid: true, enPassant: true };
    }

    return { valid: false };
}

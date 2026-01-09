import { isSquareUnderAttack } from "../check.js";

export function isValidKingMove(board, from, to, piece, castlingRights) {
    const dr = Math.abs(to.r - from.r);
    const dc = Math.abs(to.c - from.c);

    const isWhite = piece === "♔";
    const color = isWhite ? "white" : "black";
    const enemy = isWhite ? "black" : "white";
    const rights = castlingRights[color];

    // =========================
    // Movimiento normal
    // =========================
    if (dr <= 1 && dc <= 1) {
        return { valid: true };
    }

    // =========================
    // ⭐ ENROQUE
    // =========================
    if (dr === 0 && dc === 2 && !rights.kingMoved) {
        const row = from.r;

        // Enroque corto
        if (to.c === 6 && !rights.rookRightMoved) {
            if (
                board[row][5] === "" &&
                board[row][6] === "" &&
                !isSquareUnderAttack(board, { r: row, c: 4 }, enemy) &&
                !isSquareUnderAttack(board, { r: row, c: 5 }, enemy) &&
                !isSquareUnderAttack(board, { r: row, c: 6 }, enemy)
            ) {
                return { valid: true, castling: "kingSide" };
            }
        }

        // Enroque largo
        if (to.c === 2 && !rights.rookLeftMoved) {
            if (
                board[row][1] === "" &&
                board[row][2] === "" &&
                board[row][3] === "" &&
                !isSquareUnderAttack(board, { r: row, c: 4 }, enemy) &&
                !isSquareUnderAttack(board, { r: row, c: 3 }, enemy) &&
                !isSquareUnderAttack(board, { r: row, c: 2 }, enemy)
            ) {
                return { valid: true, castling: "queenSide" };
            }
        }
    }

    return { valid: false };
}

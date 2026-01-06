import { isWhitePiece, isBlackPiece } from "./utils.js";

export function canSelectPiece(piece, turn) {
    if (!piece) return false;

    if (turn === "white") {
        return isWhitePiece(piece);
    }

    if (turn === "black") {
        return isBlackPiece(piece);
    }

    return false;
}

export function nextTurn(turn) {
    return turn === "white" ? "black" : "white";
}

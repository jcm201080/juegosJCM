import { isValidRookMove } from "./rook.js";
import { isValidBishopMove } from "./bishop.js";

export function isValidQueenMove(board, from, to, piece) {
    // Reina = torre OR alfil
    const rookLike = isValidRookMove(board, from, to, piece);
    if (rookLike.valid) return { valid: true };

    const bishopLike = isValidBishopMove(board, from, to, piece);
    if (bishopLike.valid) return { valid: true };

    return { valid: false };
}

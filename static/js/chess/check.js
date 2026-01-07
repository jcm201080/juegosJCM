// static/js/chess/check.js
import { canSelectPiece } from "./turn.js";

/**
 * Devuelve true si una casilla está atacada por un color
 */
export function isSquareUnderAttack(board, pos, attackerColor) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece) continue;

            if (!canSelectPiece(piece, attackerColor)) continue;

            const dr = pos.r - r;
            const dc = pos.c - c;

            // ♙ PEONES (solo ataque)
            if (piece === "♙" && dr === -1 && Math.abs(dc) === 1) return true;
            if (piece === "♟" && dr === 1 && Math.abs(dc) === 1) return true;

            // ♘ CABALLOS
            if (
                (piece === "♘" || piece === "♞") &&
                ((Math.abs(dr) === 2 && Math.abs(dc) === 1) ||
                    (Math.abs(dr) === 1 && Math.abs(dc) === 2))
            )
                return true;

            // ♖ TORRES / ♕ DAMA (recto)
            if (
                (piece === "♖" || piece === "♜" || piece === "♕" || piece === "♛") &&
                (dr === 0 || dc === 0)
            ) {
                if (pathClear(board, r, c, pos.r, pos.c)) return true;
            }

            // ♗ ALFILES / ♕ DAMA (diagonal)
            if (
                (piece === "♗" || piece === "♝" || piece === "♕" || piece === "♛") &&
                Math.abs(dr) === Math.abs(dc)
            ) {
                if (pathClear(board, r, c, pos.r, pos.c)) return true;
            }

            // ♔ REY
            if ((piece === "♔" || piece === "♚") && Math.abs(dr) <= 1 && Math.abs(dc) <= 1)
                return true;
        }
    }
    return false;
}

function pathClear(board, r1, c1, r2, c2) {
    const stepR = Math.sign(r2 - r1);
    const stepC = Math.sign(c2 - c1);

    let r = r1 + stepR;
    let c = c1 + stepC;

    while (r !== r2 || c !== c2) {
        if (board[r][c] !== "") return false;
        r += stepR;
        c += stepC;
    }
    return true;
}

import { isSquareUnderAttack } from "./check.js";
import { canSelectPiece } from "./turn.js";

import { isValidPawnMove } from "./rules/pawn.js";
import { isValidRookMove } from "./rules/rook.js";
import { isValidBishopMove } from "./rules/bishop.js";
import { isValidKnightMove } from "./rules/knight.js";
import { isValidQueenMove } from "./rules/queen.js";
import { isValidKingMove } from "./rules/king.js";

export function isCheckmate(board, turn) {
    console.group("♟️ CHECKMATE CHECK");
    console.log("Turn:", turn);

    const myKing = turn === "white" ? "♔" : "♚";
    const enemyColor = turn === "white" ? "black" : "white";

    // 1️⃣ Localizar rey
    let kingPos = null;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === myKing) {
                kingPos = { r, c };
            }
        }
    }

    console.log("King position:", kingPos);

    if (!kingPos) {
        console.groupEnd();
        return false;
    }

    // 2️⃣ ¿Está en jaque?
    if (!isSquareUnderAttack(board, kingPos, enemyColor)) {
        console.log("Not in check → no checkmate");
        console.groupEnd();
        return false;
    }

    console.log("Is in check: true");

    // 3️⃣ Probar TODOS los movimientos legales reales
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (!piece) continue;
            if (!canSelectPiece(piece, turn)) continue;

            for (let tr = 0; tr < 8; tr++) {
                for (let tc = 0; tc < 8; tc++) {
                    // Movimiento básico válido
                    if (!isLegalMove(board, { r, c }, { r: tr, c: tc }, piece)) {
                        continue;
                    }

                    // No capturar pieza propia
                    if (board[tr][tc] && canSelectPiece(board[tr][tc], turn)) {
                        continue;
                    }

                    // ❗ Simular movimiento
                    const backupFrom = board[r][c];
                    const backupTo = board[tr][tc];

                    board[tr][tc] = piece;
                    board[r][c] = "";

                    const newKingPos = piece === myKing ? { r: tr, c: tc } : kingPos;

                    const stillInCheck = isSquareUnderAttack(board, newKingPos, enemyColor);

                    // Revertir
                    board[r][c] = backupFrom;
                    board[tr][tc] = backupTo;

                    console.warn(
                        "Escape candidate:",
                        piece,
                        `(${r},${c}) → (${tr},${tc})`,
                        "stillInCheck:",
                        stillInCheck
                    );

                    // ✅ HAY ESCAPE REAL → NO ES MATE
                    if (!stillInCheck) {
                        console.warn("🟢 ESCAPE REAL DETECTADO");
                        console.groupEnd();
                        return false;
                    }
                }
            }
        }
    }

    console.error("💀 CHECKMATE CONFIRMED");
    console.groupEnd();
    return true;
}

// =========================
// VALIDADOR BÁSICO DE MOVES
// =========================
function isLegalMove(board, from, to, piece) {
    if (piece === "♙" || piece === "♟") return isValidPawnMove(board, from, to, piece, null).valid;

    if (piece === "♖" || piece === "♜") return isValidRookMove(board, from, to, piece).valid;

    if (piece === "♗" || piece === "♝") return isValidBishopMove(board, from, to, piece).valid;

    if (piece === "♘" || piece === "♞") return isValidKnightMove(from, to).valid;

    if (piece === "♕" || piece === "♛") return isValidQueenMove(board, from, to, piece).valid;

    if (piece === "♔" || piece === "♚")
        return isValidKingMove(board, from, to, piece, {
            white: { kingMoved: true, rookLeftMoved: true, rookRightMoved: true },
            black: { kingMoved: true, rookLeftMoved: true, rookRightMoved: true }
        }).valid;



    return false;
}

import { board, renderBoard } from "./board.js";
import { canSelectPiece, nextTurn } from "./turn.js";

import { isValidPawnMove } from "./rules/pawn.js";
import { isValidRookMove } from "./rules/rook.js";
import { isValidBishopMove } from "./rules/bishop.js";
import { isValidKnightMove } from "./rules/knight.js";
import { isValidQueenMove } from "./rules/queen.js";
import { isValidKingMove } from "./rules/king.js";
import { isSquareUnderAttack } from "./check.js";

console.info("♟️ Chess engine loaded");

document.addEventListener("DOMContentLoaded", () => {
    const boardEl = document.getElementById("chessboard");
    const turnoEl = document.getElementById("turno");
    const messageEl = document.getElementById("message");

    let turn = "white";
    let selected = null;
    let lastMove = null;

    // 🔐 Derechos de enroque
    const castlingRights = {
        white: { king: true, rookLeft: true, rookRight: true },
        black: { king: true, rookLeft: true, rookRight: true }
    };

    function onSquareClick(r, c) {
        if (selected) {
            const piece = board[selected.r][selected.c];
            let result = { valid: false };

            // =========================
            // 1️⃣ VALIDACIÓN DE MOVIMIENTO
            // =========================
            if (piece === "♙" || piece === "♟") {
                result = isValidPawnMove(board, selected, { r, c }, piece, lastMove);
            } else if (piece === "♖" || piece === "♜") {
                result = isValidRookMove(board, selected, { r, c }, piece);
            } else if (piece === "♗" || piece === "♝") {
                result = isValidBishopMove(board, selected, { r, c }, piece);
            } else if (piece === "♘" || piece === "♞") {
                result = isValidKnightMove(selected, { r, c });
            } else if (piece === "♕" || piece === "♛") {
                result = isValidQueenMove(board, selected, { r, c }, piece);
            } else if (piece === "♔" || piece === "♚") {
                result = isValidKingMove(selected, { r, c });

                // 👑 ENROQUE (sin jaque todavía)
                const color = piece === "♔" ? "white" : "black";
                const homeRow = color === "white" ? 7 : 0;

                if (
                    selected.r === homeRow &&
                    selected.c === 4 &&
                    r === homeRow &&
                    Math.abs(c - 4) === 2 &&
                    castlingRights[color].king
                ) {
                    if (
                        c === 6 &&
                        castlingRights[color].rookRight &&
                        board[homeRow][5] === "" &&
                        board[homeRow][6] === ""
                    ) {
                        result = { valid: true, castling: "short" };
                    }

                    if (
                        c === 2 &&
                        castlingRights[color].rookLeft &&
                        board[homeRow][1] === "" &&
                        board[homeRow][2] === "" &&
                        board[homeRow][3] === ""
                    ) {
                        result = { valid: true, castling: "long" };
                    }
                }
            }

            // =========================
            // 2️⃣ BLOQUEAR CAPTURA PROPIA
            // =========================
            const target = board[r][c];
            if (target && canSelectPiece(target, turn)) {
                result = { valid: false };
            }

            // =========================
            // 3️⃣ BLOQUEAR SI DEJA TU REY EN JAQUE
            // =========================
            if (result.valid) {
                const myKing = turn === "white" ? "♔" : "♚";
                const enemyColor = turn === "white" ? "black" : "white";

                // Simular movimiento
                const backupFrom = board[selected.r][selected.c];
                const backupTo = board[r][c];

                board[r][c] = piece;
                board[selected.r][selected.c] = "";

                // Buscar mi rey
                let kingPos = null;
                for (let i = 0; i < 8; i++) {
                    for (let j = 0; j < 8; j++) {
                        if (board[i][j] === myKing) {
                            kingPos = { r: i, c: j };
                        }
                    }
                }

                const illegal =
                    kingPos && isSquareUnderAttack(board, kingPos, enemyColor);

                // Revertir simulación
                board[selected.r][selected.c] = backupFrom;
                board[r][c] = backupTo;

                if (illegal) {
                    result = { valid: false };
                    messageEl.textContent =
                        "⛔ Movimiento ilegal: tu rey queda en jaque.";
                }
            }

            // =========================
            // 4️⃣ EJECUTAR MOVIMIENTO
            // =========================
            if (result.valid) {
                board[r][c] = piece;
                board[selected.r][selected.c] = "";

                // ♟️ PROMOCIÓN
                if (piece === "♙" && r === 0) board[r][c] = "♕";
                if (piece === "♟" && r === 7) board[r][c] = "♛";

                // 👑 Enroque
                if (result.castling) {
                    if (result.castling === "short") {
                        board[r][5] = board[r][7];
                        board[r][7] = "";
                    }
                    if (result.castling === "long") {
                        board[r][3] = board[r][0];
                        board[r][0] = "";
                    }
                }

                // Invalidar derechos de enroque
                if (piece === "♔") castlingRights.white.king = false;
                if (piece === "♚") castlingRights.black.king = false;

                if (piece === "♖" && selected.r === 7 && selected.c === 0)
                    castlingRights.white.rookLeft = false;
                if (piece === "♖" && selected.r === 7 && selected.c === 7)
                    castlingRights.white.rookRight = false;
                if (piece === "♜" && selected.r === 0 && selected.c === 0)
                    castlingRights.black.rookLeft = false;
                if (piece === "♜" && selected.r === 0 && selected.c === 7)
                    castlingRights.black.rookRight = false;

                lastMove = { piece, from: selected, to: { r, c } };
                selected = null;
                turn = nextTurn(turn);
                turnoEl.textContent =
                    `Turno: ${turn === "white" ? "Blancas" : "Negras"}`;
                messageEl.textContent = "";
            } else {
                selected = null;
            }

            renderBoard(board, boardEl, onSquareClick);

            // =========================
            // 5️⃣ JAQUE VISUAL
            // =========================
            const enemyKing = turn === "white" ? "♚" : "♔";
            let enemyKingPos = null;

            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 8; j++) {
                    if (board[i][j] === enemyKing) {
                        enemyKingPos = { r: i, c: j };
                    }
                }
            }

            if (
                enemyKingPos &&
                isSquareUnderAttack(
                    board,
                    enemyKingPos,
                    turn === "white" ? "white" : "black"
                )
            ) {
                messageEl.textContent = "♚ ¡JAQUE!";
            }

        } else if (board[r][c]) {
            if (canSelectPiece(board[r][c], turn)) {
                selected = { r, c };
                messageEl.textContent = "";
            } else {
                messageEl.textContent = "⛔ No es tu turno.";
            }
        }
    }

    renderBoard(board, boardEl, onSquareClick);
});

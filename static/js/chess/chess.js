import { board, renderBoard } from "./board.js";
import { canSelectPiece, nextTurn } from "./turn.js";

import { isValidPawnMove } from "./rules/pawn.js";
import { isValidRookMove } from "./rules/rook.js";
import { isValidBishopMove } from "./rules/bishop.js";
import { isValidKnightMove } from "./rules/knight.js";
import { isValidQueenMove } from "./rules/queen.js";
import { isValidKingMove } from "./rules/king.js";

import { isSquareUnderAttack } from "./check.js";
import { isCheckmate } from "./checkmate.js";

console.info("♟️ Chess engine loaded");

document.addEventListener("DOMContentLoaded", () => {
    const boardEl = document.getElementById("chessboard");
    const turnoEl = document.getElementById("turno");
    const messageEl = document.getElementById("message");

    let turn = "white";
    let selected = null;
    let lastMove = null;
    let gameOver = false;

    // =========================
    // DERECHOS DE ENROQUE
    // =========================
    const castlingRights = {
        white: { kingMoved: false, rookLeftMoved: false, rookRightMoved: false },
        black: { kingMoved: false, rookLeftMoved: false, rookRightMoved: false }
    };

    // =========================
    // ¿Este movimiento deja mi rey en jaque?
    // =========================
    function leavesKingInCheck(from, to, piece, color) {
        const myKing = color === "white" ? "♔" : "♚";
        const enemyColor = color === "white" ? "black" : "white";

        const bf = board[from.r][from.c];
        const bt = board[to.r][to.c];

        board[to.r][to.c] = piece;
        board[from.r][from.c] = "";

        let kingPos = null;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === myKing) kingPos = { r, c };
            }
        }

        const inCheck =
            kingPos && isSquareUnderAttack(board, kingPos, enemyColor);

        board[from.r][from.c] = bf;
        board[to.r][to.c] = bt;

        return inCheck;
    }

    // =========================
    // COMPROBAR JAQUE / JAQUE MATE
    // =========================
    function checkGameState() {
        const defender = turn;
        const attacker = defender === "white" ? "black" : "white";
        const defenderKing = defender === "white" ? "♔" : "♚";

        let kingPos = null;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === defenderKing) {
                    kingPos = { r, c };
                }
            }
        }

        if (!kingPos) return;

        if (isSquareUnderAttack(board, kingPos, attacker)) {
            if (isCheckmate(board, defender)) {
                messageEl.textContent =
                    `♚ ¡JAQUE MATE! Ganan ${attacker === "white" ? "Blancas" : "Negras"}`;
                gameOver = true;
            } else {
                messageEl.textContent = "♚ ¡JAQUE!";
            }
        } else {
            if (!gameOver) messageEl.textContent = "";
        }
    }

    // =========================
    // CLICK EN CASILLA
    // =========================
    function onSquareClick(r, c) {
        if (gameOver) return;

        if (selected) {
            const piece = board[selected.r][selected.c];
            let result = { valid: false };

            // VALIDACIÓN POR PIEZA
            if (piece === "♙" || piece === "♟")
                result = isValidPawnMove(board, selected, { r, c }, piece, lastMove);
            else if (piece === "♖" || piece === "♜")
                result = isValidRookMove(board, selected, { r, c }, piece);
            else if (piece === "♗" || piece === "♝")
                result = isValidBishopMove(board, selected, { r, c }, piece);
            else if (piece === "♘" || piece === "♞")
                result = isValidKnightMove(selected, { r, c });
            else if (piece === "♕" || piece === "♛")
                result = isValidQueenMove(board, selected, { r, c }, piece);
            else if (piece === "♔" || piece === "♚") {
                const color = piece === "♔" ? "white" : "black";
                const homeRow = color === "white" ? 7 : 0;

                result = isValidKingMove(selected, { r, c });

                // ENROQUE
                if (
                    selected.r === homeRow &&
                    selected.c === 4 &&
                    r === homeRow &&
                    Math.abs(c - 4) === 2 &&
                    !castlingRights[color].kingMoved
                ) {
                    if (
                        c === 6 &&
                        !castlingRights[color].rookRightMoved &&
                        board[homeRow][5] === "" &&
                        board[homeRow][6] === ""
                    ) {
                        result = { valid: true, castling: "short" };
                    }
                    if (
                        c === 2 &&
                        !castlingRights[color].rookLeftMoved &&
                        board[homeRow][1] === "" &&
                        board[homeRow][2] === "" &&
                        board[homeRow][3] === ""
                    ) {
                        result = { valid: true, castling: "long" };
                    }
                }
            }

            // BLOQUEAR CAPTURA PROPIA
            const target = board[r][c];
            if (target && canSelectPiece(target, turn)) result.valid = false;

            // BLOQUEAR JAQUE PROPIO
            if (
                result.valid &&
                leavesKingInCheck(selected, { r, c }, piece, turn)
            ) {
                result.valid = false;
                messageEl.textContent = "⛔ Tu rey quedaría en jaque.";
            }

            // EJECUTAR MOVIMIENTO
            if (result.valid) {
                board[r][c] = piece;
                board[selected.r][selected.c] = "";

                // Ejecutar enroque
                if (result.castling) {
                    const row = selected.r;
                    if (result.castling === "short") {
                        board[row][5] = board[row][7];
                        board[row][7] = "";
                    }
                    if (result.castling === "long") {
                        board[row][3] = board[row][0];
                        board[row][0] = "";
                    }
                }

                // Promoción
                if (piece === "♙" && r === 0) board[r][c] = "♕";
                if (piece === "♟" && r === 7) board[r][c] = "♛";

                // Invalidar enroques
                if (piece === "♔") castlingRights.white.kingMoved = true;
                if (piece === "♚") castlingRights.black.kingMoved = true;

                lastMove = { piece, from: selected, to: { r, c } };
                selected = null;

                turn = nextTurn(turn);
                turnoEl.textContent =
                    `Turno: ${turn === "white" ? "Blancas" : "Negras"}`;

                renderBoard(board, boardEl, onSquareClick);
                checkGameState();
            } else {
                selected = null;
                renderBoard(board, boardEl, onSquareClick);
            }

        } else if (board[r][c]) {
            if (canSelectPiece(board[r][c], turn)) {
                selected = { r, c };
                if (!gameOver) messageEl.textContent = "";
            }
        }
    }

    renderBoard(board, boardEl, onSquareClick);
    checkGameState();
});

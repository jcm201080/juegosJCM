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

    const _initialBoard = JSON.parse(JSON.stringify(board));

    let turn = "white";
    let selected = null;
    let lastMove = null;
    let gameOver = false;
    let checkSoundPlayed = false;

    // =========================
    // 🔊 SONIDOS
    // =========================
    const soundMove = new Audio("/static/sounds/chess/move.wav");
    const soundCapture = new Audio("/static/sounds/chess/capture.wav");
    const soundCastle = new Audio("/static/sounds/chess/castle.wav");
    const soundPromote = new Audio("/static/sounds/chess/promote.wav");
    const soundCheck = new Audio("/static/sounds/wrong.wav");
    const soundCheckmate = new Audio("/static/sounds/muerte.mp3");
    const soundDraw = new Audio("/static/sounds/muerte.mp3");

    [
        soundMove,
        soundCapture,
        soundCastle,
        soundPromote,
        soundCheck,
        soundCheckmate,
        soundDraw,
    ].forEach((s) => (s.volume = 0.6));

    // =========================
    // ⭐ DERECHOS DE ENROQUE
    // =========================
    const castlingRights = {
        white: { kingMoved: false, rookLeftMoved: false, rookRightMoved: false },
        black: { kingMoved: false, rookLeftMoved: false, rookRightMoved: false },
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

        const inCheck = kingPos && isSquareUnderAttack(board, kingPos, enemyColor);

        board[from.r][from.c] = bf;
        board[to.r][to.c] = bt;

        return inCheck;
    }

    // =========================
    // CLICK EN TABLERO
    // =========================
    function onSquareClick(r, c) {
        if (gameOver) return;

        if (selected) {
            const piece = board[selected.r][selected.c];
            const target = board[r][c];
            const isCapture = target !== "";
            let result = { valid: false };

            if (piece === "♙" || piece === "♟")
                result = isValidPawnMove(board, selected, { r, c }, piece, lastMove);
            else if (piece === "♖" || piece === "♜")
                result = isValidRookMove(board, selected, { r, c }, piece);
            else if (piece === "♗" || piece === "♝")
                result = isValidBishopMove(board, selected, { r, c }, piece);
            else if (piece === "♘" || piece === "♞") result = isValidKnightMove(selected, { r, c });
            else if (piece === "♕" || piece === "♛")
                result = isValidQueenMove(board, selected, { r, c }, piece);
            else if (piece === "♔" || piece === "♚")
                result = isValidKingMove(board, selected, { r, c }, piece, castlingRights);

            if (target && canSelectPiece(target, turn)) result.valid = false;
            if (result.valid && leavesKingInCheck(selected, { r, c }, piece, turn))
                result.valid = false;

            if (!result.valid) {
                selected = null;
                renderBoard(board, boardEl, onSquareClick, selected);
                return;
            }

            // =========================
            // ⭐ EJECUTAR MOVIMIENTO
            // =========================
            board[r][c] = piece;
            board[selected.r][selected.c] = "";

            // ⭐ ENROQUE: mover torre
            if (result.castling) {
                if (result.castling === "kingSide") {
                    board[r][c - 1] = board[r][7];
                    board[r][7] = "";
                } else if (result.castling === "queenSide") {
                    board[r][c + 1] = board[r][0];
                    board[r][0] = "";
                }
                soundCastle.currentTime = 0;
                soundCastle.play();
            } else if (isCapture) {
                soundCapture.currentTime = 0;
                soundCapture.play();
            } else {
                soundMove.currentTime = 0;
                soundMove.play();
            }

            // =========================
            // ⭐ ACTUALIZAR DERECHOS ENROQUE
            // =========================
            if (piece === "♔") castlingRights.white.kingMoved = true;
            if (piece === "♚") castlingRights.black.kingMoved = true;

            if (piece === "♖" && selected.c === 0) castlingRights.white.rookLeftMoved = true;
            if (piece === "♖" && selected.c === 7) castlingRights.white.rookRightMoved = true;

            if (piece === "♜" && selected.c === 0) castlingRights.black.rookLeftMoved = true;
            if (piece === "♜" && selected.c === 7) castlingRights.black.rookRightMoved = true;

            lastMove = { piece, from: selected, to: { r, c } };
            selected = null;
            turn = nextTurn(turn);
            turnoEl.textContent = `Turno: ${turn === "white" ? "Blancas" : "Negras"}`;

            renderBoard(board, boardEl, onSquareClick, selected);
            checkGameState();
        } else if (board[r][c] && canSelectPiece(board[r][c], turn)) {
            selected = { r, c };
            renderBoard(board, boardEl, onSquareClick, selected);
        }
    }

    // =========================
    // JAQUE / JAQUE MATE
    // =========================
    function checkGameState() {
        const defender = turn;
        const attacker = defender === "white" ? "black" : "white";
        const defenderKing = defender === "white" ? "♔" : "♚";

        let kingPos = null;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === defenderKing) kingPos = { r, c };
            }
        }

        if (!kingPos) return;

        if (isSquareUnderAttack(board, kingPos, attacker)) {
            if (isCheckmate(board, defender)) {
                messageEl.textContent = `♚ ¡JAQUE MATE! Ganan ${attacker === "white" ? "Blancas" : "Negras"}`;
                gameOver = true;
                soundCheckmate.play();
            } else {
                messageEl.textContent = "♚ ¡JAQUE!";
                if (!checkSoundPlayed) {
                    soundCheck.play();
                    checkSoundPlayed = true;
                }
            }
        } else {
            checkSoundPlayed = false;
            messageEl.textContent = "";
        }
    }

    document.getElementById("resetGame").addEventListener("click", () => location.reload());

    renderBoard(board, boardEl, onSquareClick, selected);
    checkGameState();
});

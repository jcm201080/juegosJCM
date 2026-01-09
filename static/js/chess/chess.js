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

    const initialBoard = JSON.parse(JSON.stringify(board));

    let turn = "white";
    let selected = null;
    let lastMove = null;
    let gameOver = false;
    let checkSoundPlayed = false;

    // =========================
    // TABLAS POR REPETICIÓN
    // =========================
    const positionHistory = {};

    function getPositionKey() {
        return JSON.stringify({
            board,
            turn,
            castlingRights,
        });
    }

    function checkThreefoldRepetition() {
        const key = getPositionKey();
        positionHistory[key] = (positionHistory[key] || 0) + 1;

        if (positionHistory[key] === 3) {
            messageEl.textContent = "🤝 Tablas por repetición de posición";
            gameOver = true;

            soundDraw.currentTime = 0;
            soundDraw.play();
        }
    }

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
    // DERECHOS DE ENROQUE
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

    function canCastleThrough(board, squares, enemyColor) {
        return squares.every((pos) => !isSquareUnderAttack(board, pos, enemyColor));
    }

    function hasAnyLegalMove(color) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece || !canSelectPiece(piece, color)) continue;

                for (let tr = 0; tr < 8; tr++) {
                    for (let tc = 0; tc < 8; tc++) {
                        let result = { valid: false };

                        if (piece === "♙" || piece === "♟")
                            result = isValidPawnMove(
                                board,
                                { r, c },
                                { r: tr, c: tc },
                                piece,
                                lastMove
                            );
                        else if (piece === "♖" || piece === "♜")
                            result = isValidRookMove(board, { r, c }, { r: tr, c: tc }, piece);
                        else if (piece === "♗" || piece === "♝")
                            result = isValidBishopMove(board, { r, c }, { r: tr, c: tc }, piece);
                        else if (piece === "♘" || piece === "♞")
                            result = isValidKnightMove({ r, c }, { r: tr, c: tc });
                        else if (piece === "♕" || piece === "♛")
                            result = isValidQueenMove(board, { r, c }, { r: tr, c: tc }, piece);
                        else if (piece === "♔" || piece === "♚")
                            result = isValidKingMove({ r, c }, { r: tr, c: tc });

                        if (!result.valid) continue;

                        if (!leavesKingInCheck({ r, c }, { r: tr, c: tc }, piece, color)) {
                            return true; // 👉 hay al menos un movimiento legal
                        }
                    }
                }
            }
        }
        return false;
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
                soundCheckmate.currentTime = 0;
                soundCheckmate.play();
            } else {
                messageEl.textContent = "♚ ¡JAQUE!";
                if (!checkSoundPlayed) {
                    soundCheck.currentTime = 0;
                    soundCheck.play();
                    checkSoundPlayed = true;
                }
            }
        } else {
            checkSoundPlayed = false;

            // limpiar mensaje de jaque
            messageEl.textContent = "";

            // 🤝 AHOGADO (STALEMATE)
            if (!hasAnyLegalMove(defender)) {
                messageEl.textContent = "🤝 Tablas por ahogado";
                gameOver = true;

                soundDraw.currentTime = 0;
                soundDraw.play();
            }
        }
    }

    // =========================
    // PROMOCIÓN
    // =========================
    function promotePawn(color, callback) {
        const choices = color === "white" ? ["♕", "♖", "♗", "♘"] : ["♛", "♜", "♝", "♞"];

        const modal = document.createElement("div");
        modal.className = "promotion-modal";

        choices.forEach((piece) => {
            const btn = document.createElement("button");
            btn.textContent = piece;
            btn.className = "promotion-btn";
            btn.onclick = () => {
                document.body.removeChild(modal);
                callback(piece);
            };
            modal.appendChild(btn);
        });

        document.body.appendChild(modal);
    }

    // =========================
    // REINICIAR
    // =========================
    function resetGame() {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                board[r][c] = initialBoard[r][c];
            }
        }

        turn = "white";
        selected = null;
        lastMove = null;
        gameOver = false;
        checkSoundPlayed = false;

        Object.values(castlingRights.white).fill(false);
        Object.values(castlingRights.black).fill(false);

        for (const key in positionHistory) delete positionHistory[key];

        turnoEl.textContent = "Turno: Blancas";
        messageEl.textContent = "";

        renderBoard(board, boardEl, onSquareClick, selected);
    }

    // =========================
    // CLICK
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
            else if (piece === "♔" || piece === "♚") result = isValidKingMove(selected, { r, c });

            if (target && canSelectPiece(target, turn)) result.valid = false;
            if (result.valid && leavesKingInCheck(selected, { r, c }, piece, turn))
                result.valid = false;

            if (result.valid) {
                board[r][c] = piece;
                board[selected.r][selected.c] = "";

                if (result.castling) {
                    soundCastle.currentTime = 0;
                    soundCastle.play();
                } else if (isCapture) {
                    soundCapture.currentTime = 0;
                    soundCapture.play();
                } else {
                    soundMove.currentTime = 0;
                    soundMove.play();
                }

                const isPromotion = (piece === "♙" && r === 0) || (piece === "♟" && r === 7);

                if (isPromotion) {
                    promotePawn(turn, (newPiece) => {
                        board[r][c] = newPiece;
                        soundPromote.currentTime = 0;
                        soundPromote.play();

                        lastMove = { piece: newPiece, from: selected, to: { r, c } };
                        selected = null;
                        turn = nextTurn(turn);
                        turnoEl.textContent = `Turno: ${turn === "white" ? "Blancas" : "Negras"}`;

                        renderBoard(board, boardEl, onSquareClick, selected);
                        checkGameState();
                        checkThreefoldRepetition();
                    });
                    return;
                }

                lastMove = { piece, from: selected, to: { r, c } };
                selected = null;
                turn = nextTurn(turn);
                turnoEl.textContent = `Turno: ${turn === "white" ? "Blancas" : "Negras"}`;

                renderBoard(board, boardEl, onSquareClick, selected);
                checkGameState();
                checkThreefoldRepetition();
            } else {
                selected = null;
                renderBoard(board, boardEl, onSquareClick, selected);
            }
        } else if (board[r][c] && canSelectPiece(board[r][c], turn)) {
            selected = { r, c };
            renderBoard(board, boardEl, onSquareClick, selected);
        }
    }

    document.getElementById("resetGame").addEventListener("click", resetGame);

    renderBoard(board, boardEl, onSquareClick, selected);
    checkGameState();
});

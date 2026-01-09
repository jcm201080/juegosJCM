import { board as initialBoard, renderBoard } from "./board.js";

import { canSelectPiece, nextTurn } from "./turn.js";

import { isValidPawnMove } from "./rules/pawn.js";
import { isValidRookMove } from "./rules/rook.js";
import { isValidBishopMove } from "./rules/bishop.js";
import { isValidKnightMove } from "./rules/knight.js";
import { isValidQueenMove } from "./rules/queen.js";
import { isValidKingMove } from "./rules/king.js";

import { isSquareUnderAttack } from "./check.js";
import { isCheckmate } from "./checkmate.js";

const socket = io({
    path: "/juegos/socket.io"
});


// =========================
// UI
// =========================
const statusEl = document.getElementById("message");
const turnoEl = document.getElementById("turno");
const boardEl = document.getElementById("chessboard");
const resetBtn = document.getElementById("resetGame");

// =========================
// 🔊 SONIDOS
// =========================
const soundMove = new Audio("/static/sounds/chess/move.wav");
const soundCapture = new Audio("/static/sounds/chess/capture.wav");
const soundCastle = new Audio("/static/sounds/chess/castle.wav");
const soundPromote = new Audio("/static/sounds/chess/promote.wav");
const soundCheck = new Audio("/static/sounds/wrong.wav");
const soundCheckmate = new Audio("/static/sounds/muerte.mp3");

[soundMove, soundCapture, soundCastle, soundPromote, soundCheck].forEach((s) => (s.volume = 0.6));
soundCheckmate.volume = 0.8;

// =========================
// ESTADO DEL JUEGO
// =========================
let board = JSON.parse(JSON.stringify(initialBoard));
let myRole = null;
let gameStarted = false;
let connected = false;
let selected = null;
let turn = "white";
let lastMove = null;

// =========================
// ESTADO VISUAL
// =========================
function updateStatus(text = null) {
    if (text) {
        statusEl.textContent = text;
        return;
    }

    if (!connected) {
        statusEl.textContent = "🔴 Desconectado";
        return;
    }

    if (!gameStarted) {
        statusEl.textContent = "🟢 Conectado al servidor. Esperando rival...";
        return;
    }

    statusEl.textContent =
        myRole === "white"
            ? "♟️ Partida iniciada · Juegas con BLANCAS"
            : "♟️ Partida iniciada · Juegas con NEGRAS";
}

// =========================
// JAQUE / MATE / TABLAS
// =========================
function checkGameStateOnline() {
    const defender = turn;
    const attacker = defender === "white" ? "black" : "white";
    const kingSymbol = defender === "white" ? "♔" : "♚";

    let kingPos = null;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === kingSymbol) {
                kingPos = { r, c };
            }
        }
    }

    if (!kingPos) return;

    if (isSquareUnderAttack(board, kingPos, attacker)) {
        if (isCheckmate(board, defender)) {
            statusEl.textContent = `♚ ¡JAQUE MATE! Ganan ${attacker === "white" ? "Blancas" : "Negras"}`;
            soundCheckmate.play();
            gameStarted = false;
        } else {
            statusEl.textContent = "♚ ¡JAQUE!";
            soundCheck.play();
        }
    } else {
        updateStatus();
    }
}

// =========================
// 🔌 SOCKETS
// =========================
socket.on("connect", () => {
    connected = true;
    updateStatus();
});

socket.on("role_assigned", ({ role }) => {
    myRole = role;

    if (role === "black") boardEl.classList.add("flipped");
    else boardEl.classList.remove("flipped");

    updateStatus();
});

socket.on("game_start", () => {
    board = JSON.parse(JSON.stringify(initialBoard));
    gameStarted = true;
    turn = "white";
    selected = null;

    renderBoard(board, boardEl, onSquareClick, null);
    turnoEl.textContent = "Turno: Blancas";
    updateStatus();
});

// =========================
// ♟️ MOVIMIENTO RECIBIDO
// =========================
socket.on("move", ({ from, to }) => {
    const piece = board[from.r][from.c];
    const target = board[to.r][to.c];

    // ENROQUE
    if ((piece === "♔" || piece === "♚") && Math.abs(from.c - to.c) === 2) {
        if (to.c === 6) {
            board[to.r][5] = board[to.r][7];
            board[to.r][7] = "";
        }
        if (to.c === 2) {
            board[to.r][3] = board[to.r][0];
            board[to.r][0] = "";
        }
        soundCastle.play();
    } else if (target !== "") {
        soundCapture.play();
    } else {
        soundMove.play();
    }

    board[to.r][to.c] = piece;
    board[from.r][from.c] = "";

    // PROMOCIÓN
    if (piece === "♙" && to.r === 0) {
        board[to.r][to.c] = "♕";
        soundPromote.play();
    }
    if (piece === "♟" && to.r === 7) {
        board[to.r][to.c] = "♛";
        soundPromote.play();
    }

    lastMove = { piece, from, to };
    selected = null;
    turn = nextTurn(turn);

    turnoEl.textContent = `Turno: ${turn === "white" ? "Blancas" : "Negras"}`;
    renderBoard(board, boardEl, onSquareClick, null);
    checkGameStateOnline();
});

// =========================
// 🔁 REINICIO ONLINE
// =========================
resetBtn?.addEventListener("click", () => {
    socket.emit("reset_game");
});

socket.on("game_reset", () => {
    board = JSON.parse(JSON.stringify(initialBoard));
    selected = null;
    lastMove = null;
    turn = "white";
    gameStarted = true;

    renderBoard(board, boardEl, onSquareClick, null);
    turnoEl.textContent = "Turno: Blancas";
    updateStatus("♟️ Partida reiniciada");
});

// =========================
// ❌ RIVAL SE VA
// =========================
socket.on("player_left", () => {
    gameStarted = false;
    updateStatus("❌ El rival se ha desconectado");
});

// =========================
// 🖱️ CLICK EN TABLERO
// =========================
function onSquareClick(r, c) {
    if (!gameStarted) return;
    if (myRole !== turn) return;

    if (!selected) {
        const piece = board[r][c];
        if (piece && canSelectPiece(piece, myRole)) {
            selected = { r, c };
            renderBoard(board, boardEl, onSquareClick, selected);
        }
        return;
    }

    const piece = board[selected.r][selected.c];
    const target = board[r][c];
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

    if (target && canSelectPiece(target, myRole)) {
        selected = null;
        renderBoard(board, boardEl, onSquareClick, null);
        return;
    }

    if (result.valid) {
        socket.emit("move", { from: selected, to: { r, c } });
        selected = null;
    } else {
        selected = null;
        renderBoard(board, boardEl, onSquareClick, null);
    }
}

// =========================
// RENDER INICIAL
// =========================
renderBoard(board, boardEl, onSquareClick, null);
updateStatus();

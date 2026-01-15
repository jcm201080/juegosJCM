/* global io */

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

const socket = io();



// =========================
// UI
// =========================
const statusEl = document.getElementById("message");
const turnoEl = document.getElementById("turno");
const boardEl = document.getElementById("chessboard");
const resetBtn = document.getElementById("resetGame");

//Botones de rendición y tablas
const resignBtn = document.getElementById("resignBtn");
const offerDrawBtn = document.getElementById("offerDrawBtn");
const acceptDrawBtn = document.getElementById("acceptDrawBtn");
const rejectDrawBtn = document.getElementById("rejectDrawBtn");



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
let gameOver = false;

let currentRoom = null;

let inRoom = false;

let drawPending = false;




let castlingRights = {
    white: {
        kingMoved: false,
        rookLeftMoved: false,
        rookRightMoved: false
    },
    black: {
        kingMoved: false,
        rookLeftMoved: false,
        rookRightMoved: false
    }
};

//Ofrecer tablas
offerDrawBtn.addEventListener("click", () => {
    if (gameOver || !gameStarted) return;

    socket.emit("offer_draw");
    statusEl.textContent = "🤝 Has ofrecido tablas";
    offerDrawBtn.disabled = true;
});

// Recibir oferta de tablas
socket.on("draw_offered", () => {
    if (gameOver) return;

    drawPending = true;

    statusEl.textContent = "🤝 El rival ofrece tablas";

    acceptDrawBtn.style.display = "inline-block";
    rejectDrawBtn.style.display = "inline-block";
});


// Aceptar tablas
acceptDrawBtn.addEventListener("click", () => {
    socket.emit("accept_draw");
});

//rechazar tablas
rejectDrawBtn.addEventListener("click", () => {
    socket.emit("reject_draw");

    acceptDrawBtn.style.display = "none";
    rejectDrawBtn.style.display = "none";
});






//Detectar si esta en jaque antes el movimiento
function isKingCurrentlyInCheck(board, role) {
    const kingSymbol = role === "white" ? "♔" : "♚";
    let kingPos = null;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === kingSymbol) {
                kingPos = { r, c };
                break;
            }
        }
    }

    if (!kingPos) return false;

    const attacker = role === "white" ? "black" : "white";
    return isSquareUnderAttack(board, kingPos, attacker);
}


//helpers
function cloneBoard(board) {
    return board.map((row) => [...row]);
}

function applyMove(board, from, to) {
    const piece = board[from.r][from.c];
    board[to.r][to.c] = piece;
    board[from.r][from.c] = "";
}

//detectar jaque
function kingInCheckAfterMove(board, role) {
    const kingSymbol = role === "white" ? "♔" : "♚";
    let kingPos = null;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === kingSymbol) {
                kingPos = { r, c };
                break;
            }
        }
    }

    if (!kingPos) return true; // seguridad

    const attacker = role === "white" ? "black" : "white";
    return isSquareUnderAttack(board, kingPos, attacker);
}




// =========================
// ESTADO VISUAL
// =========================
function updateStatus(text = null) {
    if (text) {
        statusEl.textContent = text;
        return;
    }

    if (inRoom) return; // ⬅️ CLAVE

    if (!connected) {
        statusEl.textContent = "🔴 Desconectado";
        return;
    }

    statusEl.textContent = "🟢 Conectado al servidor";
}


// =========================
// JAQUE / MATE / TABLAS
// =========================
function checkGameStateOnline() {
    const defender = turn;
    const attacker = defender === "white" ? "black" : "white";
    const kingSymbol = defender === "white" ? "♔" : "♚";
    console.log("CHECKMATE TEST →", defender, isCheckmate(board, defender));


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
        if (isCheckmate(board, defender, castlingRights)) {
            gameOver = true;

            const winner = attacker === myRole ? "TÚ GANAS 🎉" : "HAS PERDIDO 😢";

            statusEl.textContent =
                attacker === "white"
                    ? `♚ JAQUE MATE · Ganan BLANCAS · ${winner}`
                    : `♚ JAQUE MATE · Ganan NEGRAS · ${winner}`;

            // Sonido único (evita solapamientos)
            soundCheck.pause(); soundCheck.currentTime = 0;
            soundCheckmate.play();

            return;
        } else {
            statusEl.textContent = "♚ ¡JAQUE!";
            soundCheck.play();
        }
    } else if (!gameOver && !drawPending) {
        updateStatus();
    }

}

// =========================
// 🔌 SOCKETS
// =========================
socket.on("connect", () => {
    connected = true;
    statusEl.textContent = "🟢 Conectado al servidor";
});


socket.on("role_assigned", ({ role }) => {
    myRole = role;

    if (role === "black") boardEl.classList.add("flipped");
    else boardEl.classList.remove("flipped");

    updateStatus();
});

socket.on("game_start", () => {
    gameStarted = true;
    gameOver = false;
    turn = "white";

    turnoEl.textContent = "Turno: Blancas";

    statusEl.textContent =
        myRole === "white"
            ? "♟️ Partida iniciada · Juegas con BLANCAS"
            : "♟️ Partida iniciada · Juegas con NEGRAS";

    renderBoard(board, boardEl, onSquareClick, null);
});


//rendición
socket.on("player_resigned", ({ color }) => {
    gameOver = true;

    if (color === myRole) {
        statusEl.textContent = "🏳️ Te has rendido · HAS PERDIDO 😢";
    } else {
        statusEl.textContent = "🏳️ El rival se ha rendido · ¡HAS GANADO! 🎉";
        soundCheckmate.play();
    }
    resignBtn.disabled = true;

});

//Tablas aceptadas
socket.on("draw_accepted", () => {
    gameOver = true;
    drawPending = false;

    statusEl.textContent = "🤝 Tablas acordadas";

    acceptDrawBtn.style.display = "none";
    rejectDrawBtn.style.display = "none";
    offerDrawBtn.disabled = true;
    resignBtn.disabled = true;
});


//Tablas rechazadas
socket.on("draw_rejected", () => {
    drawPending = false;

    statusEl.textContent = "❌ El rival rechazó las tablas";

    acceptDrawBtn.style.display = "none";
    rejectDrawBtn.style.display = "none";
    offerDrawBtn.disabled = false;
});






// =========================
// ♟️ MOVIMIENTO RECIBIDO
// =========================
socket.on("move", ({ from, to }) => {

    // 🔴 SI HABÍA TABLAS PENDIENTES, SE CANCELAN AL JUGAR
    if (drawPending) {
        drawPending = false;
        acceptDrawBtn.style.display = "none";
        rejectDrawBtn.style.display = "none";
        offerDrawBtn.disabled = false;
    } 
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

    // ✅ 1️⃣ CAMBIAR TURNO PRIMERO (el defensor)
    turn = nextTurn(turn);
    turnoEl.textContent = `Turno: ${turn === "white" ? "Blancas" : "Negras"}`;

    // ✅ 2️⃣ AHORA comprobar jaque / mate
    renderBoard(board, boardEl, onSquareClick, null);
    checkGameStateOnline();


});

//rendición
resignBtn.addEventListener("click", () => {
    if (gameOver || !gameStarted) return;

    socket.emit("resign");
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
    checkGameStateOnline();
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
    if (gameOver) return; 
    if (!gameStarted) return;
    if (myRole !== turn) return;

    // =========================
    // SELECCIÓN
    // =========================
    if (!selected) {
        const piece = board[r][c];
        if (piece && canSelectPiece(piece, myRole)) {
            selected = { r, c };
            renderBoard(board, boardEl, onSquareClick, selected);
        }
        return;
    }

    // =========================
    // INTENTO DE MOVIMIENTO
    // =========================
    const piece = board[selected.r][selected.c];
    const target = board[r][c];
    let result = { valid: false };

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
    else if (piece === "♔" || piece === "♚")
        result = isValidKingMove(board, selected, { r, c }, piece, castlingRights);

    // Click sobre pieza propia → cancelar selección
    if (target && canSelectPiece(target, myRole)) {
        selected = null;
        renderBoard(board, boardEl, onSquareClick, null);
        return;
    }

    // =========================
    // VALIDACIÓN FINAL (JAQUE)
    // =========================
    if (result.valid) {
        const wasInCheck = isKingCurrentlyInCheck(board, myRole);

        const simulatedBoard = cloneBoard(board);
        applyMove(simulatedBoard, selected, { r, c });

        const stillInCheck = kingInCheckAfterMove(simulatedBoard, myRole);

        if (stillInCheck) {
            soundCheck.play();
            selected = null;
            renderBoard(board, boardEl, onSquareClick, null);
            statusEl.textContent = wasInCheck
                ? "❌ Estás en jaque: debes salir del jaque"
                : "❌ Movimiento ilegal: tu rey quedaría en jaque";
            return;
        }

        socket.emit("move", { from: selected, to: { r, c } });
        selected = null;
        return;
    }

    // =========================
    // MOVIMIENTO INVÁLIDO
    // =========================
    selected = null;
    renderBoard(board, boardEl, onSquareClick, null);
}


// =========================
// RENDER INICIAL
// =========================
renderBoard(board, boardEl, onSquareClick, null);
updateStatus();


// Crear sala
document.getElementById("createRoomBtn").addEventListener("click", () => {
    socket.emit("create_room");
});

// Unirse a sala
document.getElementById("joinRoomBtn").addEventListener("click", () => {
    const code = document.getElementById("roomCode").value.trim().toUpperCase();
    if (!code) return;
    socket.emit("join_room", { room: code });
});

socket.on("room_created", ({ room, role }) => {
    currentRoom = room;
    myRole = role;
    inRoom = true;
    gameStarted = false;

    statusEl.textContent = `🏠 Sala creada: ${room} · Esperando rival…`;
});

socket.on("room_joined", ({ room, role }) => {
    currentRoom = room;
    myRole = role;
    inRoom = true;

    statusEl.textContent =
        role === "spectator"
            ? `👀 Espectador en sala ${room}`
            : `♟️ Unido a sala ${room} · Juegas con ${role === "white" ? "BLANCAS" : "NEGRAS"}`;

    if (role === "black") {
        boardEl.classList.add("flipped");
    } else {
        boardEl.classList.remove("flipped");
    }
});



socket.on("room_error", ({ msg }) => {
    alert(msg);
});

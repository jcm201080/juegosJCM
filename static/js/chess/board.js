export const board = [
    ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"],
    ["♟", "♟", "♟", "♟", "♟", "♟", "♟", "♟"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙"],
    ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"],
];

const pieceMap = {
    "♙": "wp",
    "♖": "wr",
    "♘": "wn",
    "♗": "wb",
    "♕": "wq",
    "♔": "wk",

    "♟": "bp",
    "♜": "br",
    "♞": "bn",
    "♝": "bb",
    "♛": "bq",
    "♚": "bk",
};

export function renderBoard(board, boardEl, onSquareClick, selected) {
    boardEl.innerHTML = "";

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = document.createElement("div");
            square.className = `square ${(r + c) % 2 === 0 ? "white" : "black"}`;

            const piece = board[r][c];

            if (piece) {
                const img = document.createElement("img");
                img.src = `/static/img/chess/${pieceMap[piece]}.svg`;
                img.className = "chess-piece";
                img.draggable = false; // evita arrastres raros
                square.appendChild(img);
            }

            // ✅ CASILLA SELECCIONADA
            if (selected && selected.r === r && selected.c === c) {
                square.classList.add("selected");
            }

            square.onclick = () => onSquareClick(r, c);
            boardEl.appendChild(square);
        }
    }
}


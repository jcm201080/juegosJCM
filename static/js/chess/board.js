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

export function renderBoard(board, boardEl, onSquareClick, selected) {
    boardEl.innerHTML = "";

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const square = document.createElement("div");
            square.className = `square ${(r + c) % 2 === 0 ? "white" : "black"}`;
            square.textContent = board[r][c];

            // ♟️ DIFERENCIAR PIEZAS NEGRAS
            if ("♟♜♞♝♛♚".includes(board[r][c])) {
                square.classList.add("black-piece");
            }

            // ✅ MARCAR CASILLA SELECCIONADA
            if (selected && selected.r === r && selected.c === c) {
                square.classList.add("selected");
            }

            square.onclick = () => onSquareClick(r, c);
            boardEl.appendChild(square);
        }
    }
}

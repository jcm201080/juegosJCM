// static/js/tres_en_raya.js
(function () {
    function createBoard(boardEl) {
        boardEl.innerHTML = "";
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement("button");
            cell.className = "ttt-cell";
            cell.type = "button";
            cell.dataset.i = String(i);
            cell.setAttribute("aria-label", `Casilla ${i + 1}`);
            boardEl.appendChild(cell);
        }
    }

    function getWinner(grid) {
        const lines = [
            [0, 1, 2],
            [3, 4, 5],
            [6, 7, 8],
            [0, 3, 6],
            [1, 4, 7],
            [2, 5, 8],
            [0, 4, 8],
            [2, 4, 6],
        ];
        for (const [a, b, c] of lines) {
            if (grid[a] && grid[a] === grid[b] && grid[a] === grid[c]) {
                return { winner: grid[a], line: [a, b, c] };
            }
        }
        return null;
    }

    function isDraw(grid) {
        return grid.every((v) => v);
    }

    function initTicTacToe() {
        const boardEl = document.getElementById("ttt-board");
        if (!boardEl) return;

        const modeEl = document.getElementById("ttt-mode");
        const resetBtn = document.getElementById("ttt-reset");
        const turnEl = document.getElementById("ttt-turn");
        const statusEl = document.getElementById("ttt-status");
        const msgEl = document.getElementById("ttt-message");

        let grid = Array(9).fill("");
        let turn = "X";
        let locked = false;

        function setStatus(text) {
            if (statusEl) statusEl.textContent = text;
        }
        function setTurn(text) {
            if (turnEl) turnEl.textContent = text;
        }
        function setMsg(text) {
            if (msgEl) msgEl.textContent = text;
        }

        function paint() {
            const cells = boardEl.querySelectorAll(".ttt-cell");
            cells.forEach((cell) => {
                const i = Number(cell.dataset.i);
                cell.textContent = grid[i] || "";
                cell.classList.remove("is-x", "is-o");
                if (grid[i] === "X") cell.classList.add("is-x");
                if (grid[i] === "O") cell.classList.add("is-o");
                cell.classList.toggle("disabled", locked || !!grid[i]);
            });
            setTurn(turn);
        }

        function endGame(result) {
            locked = true;
            if (result?.winner) {
                setStatus("Final");
                setMsg(`Ganó ${result.winner} 🎉`);
                // marcar línea ganadora
                const cells = boardEl.querySelectorAll(".ttt-cell");
                result.line.forEach((idx) => cells[idx]?.classList.add("win"));
            } else {
                setStatus("Final");
                setMsg("Empate 😄");
            }
            paint();
        }

        function reset() {
            grid = Array(9).fill("");
            turn = "X";
            locked = false;
            setStatus("Jugando");
            setMsg("¡A jugar!");
            createBoard(boardEl);
            const cells = boardEl.querySelectorAll(".ttt-cell");
            cells.forEach((cell) => cell.addEventListener("click", onClickCell));
            paint();
        }

        function cpuMove() {
            // CPU muy simple: elige la primera casilla libre (luego lo mejoramos)
            const empty = grid.map((v, i) => (v ? -1 : i)).filter((i) => i !== -1);
            if (empty.length === 0) return;
            const i = empty[Math.floor(Math.random() * empty.length)];
            grid[i] = "O";
            const w = getWinner(grid);
            if (w) return endGame(w);
            if (isDraw(grid)) return endGame(null);
            turn = "X";
            paint();
        }

        function onClickCell(ev) {
            if (locked) return;
            const cell = ev.currentTarget;
            const i = Number(cell.dataset.i);
            if (grid[i]) return;

            const mode = modeEl ? modeEl.value : "local";

            grid[i] = turn;
            const w = getWinner(grid);
            if (w) return endGame(w);
            if (isDraw(grid)) return endGame(null);

            if (mode === "local") {
                turn = turn === "X" ? "O" : "X";
                paint();
            } else {
                // vs CPU: X es jugador, O CPU
                turn = "O";
                paint();
                setTimeout(cpuMove, 250);
            }
        }

        if (resetBtn) resetBtn.addEventListener("click", reset);
        if (modeEl) modeEl.addEventListener("change", reset);

        // primera carga
        reset();
    }

    // Exponer inicializador para juegos_en_linea.js
    window.initTicTacToe = initTicTacToe;
})();

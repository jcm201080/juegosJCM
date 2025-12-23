// static/js/cuatro_en_raya.js
(function () {
    const COLS = 7;
    const ROWS = 6;

    function createBoard(boardEl) {
        boardEl.innerHTML = "";
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = document.createElement("div");
                cell.className = "c4-cell";
                cell.dataset.r = String(r);
                cell.dataset.c = String(c);

                const disc = document.createElement("div");
                disc.className = "c4-disc";
                disc.style.visibility = "hidden";
                cell.appendChild(disc);

                boardEl.appendChild(cell);
            }
        }
    }

    function createColumnButtons(colsEl) {
        if (!colsEl) return;
        colsEl.innerHTML = "";
        for (let c = 0; c < COLS; c++) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "c4-col-btn";
            btn.dataset.c = String(c);
            btn.title = `Columna ${c + 1}`;
            colsEl.appendChild(btn);
        }
    }

    function checkWinner(grid) {
        const dirs = [
            [0, 1],
            [1, 0],
            [1, 1],
            [1, -1],
        ];

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const p = grid[r][c];
                if (!p) continue;

                for (const [dr, dc] of dirs) {
                    const cells = [[r, c]];
                    for (let k = 1; k < 4; k++) {
                        const rr = r + dr * k;
                        const cc = c + dc * k;
                        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
                        if (grid[rr][cc] !== p) break;
                        cells.push([rr, cc]);
                    }
                    if (cells.length === 4) return { winner: p, cells };
                }
            }
        }
        return null;
    }

    function isDraw(grid) {
        return grid[0].every((v) => v);
    }

    function initConnect4() {
        const boardEl = document.getElementById("c4-board");
        if (!boardEl) return;

        const colsEl = document.getElementById("c4-columns");
        const modeEl = document.getElementById("c4-mode");
        const resetBtn = document.getElementById("c4-reset");

        const turnEl = document.getElementById("c4-turn");
        const statusEl = document.getElementById("c4-status");
        const msgEl = document.getElementById("c4-message");

        const overlayEl = document.getElementById("c4-overlay");
        const winnerTitleEl = document.getElementById("c4-winner-title");
        const winnerTextEl = document.getElementById("c4-winner-text");
        const playAgainBtn = document.getElementById("c4-play-again");

        let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(""));
        let turn = "R";
        let locked = false;

        function setTurn() {
            if (turnEl) turnEl.textContent = turn === "R" ? "🔴 Rojo" : "🟡 Amarillo";
        }
        function setStatus(text) {
            if (statusEl) statusEl.textContent = text;
        }
        function setMsg(text) {
            if (msgEl) msgEl.textContent = text;
        }

        function hideOverlay() {
            if (overlayEl) overlayEl.classList.add("hidden");
        }
        function showOverlay(text) {
            if (!overlayEl) return;
            if (winnerTitleEl) winnerTitleEl.textContent = "¡Victoria!";
            if (winnerTextEl) winnerTextEl.textContent = text;
            overlayEl.classList.remove("hidden");
        }

        function paint() {
            const cells = boardEl.querySelectorAll(".c4-cell");
            cells.forEach((cell) => {
                const r = Number(cell.dataset.r);
                const c = Number(cell.dataset.c);
                const val = grid[r][c];
                const disc = cell.querySelector(".c4-disc");
                if (!disc) return;

                cell.classList.remove("win");

                if (!val) {
                    disc.style.visibility = "hidden";
                    disc.classList.remove("red", "yellow");
                } else {
                    disc.style.visibility = "visible";
                    disc.classList.toggle("red", val === "R");
                    disc.classList.toggle("yellow", val === "Y");
                }
            });

            setTurn();
        }

        function dropDisc(col) {
            if (locked) return false;
            for (let r = ROWS - 1; r >= 0; r--) {
                if (!grid[r][col]) {
                    grid[r][col] = turn;
                    return true;
                }
            }
            return false;
        }

        function markWinCells(winCells) {
            winCells.forEach(([r, c]) => {
                const cell = boardEl.querySelector(`.c4-cell[data-r="${r}"][data-c="${c}"]`);
                if (cell) cell.classList.add("win");
            });
        }

        function endGame(winnerInfo) {
            locked = true;
            setStatus("Final");

            if (winnerInfo?.winner) {
                const who = winnerInfo.winner === "R" ? "🔴 Rojo" : "🟡 Amarillo";
                markWinCells(winnerInfo.cells);
                setMsg(`Ganó ${who} 🎉`);
                showOverlay(`Ganó ${who}. ¡Revancha!`);
            } else {
                setMsg("Empate 😄");
                showOverlay("Empate. Nadie gana, pero nadie pierde (mentira, todos pierden).");
            }

            paint();
        }

        function cpuMove() {
            const valid = [];
            for (let c = 0; c < COLS; c++) if (!grid[0][c]) valid.push(c);
            if (valid.length === 0) return;

            const col = valid[Math.floor(Math.random() * valid.length)];
            dropDisc(col);

            const w = checkWinner(grid);
            if (w) return endGame(w);
            if (isDraw(grid)) return endGame(null);

            turn = "R";
            paint();
        }

        function onPlay(col) {
            const mode = modeEl ? modeEl.value : "local";
            const ok = dropDisc(col);
            if (!ok) return;

            const w = checkWinner(grid);
            if (w) return endGame(w);
            if (isDraw(grid)) return endGame(null);

            if (mode === "local") {
                turn = turn === "R" ? "Y" : "R";
                paint();
            } else {
                turn = "Y";
                paint();
                setTimeout(cpuMove, 250);
            }
        }

        function wireEvents() {
            if (colsEl) {
                colsEl.querySelectorAll(".c4-col-btn").forEach((btn) => {
                    btn.addEventListener("click", () => {
                        if (locked) return;
                        const col = Number(btn.dataset.c);
                        onPlay(col);
                    });
                });
            }

            boardEl.addEventListener("click", (ev) => {
                if (locked) return;
                const cell = ev.target.closest(".c4-cell");
                if (!cell) return;
                const col = Number(cell.dataset.c);
                onPlay(col);
            });

            if (resetBtn) resetBtn.addEventListener("click", reset);
            if (modeEl) modeEl.addEventListener("change", reset);
            if (playAgainBtn) playAgainBtn.addEventListener("click", reset);
        }

        function reset() {
            grid = Array.from({ length: ROWS }, () => Array(COLS).fill(""));
            turn = "R";
            locked = false;
            hideOverlay();
            setStatus("Jugando");
            setMsg("¡A jugar!");
            createColumnButtons(colsEl);
            createBoard(boardEl);
            wireEvents();
            paint();
        }

        reset();
    }

    // ✅ Esto es lo que te falta:
    window.initConnect4 = initConnect4;
    document.addEventListener("DOMContentLoaded", initConnect4);
})();

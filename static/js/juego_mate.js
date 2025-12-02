// static/js/juego_mate.js
// Lógica del Juego de Cálculo Rápido integrada con el sistema de usuarios global (window.JCM_USER)

console.log("juego_mate.js cargado ✅");

// =========================
//   Estado del juego
// =========================
let timeLeft = 60;
let score = 0;
let timerId = null;
let gameActive = false;
let correctAnswer = null;
let currentLevel = 1;
let currentOperation = null; // "+", "-", "×", "÷", "eq", "eq2"

// Usuario actual (viene de auth.js → window.JCM_USER)
let currentUser = window.JCM_USER || null;

// =========================
//   Referencias DOM
// =========================
const timeSpan = document.getElementById("time");
const scoreSpan = document.getElementById("score");
const questionBox = document.getElementById("question");
const messageBox = document.getElementById("message");
const startBtn = document.getElementById("startBtn");
const answerButtons = document.querySelectorAll(".answer");
const levelSelect = document.getElementById("levelSelect");
const levelDescription = document.getElementById("levelDescription");

// Panel de usuario del juego
const gameUserGuest = document.getElementById("gameUserGuest");
const gameUserLogged = document.getElementById("gameUserLogged");
const currentUserNameSpan = document.getElementById("currentUserName");
const currentUserBestScoreSpan = document.getElementById("currentUserBestScore");
const currentUserTotalScoreSpan = document.getElementById("currentUserTotalScore");
const currentUserLevelBestScoreSpan = document.getElementById("currentUserLevelBestScore");

// Ranking + historial
const globalRankingList = document.getElementById("globalRankingList");
const levelRankingList = document.getElementById("levelRankingList");
const levelRankingTitle = document.getElementById("levelRankingTitle");
const historyList = document.getElementById("historyList");
const showHistoryBtn = document.getElementById("showHistoryBtn");

// Sonidos
const soundCorrect = document.getElementById("soundCorrect");
const soundWrong = document.getElementById("soundWrong");
const soundEnd = document.getElementById("soundEnd");

// =========================
//   Utilidades
// =========================
function setText(el, value) {
    if (el) el.textContent = value;
}

function playSound(audioEl) {
    if (!audioEl) return;
    try {
        audioEl.currentTime = 0;
        audioEl.play().catch(() => {});
    } catch (e) {
        console.warn("No se pudo reproducir el sonido:", e);
    }
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function formatDateTime(str) {
    if (!str) return "";
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// =========================
//   Configuración niveles
// =========================
function getConfigForLevel(level) {
    switch (level) {
        case 1:
            return { min: 1, max: 10, operations: ["+"] };
        case 2:
            return { min: 1, max: 10, operations: ["+", "-"] };
        case 3:
            return { min: 1, max: 20, operations: ["+", "-"] };
        case 4:
            return { min: 1, max: 20, operations: ["+", "-", "×"] };
        case 5:
        default:
            return { min: 1, max: 40, operations: ["+", "-", "×", "÷"] };
    }
}

function getTimeForLevel(level) {
    if (level <= 4) return 60;
    if (level === 5) return 90;
    if (level === 6) return 120;
    if (level === 7) return 200;
    return 60;
}

function getDescriptionForLevel(level) {
    const seconds = getTimeForLevel(level);
    switch (level) {
        case 1:
            return `Modo fácil: solo sumas con números pequeños. (${seconds}s)`;
        case 2:
            return `Sumas y restas, pero nunca salen resultados negativos. 🧸 (${seconds}s)`;
        case 3:
            return `Sumas y restas hasta 20. Ya hay que pensar un poco más. 💪 (${seconds}s)`;
        case 4:
            return `Tablas de multiplicar: velocidad y memoria a prueba. ✖️ (${seconds}s)`;
        case 5:
            return `Operaciones mixtas (+ − × ÷). Modo calculadora humana. 🤖 (${seconds}s)`;
        case 6:
            return `Ecuaciones de 1º grado: encuentra el valor de x. 🧠 (${seconds}s)`;
        case 7:
            return `Ecuaciones de 2º grado: nivel matemático legendario. 🏆 (${seconds}s)`;
        default:
            return "Elige un nivel para empezar la partida.";
    }
}

function getPointsForCurrentOperation() {
    switch (currentOperation) {
        case "+":
        case "-":
            return 3;
        case "×":
            return 5;
        case "÷":
            return 8;
        case "eq":
            return 10;
        case "eq2":
            return 15;
        default:
            return 3;
    }
}

// =========================
//   Panel usuario del juego
// =========================
function updateGameUserPanel(extraStats = {}) {
    if (!gameUserGuest || !gameUserLogged) return;
    const user = currentUser;

    if (!user) {
        gameUserGuest.classList.remove("hidden");
        gameUserLogged.classList.add("hidden");
        return;
    }

    gameUserGuest.classList.add("hidden");
    gameUserLogged.classList.remove("hidden");

    if (currentUserNameSpan) currentUserNameSpan.textContent = user.username;

    if (currentUserBestScoreSpan) {
        const best = extraStats.best_score ?? user.best_score ?? 0;
        currentUserBestScoreSpan.textContent = best;
    }
    if (currentUserTotalScoreSpan) {
        const total = extraStats.total_score ?? user.total_score ?? 0;
        currentUserTotalScoreSpan.textContent = total;
    }
    if (currentUserLevelBestScoreSpan) {
        const lvlBest =
            extraStats.level_best ??
            (currentUserLevelBestScoreSpan.textContent || 0);
        currentUserLevelBestScoreSpan.textContent = lvlBest;
    }
}

function syncCurrentUser(fromDetailUser) {
    if (fromDetailUser !== undefined) {
        currentUser = fromDetailUser;
    } else {
        currentUser = window.JCM_USER || null;
    }
    updateGameUserPanel();
}

// Usuario inicial
syncCurrentUser();

// Escuchar cambios de login global (auth.js)
window.addEventListener("jcm:user-changed", (ev) => {
    const user = ev.detail ? ev.detail.user : null;
    console.log("👤 Evento jcm:user-changed recibido en game.js:", user);
    syncCurrentUser(user);
});

// =========================
//   Generación de preguntas
// =========================
function generateAnswers(correct) {
    const answers = new Set();
    answers.add(correct);
    const isDecimal = !Number.isInteger(correct);

    if (!isDecimal) {
        while (answers.size < 4) {
            const offset = getRandomInt(-10, 10);
            const candidate = correct + offset;
            if (candidate !== correct && candidate >= -100 && candidate <= 999) {
                answers.add(candidate);
            }
        }
    } else {
        while (answers.size < 4) {
            const offset = getRandomInt(-10, 10);
            if (offset === 0) continue;
            let candidate = correct + offset / 10;
            candidate = +candidate.toFixed(1);
            if (candidate <= 0 || candidate === correct) continue;
            answers.add(candidate);
        }
    }

    const arr = Array.from(answers);
    shuffleArray(arr);
    return arr;
}

function generateEquationQuestion() {
    currentOperation = "eq";
    let x = getRandomInt(1, 20);
    let a, b, c, pattern, text;

    pattern = getRandomInt(1, 4);
    switch (pattern) {
        case 1:
            b = getRandomInt(1, 15);
            c = x + b;
            text = `x + ${b} = ${c}`;
            break;
        case 2:
            b = getRandomInt(1, Math.min(x, 10));
            c = x - b;
            text = `x - ${b} = ${c}`;
            break;
        case 3:
            a = getRandomInt(2, 9);
            c = a * x;
            text = `${a}x = ${c}`;
            break;
        case 4:
        default:
            a = getRandomInt(2, 5);
            b = getRandomInt(1, 10);
            c = a * x + b;
            text = `${a}x + ${b} = ${c}`;
            break;
    }

    correctAnswer = x;
    setText(questionBox, `Resuelve: ${text}   (¿cuánto vale x?)`);

    const answers = generateAnswers(x);
    answerButtons.forEach((btn, index) => {
        const val = answers[index];
        const textVal = String(val);
        btn.textContent = textVal;
        btn.dataset.value = textVal;
    });
}

function generateQuadraticQuestion() {
    currentOperation = "eq2";
    const r = getRandomInt(1, 10);
    const b = -2 * r;
    const c = r * r;

    const bStr = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
    const cStr = c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`;
    const text = `x² ${bStr}x ${cStr} = 0`;

    correctAnswer = r;
    setText(questionBox, `Resuelve: ${text}   (¿cuánto vale x?)`);

    const answers = generateAnswers(r);
    answerButtons.forEach((btn, index) => {
        const val = answers[index];
        const textVal = String(val);
        btn.textContent = textVal;
        btn.dataset.value = textVal;
    });
}

function generateQuestion() {
    if (!gameActive) return;

    if (currentLevel === 6) {
        generateEquationQuestion();
        return;
    }

    if (currentLevel === 7) {
        generateQuadraticQuestion();
        return;
    }

    const config = getConfigForLevel(currentLevel);
    let a, b, result, text;
    const operations = config.operations;
    const op = operations[getRandomInt(0, operations.length - 1)];
    currentOperation = op;

    if (currentLevel === 5 && op === "÷") {
        const divisor = getRandomInt(2, 9);
        let dividend;
        do {
            dividend = getRandomInt(10, 99);
        } while (dividend % divisor === 0);
        result = parseFloat((dividend / divisor).toFixed(1));
        text = `${dividend} ÷ ${divisor}`;
    } else {
        if (op === "-" && currentLevel === 2) {
            a = getRandomInt(config.min, config.max);
            b = getRandomInt(config.min, a);
        } else {
            a = getRandomInt(config.min, config.max);
            b = getRandomInt(config.min, config.max);
        }

        switch (op) {
            case "+":
                result = a + b;
                text = `${a} + ${b}`;
                break;
            case "-":
                result = a - b;
                text = `${a} - ${b}`;
                break;
            case "×":
                result = a * b;
                text = `${a} × ${b}`;
                break;
            default:
                const divisor2 = getRandomInt(2, 9);
                const dividend2 = getRandomInt(10, 99);
                result = parseFloat((dividend2 / divisor2).toFixed(1));
                text = `${dividend2} ÷ ${divisor2}`;
                currentOperation = "÷";
                break;
        }
    }

    correctAnswer = result;
    setText(questionBox, `¿Cuánto es ${text}?`);

    const answers = generateAnswers(result);
    const isDecimal = !Number.isInteger(result);

    answerButtons.forEach((btn, index) => {
        const val = answers[index];
        const textVal = isDecimal ? val.toFixed(1) : String(val);
        btn.textContent = textVal;
        btn.dataset.value = textVal;
    });
}

// =========================
//   Inicio / fin partida
// =========================
function startGame() {
    console.log("▶️ startGame llamado");
    timeLeft = getTimeForLevel(currentLevel);
    score = 0;
    gameActive = true;
    correctAnswer = null;

    setText(messageBox, "");
    if (messageBox) messageBox.style.color = "";
    setText(scoreSpan, score);
    setText(timeSpan, timeLeft);
    setText(questionBox, "Preparando la primera operación...");

    if (startBtn) startBtn.textContent = "Reiniciar partida";

    generateQuestion();

    if (timerId) clearInterval(timerId);
    timerId = setInterval(() => {
        timeLeft--;
        setText(timeSpan, timeLeft);
        if (timeLeft <= 0) endGame();
    }, 1000);
}

function endGame() {
    gameActive = false;
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
    }

    setText(questionBox, "⏰ Tiempo agotado");
    if (messageBox) {
        messageBox.textContent = `Tu puntuación final es: ${score} puntos`;
        messageBox.style.color = "#fff";
    }
    playSound(soundEnd);

    if (currentUser) {
        sendScoreToServer(score);
    }
}

// =========================
//   Ranking + historial
// =========================
function renderRanking(ranking, targetElement) {
    if (!targetElement) return;
    targetElement.innerHTML = "";
    ranking.forEach((item, index) => {
        const games = item.games_played ?? "–";
        const li = document.createElement("li");
        li.textContent = `${index + 1}. ${item.username} — ${item.best_score} puntos (partidas: ${games})`;
        targetElement.appendChild(li);
    });
}

async function loadGlobalRanking() {
    try {
        const res = await fetch(`${window.location.origin}/api/ranking`);
        const data = await res.json();
        if (data.success && data.ranking) {
            renderRanking(data.ranking, globalRankingList);
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadLevelRanking(level) {
    try {
        const res = await fetch(`${window.location.origin}/api/ranking?level=${level}`);
        const data = await res.json();
        if (data.success && data.ranking) {
            if (levelRankingTitle) setText(levelRankingTitle, `Nivel ${level}`);
            renderRanking(data.ranking, levelRankingList);
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadUserHistory() {
    if (!currentUser || !historyList) return;
    try {
        const res = await fetch(`${window.location.origin}/api/history/${currentUser.id}`);
        const data = await res.json();
        if (!data.success) return;

        historyList.innerHTML = "";
        if (!data.history.length) {
            const li = document.createElement("li");
            li.textContent = "No hay partidas registradas todavía.";
            historyList.appendChild(li);
            return;
        }

        data.history.forEach((item) => {
            const li = document.createElement("li");
            li.textContent = `Nivel ${item.level} — ${item.score} puntos — ${formatDateTime(item.created_at)}`;
            historyList.appendChild(li);
        });
    } catch (err) {
        console.error(err);
    }
}

// =========================
//   Guardar puntuación
// =========================
async function sendScoreToServer(scoreValue) {
    if (!currentUser) return;
    try {
        const res = await fetch(`${window.location.origin}/api/score`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: currentUser.id,
                score: scoreValue,
                level: currentLevel
            }),
        });
        const data = await res.json();
        if (!data.success) {
            console.warn("No se pudo guardar el score:", data.error);
            return;
        }

        currentUser.best_score = data.best_score;
        currentUser.total_score = data.total_score;

        let bestForLevel = 0;
        if (data.per_level_best) {
            bestForLevel = data.per_level_best[currentLevel] ?? 0;
        }

        updateGameUserPanel({
            best_score: data.best_score,
            total_score: data.total_score,
            level_best: bestForLevel
        });

        loadGlobalRanking();
        loadLevelRanking(currentLevel);
    } catch (err) {
        console.error(err);
    }
}

// =========================
//   Listeners
// =========================
if (startBtn) {
    console.log("Enganchando listener al botón Empezar:", startBtn);
    startBtn.addEventListener("click", startGame);
} else {
    console.warn("No se encontró startBtn en el DOM");
}

answerButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
        if (!gameActive) return;
        const clickedValue = Number(e.target.dataset.value);
        if (clickedValue === correctAnswer) {
            const gained = getPointsForCurrentOperation();
            score += gained;
            if (messageBox) {
                messageBox.textContent = `✅ ¡Correcto! +${gained} puntos`;
                messageBox.style.color = "limegreen";
            }
            playSound(soundCorrect);
        } else {
            score -= 5;
            if (score < 0) score = 0;
            if (messageBox) {
                messageBox.textContent = `❌ Incorrecto. La respuesta correcta era ${correctAnswer}.`;
                messageBox.style.color = "crimson";
            }
            playSound(soundWrong);
        }
        setText(scoreSpan, score);
        generateQuestion();
    });
});

if (levelSelect) {
    currentLevel = Number(levelSelect.value) || 1;
    setText(levelDescription, getDescriptionForLevel(currentLevel));
    setText(timeSpan, getTimeForLevel(currentLevel));

    levelSelect.addEventListener("change", (e) => {
        currentLevel = Number(e.target.value) || 1;
        setText(levelDescription, getDescriptionForLevel(currentLevel));
        setText(timeSpan, getTimeForLevel(currentLevel));
        loadLevelRanking(currentLevel);
    });
}

if (showHistoryBtn && historyList) {
    showHistoryBtn.addEventListener("click", () => {
        if (!currentUser) {
            alert("Inicia sesión para ver tu historial.");
            return;
        }
        const hidden =
            historyList.style.display === "none" ||
            historyList.style.display === "";
        historyList.style.display = hidden ? "block" : "none";
        if (hidden) loadUserHistory();
    });
}

// =========================
//   Inicialización
// =========================
loadGlobalRanking();       // Ranking global visible siempre
if (levelSelect) {
    loadLevelRanking(currentLevel);
}

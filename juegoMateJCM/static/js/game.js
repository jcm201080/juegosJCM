// js/game.js

// === Estado del juego ===
let timeLeft = 60;
let score = 0;
let timerId = null;
let gameActive = false;
let correctAnswer = null;
let currentLevel = 1;

// Usuario actual (si está logueado)
let currentUser = null;

// URL base del backend Flask
const API_BASE = window.location.origin;

// Operación actual: "+", "-", "×", "÷", "eq", "eq2"
let currentOperation = null;

// ============================
//   Referencias al DOM (juego)
// ============================
const timeSpan = document.getElementById("time");
const scoreSpan = document.getElementById("score");
const questionBox = document.getElementById("question");
const messageBox = document.getElementById("message");
const startBtn = document.getElementById("startBtn");
const answerButtons = document.querySelectorAll(".answer");
const levelSelect = document.getElementById("levelSelect");

const levelDescription = document.getElementById("levelDescription");
const logoutBtn = document.getElementById("logoutBtn");

// ============================
//   Referencias al DOM (auth + ranking + historial)
// ============================
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const authMessage = document.getElementById("authMessage");
const authSection = document.getElementById("authSection");
const userInfo = document.getElementById("userInfo");
const currentUserName = document.getElementById("currentUserName");
const currentUserBestScore = document.getElementById("currentUserBestScore");

// Ranking global y por nivel
const globalRankingList = document.getElementById("globalRankingList");
const levelRankingList = document.getElementById("levelRankingList");
const levelRankingTitle = document.getElementById("levelRankingTitle");

// Historial
const historyList = document.getElementById("historyList");
const showHistoryBtn = document.getElementById("showHistoryBtn");

// 🔹 Spans extra (pueden no existir, por eso los tratamos con cuidado)
const currentUserTotalScore = document.getElementById("currentUserTotalScore");
const currentUserLevelBestScore = document.getElementById("currentUserLevelBestScore");

// ============================
//   Referencias a sonidos (pueden ser null si no están en el HTML)
// ============================
const soundCorrect = document.getElementById("soundCorrect");
const soundWrong = document.getElementById("soundWrong");
const soundEnd = document.getElementById("soundEnd");

// Utilidad para poner texto de forma segura
function setText(el, value) {
    if (el) el.textContent = value;
}

// Utilidad para mostrar/ocultar secciones si existen
function setDisplay(el, value) {
    if (el && el.style) el.style.display = value;
}

// ============================
//   Configuración por nivel
//   (1 a 5 usan operaciones normales)
//   6 y 7 son ecuaciones (gestionadas aparte)
// ============================
function getConfigForLevel(level) {
    switch (level) {
        case 1: // Original: sumas 1–10
            return {
                min: 1,
                max: 10,
                operations: ["+"]
            };
        case 2: // NUEVO: sumas y restas, pero restas siempre con resultado >= 0
            return {
                min: 1,
                max: 10,
                operations: ["+", "-"]
            };
        case 3: // Antiguo nivel 2: sumas y restas 1–20
            return {
                min: 1,
                max: 20,
                operations: ["+", "-"]
            };
        case 4: // Antiguo nivel 3: sumas, restas y multiplicaciones
            return {
                min: 1,
                max: 20,
                operations: ["+", "-", "×"]
            };
        case 5: // Antiguo nivel 4: experto operaciones mixtas
        default:
            return {
                min: 1,
                max: 40,
                operations: ["+", "-", "×", "÷"]
            };
    }
}

// ============================
//   Descripción textual por nivel (incluye tiempo)
// ============================
function getDescriptionForLevel(level) {
    const seconds = getTimeForLevel(level);  // usamos la misma lógica de tiempos

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

function updateLevelDescription() {
    if (!levelDescription) return;
    const desc = getDescriptionForLevel(currentLevel);
    levelDescription.textContent = desc;
}

// ============================
//   Sonido
// ============================
function playSound(audioEl) {
    if (!audioEl) return;
    try {
        audioEl.currentTime = 0;
        audioEl.play().catch(() => {});
    } catch (e) {
        console.warn("No se pudo reproducir el sonido:", e);
    }
}

function playCorrectSound() {
    playSound(soundCorrect);
}

function playWrongSound() {
    playSound(soundWrong);
}

function playEndSound() {
    playSound(soundEnd);
}

// ============================
//   Tiempo por nivel
// ============================
function getTimeForLevel(level) {
    if (level <= 4) return 60;
    if (level === 5) return 90;
    if (level === 6) return 120;
    if (level === 7) return 200;
    return 60; // fallback
}

// ============================
//   Juego: iniciar partida
// ============================
function startGame() {
    // Tiempo según el nivel actual
    timeLeft = getTimeForLevel(currentLevel);

    score = 0;
    gameActive = true;
    correctAnswer = null;

    setText(messageBox, "");
    if (messageBox) messageBox.style.color = "";
    if (scoreSpan) scoreSpan.textContent = score;
    if (timeSpan) timeSpan.textContent = timeLeft;

    setText(questionBox, "Preparando la primera operación...");

    if (startBtn) startBtn.textContent = "Reiniciar partida";

    generateQuestion();

    if (timerId) {
        clearInterval(timerId);
    }

    timerId = setInterval(() => {
        timeLeft--;
        if (timeSpan) timeSpan.textContent = timeLeft;

        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

// ============================
//   Juego: finalizar partida
// ============================
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

    playEndSound();

    // Si hay usuario logueado → enviar score al backend
    if (currentUser) {
        sendScoreToServer(score);
    }
}

// ======================================
//   Juego: generar pregunta (según nivel)
// ======================================
function generateQuestion() {
    if (!gameActive) return;

    // 🔹 Nivel 6: ecuaciones de primer grado
    if (currentLevel === 6) {
        generateEquationQuestion();
        return;
    }

    // 🔹 Nivel 7: ecuaciones de segundo grado
    if (currentLevel === 7) {
        generateQuadraticQuestion();
        return;
    }

    // 🔹 Niveles 1–5: operaciones normales
    const config = getConfigForLevel(currentLevel);

    let a, b;
    let result;
    let text;

    // Elegimos operación
    const operations = config.operations;
    const op = operations[getRandomInt(0, operations.length - 1)];
    currentOperation = op;

    if (currentLevel === 5 && op === "÷") {
        // Nivel EXPERTO (5): divisiones con enteros pero resultado con 1 decimal
        const divisor = getRandomInt(2, 9);

        let dividend;
        do {
            dividend = getRandomInt(10, 99);
        } while (dividend % divisor === 0); // evitamos enteros exactos

        result = parseFloat((dividend / divisor).toFixed(1));
        text = `${dividend} ÷ ${divisor}`;
    } else {
        // Niveles 1–4 y operaciones no división en nivel experto

        if (op === "-" && currentLevel === 2) {
            // ➕➖ Nivel 2: restas pero resultado >= 0
            a = getRandomInt(config.min, config.max);
            b = getRandomInt(config.min, a); // b <= a, así a - b nunca es negativo
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
                // Fallback por si acaso cae una división fuera de experto
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

    // Generar respuestas (1 correcta + 3 falsas)
    const answers = generateAnswers(result);
    const isDecimal = !Number.isInteger(result);

    answerButtons.forEach((btn, index) => {
        const val = answers[index];
        const textVal = isDecimal ? val.toFixed(1) : String(val);
        btn.textContent = textVal;
        btn.dataset.value = textVal;
    });
}

// ======================================
//   Nivel 6: generación de ecuaciones (1er grado)
// ======================================
function generateEquationQuestion() {
    currentOperation = "eq"; // para la puntuación

    // x estará siempre entre 1 y 20
    let x = getRandomInt(1, 20);
    let a, b, c, pattern, text;

    // Elegimos tipo de ecuación:
    // 1) x + b = c
    // 2) x - b = c
    // 3) a·x = c
    // 4) a·x + b = c
    pattern = getRandomInt(1, 4);

    switch (pattern) {
        case 1: // x + b = c
            b = getRandomInt(1, 15);
            c = x + b;
            text = `x + ${b} = ${c}`;
            break;

        case 2: // x - b = c (nos aseguramos c >= 0)
            b = getRandomInt(1, Math.min(x, 10));
            c = x - b;
            text = `x - ${b} = ${c}`;
            break;

        case 3: // a·x = c
            a = getRandomInt(2, 9);
            c = a * x;
            text = `${a}x = ${c}`;
            break;

        case 4: // a·x + b = c
        default:
            a = getRandomInt(2, 5);
            b = getRandomInt(1, 10);
            c = a * x + b;
            text = `${a}x + ${b} = ${c}`;
            break;
    }

    correctAnswer = x;
    setText(questionBox, `Resuelve: ${text}   (¿cuánto vale x?)`);

    // Generar respuestas (enteros)
    const answers = generateAnswers(x);
    answerButtons.forEach((btn, index) => {
        const val = answers[index];
        const textVal = String(val);
        btn.textContent = textVal;
        btn.dataset.value = textVal;
    });
}

// ======================================
//   Nivel 7: ecuaciones de segundo grado
// ======================================
function generateQuadraticQuestion() {
    currentOperation = "eq2"; // para la puntuación de nivel avanzado

    // Raíz entera positiva
    const r = getRandomInt(1, 10);

    // Ecuación: (x - r)^2 = 0 -> x^2 - 2rx + r^2 = 0
    const b = -2 * r;
    const c = r * r;

    const bStr = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
    const cStr = c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`;

    const text = `x² ${bStr}x ${cStr} = 0`;

    correctAnswer = r;
    setText(questionBox, `Resuelve: ${text}   (¿cuánto vale x?)`);

    // Generar respuestas (enteros)
    const answers = generateAnswers(r);
    answerButtons.forEach((btn, index) => {
        const val = answers[index];
        const textVal = String(val);
        btn.textContent = textVal;
        btn.dataset.value = textVal;
    });
}

// ======================================
//   Generar respuestas alternativas
// ======================================
function generateAnswers(correct) {
    const answers = new Set();
    answers.add(correct);

    const isDecimal = !Number.isInteger(correct);

    if (!isDecimal) {
        // Modo entero
        while (answers.size < 4) {
            const offset = getRandomInt(-10, 10);
            const candidate = correct + offset;

            if (candidate !== correct && candidate >= -100 && candidate <= 999) {
                answers.add(candidate);
            }
        }
    } else {
        // Modo decimal (una cifra decimal en la correcta)
        while (answers.size < 4) {
            const offset = getRandomInt(-10, 10); // -1.0 a +1.0
            if (offset === 0) continue;

            let candidate = correct + offset / 10;
            candidate = +candidate.toFixed(1); // 1 decimal

            if (candidate <= 0) continue;
            if (candidate === correct) continue;

            answers.add(candidate);
        }
    }

    const answersArray = Array.from(answers);
    shuffleArray(answersArray);
    return answersArray;
}

// ============================
//   Puntuación según operación
// ============================
function getPointsForCurrentOperation() {
    switch (currentOperation) {
        case "+":
        case "-":
            return 3;   // sumas y restas
        case "×":
            return 5;   // multiplicaciones
        case "÷":
            return 8;   // divisiones
        case "eq":
            return 10;  // ecuaciones 1er grado
        case "eq2":
            return 15;  // ecuaciones 2º grado, más difíciles
        default:
            return 3;
    }
}

// ============================
//   Click en respuesta
// ============================
function handleAnswerClick(event) {
    if (!gameActive) return;

    const clickedValue = Number(event.target.dataset.value);

    if (clickedValue === correctAnswer) {
        // Acierto con puntos según operación
        const gained = getPointsForCurrentOperation();
        score += gained;
        if (messageBox) {
            messageBox.textContent = `✅ ¡Correcto! +${gained} puntos`;
            messageBox.style.color = "limegreen";
        }
        playCorrectSound();
    } else {
        score -= 5;
        if (score < 0) score = 0;
        if (messageBox) {
            messageBox.textContent = `❌ Incorrecto. La respuesta correcta era ${correctAnswer}.`;
            messageBox.style.color = "crimson";
        }
        playWrongSound();
    }

    if (scoreSpan) scoreSpan.textContent = score;
    generateQuestion();
}

// =======================
//   Funciones auxiliares
// =======================
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// =======================
//   Auth: UI helpers
// =======================
function setLoggedInUser(user) {
    currentUser = user;
    setDisplay(authSection, "none");
    setDisplay(userInfo, "block");
    setText(currentUserName, user.username);
    setText(currentUserBestScore, user.best_score ?? 0);
    setText(currentUserTotalScore, user.total_score ?? 0);
    setText(currentUserLevelBestScore, "-");
    if (authMessage) authMessage.textContent = "";
}

function setLoggedOut() {
    currentUser = null;
    setDisplay(authSection, "block");
    setDisplay(userInfo, "none");
    setText(currentUserName, "");
    setText(currentUserBestScore, 0);
    setText(currentUserTotalScore, 0);
    setText(currentUserLevelBestScore, "-");
    if (historyList) {
        historyList.style.display = "none";
        historyList.innerHTML = "";
    }
}

// =======================
//   Auth: llamadas API
// =======================
async function registerUser() {
    const username = usernameInput ? usernameInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    if (!username || !password) {
        if (authMessage) {
            authMessage.textContent = "Usuario y contraseña obligatorios";
            authMessage.style.color = "orange";
        }
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (!data.success) {
            if (authMessage) {
                authMessage.textContent = data.error || "Error en el registro";
                authMessage.style.color = "crimson";
            }
            return;
        }

        if (authMessage) {
            authMessage.textContent = "✅ Registro correcto. Sesión iniciada.";
            authMessage.style.color = "limegreen";
        }
        setLoggedInUser(data.user);

    } catch (err) {
        console.error(err);
        if (authMessage) {
            authMessage.textContent = "Error de conexión con el servidor";
            authMessage.style.color = "crimson";
        }
    }
}

async function loginUser() {
    const username = usernameInput ? usernameInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    if (!username || !password) {
        if (authMessage) {
            authMessage.textContent = "Usuario y contraseña obligatorios";
            authMessage.style.color = "orange";
        }
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (!data.success) {
            if (authMessage) {
                authMessage.textContent = data.error || "Error al iniciar sesión";
                authMessage.style.color = "crimson";
            }
            return;
        }

        if (authMessage) {
            authMessage.textContent = "✅ Login correcto.";
            authMessage.style.color = "limegreen";
        }
        setLoggedInUser(data.user);

    } catch (err) {
        console.error(err);
        if (authMessage) {
            authMessage.textContent = "Error de conexión con el servidor";
            authMessage.style.color = "crimson";
        }
    }
}

// =======================
//   Enviar score al servidor
// =======================
async function sendScoreToServer(scoreValue) {
    if (!currentUser) return;

    try {
        const res = await fetch(`${API_BASE}/api/score`, {
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

        // Actualizar datos del usuario
        currentUser.best_score = data.best_score;
        currentUser.total_score = data.total_score;

        setText(currentUserBestScore, data.best_score);
        setText(currentUserTotalScore, data.total_score);

        // Mejor puntuación en el nivel actual
        if (data.per_level_best) {
            const bestForLevel = data.per_level_best[currentLevel] ?? 0;
            setText(currentUserLevelBestScore, bestForLevel);
        }

        // 🔹 Actualizar rankings
        loadGlobalRanking();
        loadLevelRanking(currentLevel);

    } catch (err) {
        console.error(err);
    }
}

// =======================
//   Ranking
// =======================
function renderRanking(ranking, targetElement) {
    if (!targetElement) return;
    targetElement.innerHTML = "";

    ranking.forEach((item, index) => {
        const games = item.games_played ?? "–";  // por si viene sin este dato
        const li = document.createElement("li");
        li.textContent = `${index + 1}. ${item.username} — ${item.best_score} puntos (partidas: ${games})`;
        targetElement.appendChild(li);
    });
}

async function loadGlobalRanking() {
    try {
        const res = await fetch(`${API_BASE}/api/ranking`);
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
        const res = await fetch(`${API_BASE}/api/ranking?level=${level}`);
        const data = await res.json();
        if (data.success && data.ranking) {
            if (levelRankingTitle) {
                levelRankingTitle.textContent = `Nivel ${level}`;
            }
            renderRanking(data.ranking, levelRankingList);
        }
    } catch (err) {
        console.error(err);
    }
}

// =======================
//   Historial usuario
// =======================
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

async function loadUserHistory() {
    if (!currentUser || !historyList) return;

    try {
        const res = await fetch(`${API_BASE}/api/history/${currentUser.id}`);
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

// =======================
//   Listeners iniciales
// =======================
if (startBtn) {
    startBtn.addEventListener("click", startGame);
}

answerButtons.forEach((btn) => {
    btn.addEventListener("click", handleAnswerClick);
});

if (levelSelect) {
    // Al cargar, sincronizamos currentLevel con el select
    currentLevel = Number(levelSelect.value) || 1;
    updateLevelDescription();

    levelSelect.addEventListener("change", (e) => {
        currentLevel = Number(e.target.value);

        // 🔹 Actualizar descripción
        updateLevelDescription();

        // 🔹 Mostrar el tiempo correspondiente al nivel
        const t = getTimeForLevel(currentLevel);
        if (timeSpan) timeSpan.textContent = t;

        // 🔹 Actualizar ranking por nivel
        loadLevelRanking(currentLevel);
    });
}

if (loginBtn) {
    loginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        loginUser();
    });
}

if (registerBtn) {
    registerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        registerUser();
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        setLoggedOut();
    });
}

if (showHistoryBtn && historyList) {
    showHistoryBtn.addEventListener("click", () => {
        if (!currentUser) {
            alert("Inicia sesión para ver tu historial.");
            return;
        }

        if (historyList.style.display === "none" || historyList.style.display === "") {
            historyList.style.display = "block";
            loadUserHistory();
        } else {
            historyList.style.display = "none";
        }
    });
}

// Cargar rankings al inicio
loadGlobalRanking();
loadLevelRanking(currentLevel);

// static/js/english_games.js
document.addEventListener("DOMContentLoaded", () => {
    // === Estado del juego ===
    let lives = 3;
    let score = 0;
    let currentLevel = 1;
    let time = 0;
    let timerId = null;
    let remainingPairs = 0;

    // === Colores base (15) ===
    const BASE_COLORS = [
        { id: "red",      word: "red",        color: "#e74c3c" },
        { id: "blue",     word: "blue",       color: "#3498db" },
        { id: "yellow",   word: "yellow",     color: "#f1c40f" },
        { id: "green",    word: "green",      color: "#2ecc71" },
        { id: "black",    word: "black",      color: "#000000" },
        { id: "white",    word: "white",      color: "#ecf0f1" },
        { id: "orange",   word: "orange",     color: "#e67e22" },
        { id: "purple",   word: "purple",     color: "#9b59b6" },
        { id: "pink",     word: "pink",       color: "#ff6baf" },
        { id: "brown",    word: "brown",      color: "#8e5b3c" },
        { id: "grey",     word: "grey",       color: "#7f8c8d" },
        { id: "beige",    word: "beige",      color: "#f5deb3" },
        { id: "lightblue",word: "light blue", color: "#85c1e9" },
        { id: "darkgreen",word: "dark green", color: "#145a32" },
        { id: "gold",     word: "gold",       color: "#ffd700" }
    ];

    // === Configuración de niveles ===
    const COLOR_LEVELS = {
        1: {
            type: "simple", // palabra ↔ color
            description: "Nivel 1: Arrastra la palabra en inglés hasta el color correcto.",
            items: BASE_COLORS.slice(0, 6) // 6 colores básicos
        },
        2: {
            type: "simple",
            description: "Nivel 2: Más colores. ¡Recuerda bien sus nombres en inglés!",
            items: BASE_COLORS // los 15 colores
        },
        3: {
            type: "sentence_image", // frase ↔ imagen
            description: "Nivel 3: Une la frase con la imagen del color correcto.",
            items: [
                {
                    id: "cow_black",
                    sentence: "This cow is black.",
                    img: "/static/img/english/cow_black.jpeg",
                    alt: "Black cow"
                },
                {
                    id: "sheep_white",
                    sentence: "This sheep is white.",
                    img: "/static/img/english/sheep_white.jpeg",
                    alt: "White sheep"
                },
                {
                    id: "dog_brown",
                    sentence: "This dog is brown.",
                    img: "/static/img/english/dog_brown.jpeg",
                    alt: "Brown dog"
                },
                {
                    id: "cat_grey",
                    sentence: "This cat is grey.",
                    img: "/static/img/english/cat_grey.jpeg",
                    alt: "Grey cat"
                },
                {
                    id: "car_red",
                    sentence: "This car is red.",
                    img: "/static/img/english/car_red.jpeg",
                    alt: "Red car"
                },
                {
                    id: "car_blue",
                    sentence: "This car is blue.",
                    img: "/static/img/english/car_blue.jpeg",
                    alt: "Blue car"
                }
            ]
        },
        4: {
            type: "sentence_image",
            description: "Nivel 4: Frases con dos colores. Fíjate bien en la imagen.",
            items: [
                {
                    id: "cow_red_black",
                    sentence: "This cow is red and black.",
                    img: "/static/img/english/cow_red_black.jpeg",
                    alt: "Red and black cow"
                },
                {
                    id: "sheep_white_black",
                    sentence: "This sheep is white and black.",
                    img: "/static/img/english/sheep_white_black.jpeg",
                    alt: "White and black sheep"
                },
                {
                    id: "dog_brown_white",
                    sentence: "This dog is brown and white.",
                    img: "/static/img/english/dog_brown_white.jpeg",
                    alt: "Brown and white dog"
                },
                {
                    id: "cat_grey_white",
                    sentence: "This cat is grey and white.",
                    img: "/static/img/english/cat_grey_white.jpeg",
                    alt: "Grey and white cat"
                },
                {
                    id: "car_blue_yellow",
                    sentence: "This car is blue and yellow.",
                    img: "/static/img/english/car_blue_yellow.jpeg",
                    alt: "Blue and yellow car"
                },
                {
                    id: "car_red_blue",
                    sentence: "This car is orange and green.",
                    img: "/static/img/english/car_orange_green.jpeg",
                    alt: "Orange and green car"
                }
            ]
        },
        5: {
            type: "composite", // NUEVO: frases ↔ cuadro con 3 colores
            description: "Nivel 5: Une la frase con el cuadro que contiene esos tres colores.",
            baseColors: BASE_COLORS, // usamos los 15 como “paleta”
            count: 5                 // 5 frases/casillas por partida
        }
    };

    // === Referencias al DOM ===
    const livesSpan = document.getElementById("eg-lives");
    const scoreSpan = document.getElementById("eg-score");
    const levelSpan = document.getElementById("eg-level");
    const timeSpan  = document.getElementById("eg-time");

    const descriptionP = document.getElementById("eg-description");
    const targetsTitle = document.getElementById("eg-targets-title");

    const wordsContainer   = document.getElementById("eg-words");
    const targetsContainer = document.getElementById("eg-targets");

    const messageP = document.getElementById("eg-message");
    const startBtn = document.getElementById("eg-start-btn");
    const levelSelect = document.getElementById("eg-level-select");

    // === Sonidos ===
    const soundCorrect = new Audio("/static/sounds/correct.wav");
    const soundWrong   = new Audio("/static/sounds/wrong.wav");
    const soundWin     = new Audio("/static/sounds/end.wav");
    const soundLose    = new Audio("/static/sounds/lose.wav"); // opcional

    function safePlay(audio) {
        if (!audio) return;
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }

    // === Utilidades generales ===
    function setMessage(text, type = "") {
        messageP.textContent = text;
        messageP.className = "english-message";
        if (type) {
            messageP.classList.add(type); // "success" | "error" | "info"
        }
    }

    function updateHUD() {
        livesSpan.textContent = lives;
        scoreSpan.textContent = score;
        levelSpan.textContent = currentLevel;
        timeSpan.textContent  = time;
    }

    function stopTimer() {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
        }
    }

    function startTimer() {
        stopTimer();
        time = 0;
        timeSpan.textContent = time;
        timerId = setInterval(() => {
            time++;
            timeSpan.textContent = time;
        }, 1000);
    }

    function shuffleArray(array) {
        let currentIndex = array.length;
        let randomIndex;
        while (currentIndex !== 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex],
                array[currentIndex]
            ];
        }
        return array;
    }

    // Construye combinaciones aleatorias de 3 colores para el nivel 5
    function buildCompositeItems(baseColors, count) {
        const results = [];
        const usedIds = new Set();
        let attempts = 0;

        while (results.length < count && attempts < 50) {
            attempts++;

            const shuffled = shuffleArray([...baseColors]);
            const trio = shuffled.slice(0, 3); // 3 colores distintos

            const sortedIds = trio.map(c => c.id).sort();
            const id = sortedIds.join("_");
            if (usedIds.has(id)) continue; // evitar combos repetidos en la misma partida

            usedIds.add(id);
            const colors = trio.map(c => c.color);
            const words  = trio.map(c => c.word);

            const sentence = `This color contains ${words[0]}, ${words[1]} and ${words[2]}.`;

            results.push({
                id,
                sentence,
                colors
            });
        }
        return results;
    }

    // === Render del tablero según nivel actual ===
    function renderBoard() {
        const levelCfg = COLOR_LEVELS[currentLevel];
        if (!levelCfg) return;

        // Elegimos texto del título de objetivos
        if (levelCfg.type === "simple") {
            targetsTitle.textContent = "Colores";
        } else if (levelCfg.type === "sentence_image") {
            targetsTitle.textContent = "Imágenes";
        } else if (levelCfg.type === "composite") {
            targetsTitle.textContent = "Colores combinados";
        }

        descriptionP.textContent = levelCfg.description;

        wordsContainer.innerHTML   = "";
        targetsContainer.innerHTML = "";

        // items = conjunto de pares palabra/objetivo para este nivel
        let items;
        if (levelCfg.type === "composite") {
            // Nivel 5: generamos dinámicamente 5 combinaciones nuevas
            items = buildCompositeItems(levelCfg.baseColors, levelCfg.count);
        } else {
            items = shuffleArray([...levelCfg.items]);
        }

        remainingPairs = items.length;

        if (levelCfg.type === "simple") {
            // Palabras (izquierda)
            items.forEach(item => {
                const wordEl = document.createElement("div");
                wordEl.classList.add("eg-word");
                wordEl.textContent = item.word;
                wordEl.draggable = true;
                wordEl.dataset.targetId = item.id;
                wordEl.addEventListener("dragstart", onDragStart);
                wordsContainer.appendChild(wordEl);
            });

            // Cuadrados de color (derecha)
            const targets = shuffleArray([...items]);
            targets.forEach(item => {
                const targetEl = document.createElement("div");
                targetEl.classList.add("eg-target", "eg-target-color");
                targetEl.dataset.id = item.id;
                targetEl.style.backgroundColor = item.color;
                if (
                    item.id === "white" ||
                    item.id === "beige" ||
                    item.id === "lightblue"
                ) {
                    targetEl.classList.add("eg-target-light");
                }
                targetEl.addEventListener("dragover", onDragOver);
                targetEl.addEventListener("drop", onDrop);
                targetsContainer.appendChild(targetEl);
            });
        } else if (levelCfg.type === "sentence_image") {
            // Frases (izquierda)
            items.forEach(item => {
                const wordEl = document.createElement("div");
                wordEl.classList.add("eg-word");
                wordEl.textContent = item.sentence;
                wordEl.draggable = true;
                wordEl.dataset.targetId = item.id;
                wordEl.addEventListener("dragstart", onDragStart);
                wordsContainer.appendChild(wordEl);
            });

            // Imágenes (derecha)
            const targets = shuffleArray([...items]);
            targets.forEach(item => {
                const targetEl = document.createElement("div");
                targetEl.classList.add("eg-target", "eg-target-image");
                targetEl.dataset.id = item.id;

                const img = document.createElement("img");
                img.src = item.img;
                img.alt = item.alt || "Image";
                targetEl.appendChild(img);

                targetEl.addEventListener("dragover", onDragOver);
                targetEl.addEventListener("drop", onDrop);
                targetsContainer.appendChild(targetEl);
            });
        } else if (levelCfg.type === "composite") {
            // Nivel 5: frases con 3 colores ↔ cuadros combinados
            // Frases (izquierda)
            items.forEach(item => {
                const wordEl = document.createElement("div");
                wordEl.classList.add("eg-word");
                wordEl.textContent = item.sentence;
                wordEl.draggable = true;
                wordEl.dataset.targetId = item.id;
                wordEl.addEventListener("dragstart", onDragStart);
                wordsContainer.appendChild(wordEl);
            });

            // Cuadros combinados (derecha)
            const targets = shuffleArray([...items]);
            targets.forEach(item => {
                const targetEl = document.createElement("div");
                targetEl.classList.add("eg-target", "eg-target-composite");
                targetEl.dataset.id = item.id;

                const [c1, c2, c3] = item.colors;
                // 3 franjas verticales de color
                targetEl.style.background = `linear-gradient(
                    90deg,
                    ${c1} 0%,   ${c1} 33%,
                    ${c2} 33%,  ${c2} 66%,
                    ${c3} 66%,  ${c3} 100%
                )`;

                targetEl.addEventListener("dragover", onDragOver);
                targetEl.addEventListener("drop", onDrop);
                targetsContainer.appendChild(targetEl);
            });
        }
    }

    // === Drag & drop ===
    function onDragStart(ev) {
        ev.dataTransfer.setData("text/plain", ev.target.dataset.targetId);
        ev.dataTransfer.effectAllowed = "move";
        ev.target.classList.add("dragging");
    }

    function onDragOver(ev) {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = "move";
        ev.currentTarget.classList.add("eg-target-hover");
    }

    function onDrop(ev) {
        ev.preventDefault();
        const target = ev.currentTarget;
        target.classList.remove("eg-target-hover");

        const expectedId = target.dataset.id;
        const draggedId = ev.dataTransfer.getData("text/plain");

        const draggingEl = document.querySelector(
            `.eg-word.dragging[data-target-id="${draggedId}"]`
        );
        if (draggingEl) {
            draggingEl.classList.remove("dragging");
        }

        if (!draggedId || !expectedId) return;

        if (draggedId === expectedId) {
            // ✅ Acierto
            safePlay(soundCorrect);
            score += 10;
            remainingPairs--;

            target.classList.add("eg-target-correct");
            target.dataset.completed = "true";

            if (draggingEl) {
                draggingEl.classList.add("eg-word-correct");
                draggingEl.draggable = false;
                setTimeout(() => draggingEl.remove(), 300);
            }

            setMessage("¡Bien hecho! 👍", "success");
            updateHUD();

            if (remainingPairs === 0) {
                safePlay(soundWin);
                stopTimer();
                setMessage(
                    "🎉 ¡Nivel completado! Puedes cambiar de nivel o repetir para practicar más.",
                    "success"
                );
            }
        } else {
            // ❌ Error
            safePlay(soundWrong);
            lives--;
            if (lives < 0) lives = 0;
            updateHUD();
            setMessage("Ups... respuesta incorrecta.", "error");

            if (lives === 0) {
                safePlay(soundLose);
                stopTimer();
                setMessage(
                    "😢 Te has quedado sin vidas. Pulsa “Empezar nivel” para intentarlo de nuevo.",
                    "error"
                );
                document
                    .querySelectorAll(".eg-word")
                    .forEach(el => (el.draggable = false));
            }
        }
    }

    document.addEventListener("dragend", () => {
        document
            .querySelectorAll(".eg-word.dragging")
            .forEach(el => el.classList.remove("dragging"));
    });

    // === Cambio de nivel ===
    levelSelect.addEventListener("change", () => {
        currentLevel = parseInt(levelSelect.value, 10) || 1;
        lives = 3;
        score = 0;
        time = 0;
        stopTimer();
        updateHUD();
        renderBoard();
        setMessage(
            `Has cambiado al nivel ${currentLevel}. Pulsa "Empezar nivel" para jugar.`,
            "info"
        );
    });

    // === Botón Empezar ===
    startBtn.addEventListener("click", () => {
        lives = 3;
        score = 0;
        time = 0;
        updateHUD();
        renderBoard();
        startTimer();
        setMessage(
            "¡Empieza! Arrastra cada palabra / frase hasta su pareja correcta.",
            "info"
        );
    });

    // === Inicialización ===
    updateHUD();
    setMessage(
        'Selecciona un nivel y pulsa "Empezar nivel" para jugar.',
        "info"
    );
});

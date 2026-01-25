// static/js/auth.js

const API_BASE = window.location.origin;
const STORAGE_KEY = "jcm_user";

// Usuario actual disponible para todos los scripts
window.JCM_USER = null;

// URL de destino tras login (si procede)
window.JCM_NEXT_URL = null;

// ===============================
// 🌍 FUNCIONES GLOBALES (APP)
// ===============================

window.closeLoginModal = function () {
    const authModal = document.getElementById("authModal");
    if (!authModal) return;

    authModal.classList.add("hidden");

    // Ocultar mensaje al cerrar
    const hint = document.getElementById("loginHint");
    if (hint) hint.classList.add("hidden");
};

window.openLoginModal = function () {
    const authModal = document.getElementById("authModal");
    if (!authModal) return;

    authModal.classList.remove("hidden");

    // Mostrar aviso SOLO si NO hay usuario
    const hint = document.getElementById("loginHint");
    if (!window.JCM_USER && hint) {
        hint.classList.remove("hidden");
    } else if (hint) {
        hint.classList.add("hidden");
    }
};

function closeModal() {
    document.querySelector(".modal")?.classList.remove("open");
}

document.addEventListener("DOMContentLoaded", () => {
    // --- ELEMENTOS DE CABECERA ---
    const openAuthBtn = document.getElementById("openAuthBtn");
    const headerUsernameBox = document.getElementById("headerUsernameBox");
    const headerUsernameText = document.getElementById("headerUsernameText");
    const headerLogoutBtn = document.getElementById("headerLogoutBtn");
    const headerHistoryLink = document.getElementById("headerHistoryLink");

    // --- ELEMENTOS DEL MODAL ---
    const authModal = document.getElementById("authModal");
    const closeAuthBtn = document.getElementById("closeAuthBtn");

    // --- FORMULARIOS DEL MODAL ---
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    const loginMessage = document.getElementById("loginMessage");
    const registerMessage = document.getElementById("registerMessage");

    const authGuest = document.getElementById("auth-guest");
    const authLogged = document.getElementById("auth-logged");

    const currentUsernameSpan = document.getElementById("currentUsername");
    const currentBestScoreSpan = document.getElementById("currentBestScore");
    const currentTotalScoreSpan = document.getElementById("currentTotalScore");
    const logoutBtn = document.getElementById("logoutBtn");

    const goGamesBtn = document.getElementById("goGamesBtn");

    if (goGamesBtn) {
        goGamesBtn.addEventListener("click", () => {
            window.closeLoginModal();

            if (window.JCM_NEXT_URL) {
                const target = window.JCM_NEXT_URL;
                window.JCM_NEXT_URL = null;
                window.location.href = target;
            } else {
                window.location.href = "/";
            }
        });
    }

    if (openAuthBtn) openAuthBtn.addEventListener("click", window.openLoginModal);
    if (closeAuthBtn) closeAuthBtn.addEventListener("click", window.closeLoginModal);

    // Cerrar si haces clic en el fondo oscuro
    if (authModal) {
        const backdrop = authModal.querySelector(".auth-modal-backdrop");
        if (backdrop) backdrop.addEventListener("click", window.closeLoginModal);
    }

    // ============================================================
    // 👤 GESTIÓN DE USUARIO (LOCALSTORAGE)
    // ============================================================
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const user = JSON.parse(saved);
            if (user && user.id) window.JCM_USER = user;
        } catch (e) {
            console.error("Error parsing stored user:", e);
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    function setUser(user) {
        window.JCM_USER = user;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        updateAuthUI();
    }

    function clearUser() {
        window.JCM_USER = null;
        localStorage.removeItem(STORAGE_KEY);
        updateAuthUI();
    }

    // ============================================================
    // 🎨 ACTUALIZAR INTERFAZ (header + modal)
    // ============================================================
    function updateAuthUI() {
        const user = window.JCM_USER;

        // ----- Modal -----
        if (authGuest && authLogged) {
            if (user) {
                authGuest.classList.add("hidden");
                authLogged.classList.remove("hidden");

                if (currentUsernameSpan) currentUsernameSpan.textContent = user.username;
                if (currentBestScoreSpan) currentBestScoreSpan.textContent = user.best_score ?? 0;
                if (currentTotalScoreSpan)
                    currentTotalScoreSpan.textContent = user.total_score ?? 0;
            } else {
                authGuest.classList.remove("hidden");
                authLogged.classList.add("hidden");
            }
        }

        // ----- Cabecera -----
        if (openAuthBtn) openAuthBtn.classList.toggle("hidden", !!user);

        if (headerUsernameBox && headerUsernameText) {
            if (user) {
                headerUsernameText.textContent = user.username;
                headerUsernameBox.classList.remove("hidden");
            } else {
                headerUsernameBox.classList.add("hidden");
            }
        }

        if (headerLogoutBtn) headerLogoutBtn.classList.toggle("hidden", !user);

        // ----- Enlace "Historial" -----
        if (headerHistoryLink) headerHistoryLink.classList.toggle("hidden", !user);

        // 🔔 Avisar al resto de la app (juegos) de que el usuario ha cambiado
        window.dispatchEvent(
            new CustomEvent("jcm:user-changed", {
                detail: { user },
            })
        );
    }

    // Aplicar estado inicial (lo que haya en localStorage)
    updateAuthUI();

    // ============================================================
    // 🔁 SINCRONIZAR SESIÓN REAL CON BACKEND (/api/me)
    // ============================================================
    async function syncSessionFromBackend() {
        try {
            const resp = await fetch(`${API_BASE}/api/me`, {
                method: "GET",
                credentials: "include",
                headers: { Accept: "application/json" },
            });

            if (!resp.ok) {
                console.warn("syncSessionFromBackend HTTP", resp.status);
                return;
            }

            const data = await resp.json();

            if (data.logged_in && data.user) {
                // ✅ Backend confirma sesión -> dejamos el usuario real
                setUser(data.user);
                // 👉 Guardar destino si existe
                if (data.next_url) {
                    window.JCM_NEXT_URL = data.next_url;
                }
            } else {
                // ✅ Backend dice "no hay sesión" -> limpiamos localStorage para evitar falso logueo
                clearUser();
            }
        } catch (e) {
            console.warn("No se pudo sincronizar sesión con backend:", e);
            // No hacemos nada: mantenemos lo que haya en localStorage
        }
    }

    // Llamar al arrancar
    syncSessionFromBackend();

    // ============================================================
    // 📝 REGISTRO
    // ============================================================
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            registerMessage.textContent = "";
            registerMessage.className = "auth-message";

            const username = document.getElementById("registerUsername").value.trim();
            const password = document.getElementById("registerPassword").value.trim();

            if (!username || !password) {
                registerMessage.textContent = "Rellena usuario y contraseña.";
                registerMessage.classList.add("error");
                return;
            }

            try {
                const resp = await fetch(`${API_BASE}/api/register`, {
                    method: "POST",
                    credentials: "include", // ✅ CLAVE para sesión
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                });

                const data = await resp.json();

                if (!data.success) {
                    registerMessage.textContent = data.error || "Error al registrar.";
                    registerMessage.classList.add("error");
                    return;
                }

                setUser(data.user);

                registerMessage.textContent = "Cuenta creada correctamente.";
                registerMessage.classList.add("ok");

                setTimeout(closeModal, 600);
            } catch (err) {
                console.error(err);
                registerMessage.textContent = "Error de conexión con el servidor.";
                registerMessage.classList.add("error");
            }
        });
    }

    // ============================================================
    // 🔐 LOGIN
    // ============================================================
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            loginMessage.textContent = "";
            loginMessage.className = "auth-message";

            const username = document.getElementById("loginUsername").value.trim();
            const password = document.getElementById("loginPassword").value.trim();

            if (!username || !password) {
                loginMessage.textContent = "Rellena usuario y contraseña.";
                loginMessage.classList.add("error");
                return;
            }

            try {
                const resp = await fetch(`${API_BASE}/api/login`, {
                    method: "POST",
                    credentials: "include", // ✅ CLAVE para sesión
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                });

                const data = await resp.json();

                if (!data.success) {
                    loginMessage.textContent = data.error || "No se pudo iniciar sesión.";
                    loginMessage.classList.add("error");
                    return;
                }

                setUser(data.user);

                // 🔄 Redirigir a la página que intentó abrir
                setTimeout(() => {
                    // 👉 si hay destino pendiente, ir ahí
                    if (window.JCM_NEXT_URL) {
                        const target = window.JCM_NEXT_URL;
                        window.JCM_NEXT_URL = null;
                        window.location.href = target;
                    } else {
                        window.location.reload();
                    }
                }, 300);

                loginMessage.textContent = "Sesión iniciada.";
                loginMessage.classList.add("ok");

                setTimeout(closeModal, 500);
            } catch (err) {
                console.error(err);
                loginMessage.textContent = "Error de conexión con el servidor.";
                loginMessage.classList.add("error");
            }
        });
    }

    // ============================================================
    // 🚪 LOGOUT
    // ============================================================
    async function doLogout() {
        try {
            // ✅ avisar al backend para borrar session["user_id"]
            await fetch(`${API_BASE}/api/logout`, {
                method: "POST",
                credentials: "include",
            });
        } catch (e) {
            console.warn("Logout backend falló:", e);
        } finally {
            clearUser();
            closeModal();

            window.location.reload();
        }
    }

    if (logoutBtn) logoutBtn.addEventListener("click", doLogout);
    if (headerLogoutBtn) headerLogoutBtn.addEventListener("click", doLogout);
});

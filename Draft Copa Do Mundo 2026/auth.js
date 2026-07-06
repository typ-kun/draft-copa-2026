// ======================
// AUTH - SUPABASE LOGIN/REGISTER
// ======================

let authState = {
    user: null,
    session: null,
    loading: true,
    isGuest: false
};

function initAuth() {
    const supabase = initSupabase();
    if (!supabase) {
        authState.loading = false;
        renderAuthUI();
        return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
        authState.session = session;
        authState.user = session?.user ?? null;
        authState.loading = false;
        renderAuthUI();
    });

    supabase.auth.onAuthStateChange((event, session) => {
        authState.session = session;
        authState.user = session?.user ?? null;
        renderAuthUI();

        if (event === "SIGNED_OUT") {
            authState.isGuest = false;
            if (typeof mpSairSala === "function" && modoAtual !== MODO.OFFLINE) {
                mpSairSala();
            }
        }
    });
}

const ADMIN_EMAILS = ["guilherme_marchese@hotmail.com"];

function getAuthUser() {
    return authState.user;
}

function isAuthenticated() {
    return !!authState.user;
}

function isAdmin() {
    return authState.user && ADMIN_EMAILS.includes(authState.user.email);
}

// ─── UI ──────────────────────────────────────────────────────────────────────

function atualizarStatusPreMenu() {
    const statusEl = document.getElementById("preMenuAccountStatus");
    const btnLabel = document.getElementById("btnLogarRegistrar");
    if (!statusEl) return;

    if (authState.user) {
        const email = authState.user.email || "Logado";
        const adminBadge = isAdmin() ? ' 👑 ADMIN' : '';
        statusEl.innerHTML = `✅ <strong>${email}</strong>${adminBadge ? ` <span style="color:var(--accent);font-weight:800;">${adminBadge}</span>` : ''}`;
        statusEl.style.display = "block";
        if (btnLabel) btnLabel.textContent = "Conta";
    } else if (authState.isGuest) {
        statusEl.innerHTML = "🎮 <strong>Modo convidado</strong>";
        statusEl.style.display = "block";
        if (btnLabel) btnLabel.textContent = "Logar / Registrar";
    } else {
        statusEl.style.display = "none";
        if (btnLabel) btnLabel.textContent = "Logar / Registrar";
    }
}

function renderAuthUI() {
    // Remove loading ao renderizar
    setAuthLoading(false);

    const loggedOut = document.getElementById("authLoggedOut");
    const loggedIn = document.getElementById("authLoggedIn");
    const userEmail = document.getElementById("authUserEmail");
    const gameMenu = document.getElementById("gameMenuArea");
    if (!loggedOut || !loggedIn) return;

    // Esconder error/success ao renderizar
    const errEl = document.getElementById("authError");
    const sucEl = document.getElementById("authSuccess");
    if (errEl) errEl.style.display = "none";
    if (sucEl) sucEl.style.display = "none";

    // Se ainda está carregando (logo após F5), não mostra nada
    if (authState.loading) {
        loggedOut.style.display = "none";
        loggedIn.style.display = "none";
        if (gameMenu) gameMenu.style.display = "none";
        return;
    }

    const menuLiberado = authState.user || authState.isGuest;

    if (authState.user) {
        loggedOut.style.display = "none";
        loggedIn.style.display = "block";
        if (userEmail) {
            userEmail.textContent = authState.user.email || authState.user.user_metadata?.full_name || "Logado";
        }
    } else {
        loggedOut.style.display = "block";
        loggedIn.style.display = "none";
    }

    if (gameMenu) {
        gameMenu.style.display = menuLiberado ? "block" : "none";
    }

    // Atualizar status no pré-menu
    atualizarStatusPreMenu();
}

function showAuthError(msg) {
    const el = document.getElementById("authError");
    const suc = document.getElementById("authSuccess");
    if (el) {
        el.textContent = msg;
        el.style.display = "block";
    }
    if (suc) suc.style.display = "none";
    setAuthLoading(false);
}

function showAuthSuccess(msg) {
    const el = document.getElementById("authSuccess");
    const err = document.getElementById("authError");
    if (el) {
        el.textContent = msg;
        el.style.display = "block";
    }
    if (err) err.style.display = "none";
    setAuthLoading(false);
}

function setAuthLoading(loading) {
    const el = document.getElementById("authLoading");
    const loginBtn = document.getElementById("btnLogin");
    const registerBtn = document.getElementById("btnRegister");
    if (el) el.style.display = loading ? "block" : "none";
    if (loginBtn) loginBtn.disabled = loading;
    if (registerBtn) registerBtn.disabled = loading;
}

// ─── EMAIL / SENHA ───────────────────────────────────────────────────────────

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function translateAuthError(msg) {
    const map = {
        "Invalid login credentials": "Email ou senha incorretos.",
        "Email not confirmed": "Email nao confirmado. Verifique sua caixa de entrada.",
        "User already registered": "Email ja cadastrado.",
        "Password should be at least 6 characters": "Senha deve ter no minimo 6 caracteres.",
        "Invalid email": "Email invalido.",
        "rate limit": "Muitas tentativas. Aguarde alguns segundos.",
        "Email address is not authorized": "Email nao autorizado.",
        "Signup requires a valid password": "Senha obrigatoria.",
    };
    for (const [key, val] of Object.entries(map)) {
        if (msg.toLowerCase().includes(key.toLowerCase())) return val;
    }
    return msg;
}

async function handleRegister() {
    const email = document.getElementById("authEmail")?.value.trim();
    const password = document.getElementById("authPassword")?.value;

    if (!email || !isValidEmail(email)) {
        showAuthError("Email invalido.");
        return;
    }
    if (!password || password.length < 6) {
        showAuthError("Senha deve ter no minimo 6 caracteres.");
        return;
    }

    setAuthLoading(true);

    const supabase = initSupabase();
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                display_name: (document.getElementById("prePlayerName")?.value || "").trim() || email.split("@")[0]
            }
        }
    });

    if (error) {
        showAuthError(translateAuthError(error.message));
        return;
    }

    if (data?.user?.identities?.length === 0) {
        showAuthSuccess("Email ja cadastrado. Faca login.");
    } else {
        showAuthSuccess("Cadastro realizado! Verifique seu email para confirmar.");
        renderAuthUI();
    }
}

async function handleLogin() {
    const email = document.getElementById("authEmail")?.value.trim();
    const password = document.getElementById("authPassword")?.value;

    if (!email || !password) {
        showAuthError("Preencha email e senha.");
        return;
    }

    setAuthLoading(true);

    const supabase = initSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        showAuthError(translateAuthError(error.message));
        return;
    }

    document.getElementById("authPassword").value = "";
    // onAuthStateChange já chama renderAuthUI automaticamente
}

async function handleLogout() {
    const supabase = initSupabase();
    if (!supabase) return;

    // Se for convidado, só desativa o modo
    if (authState.isGuest) {
        authState.isGuest = false;
        renderAuthUI();
        showAuthSuccess("Modo convidado desativado.");
        return;
    }

    setAuthLoading(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
        showAuthError(error.message);
        return;
    }

    document.getElementById("authEmail").value = "";
    document.getElementById("authPassword").value = "";
    renderAuthUI();
    showAuthSuccess("Desconectado.");
}

// ─── CONVIDADO ───────────────────────────────────────────────────────────────

function handleContinuarConvidado() {
    authState.isGuest = true;
    renderAuthUI();
    showAuthSuccess("🎮 Modo convidado ativado!");
    atualizarStatusPreMenu();
    // Focar no input de nome
    const inputNome = document.getElementById("prePlayerName");
    if (inputNome) setTimeout(() => inputNome.focus(), 300);
}

// ─── GOOGLE OAUTH ────────────────────────────────────────────────────────────

async function handleGoogleLogin() {
    setAuthLoading(true);

    const supabase = initSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });

    if (error) {
        if (error.message && error.message.includes("provider is not enabled")) {
            showAuthError("Login Google nao configurado no Supabase. Use email/senha ou configure em Authentication > Providers.");
        } else {
            showAuthError(translateAuthError(error.message));
        }
    }
    // Se não houve erro, o navegador redireciona para o Google
    // Ao voltar, o onAuthStateChange tratará
}

// ─── EVENTOS ─────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(initAuth, 100);
});

document.addEventListener("click", function (e) {
    if (e.target.id === "btnLogin" || e.target.closest("#btnLogin")) {
        handleLogin();
        return;
    }
    if (e.target.id === "btnRegister" || e.target.closest("#btnRegister")) {
        handleRegister();
        return;
    }
    if (e.target.id === "btnLogout" || e.target.closest("#btnLogout")) {
        handleLogout();
        return;
    }
    if (e.target.id === "btnGoogleLogin" || e.target.closest("#btnGoogleLogin")) {
        handleGoogleLogin();
        return;
    }
    if (e.target.id === "btnContinuarConvidado" || e.target.closest("#btnContinuarConvidado")) {
        handleContinuarConvidado();
        return;
    }
    if (e.target.id === "btnLogarRegistrar" || e.target.closest("#btnLogarRegistrar")) {
        document.getElementById("preMenu").style.display = "none";
        document.getElementById("authScreen").style.display = "block";
        renderAuthUI();
        return;
    }
    if (e.target.id === "btnVoltarDeAuth" || e.target.closest("#btnVoltarDeAuth")) {
        document.getElementById("authScreen").style.display = "none";
        document.getElementById("preMenu").style.display = "block";
        return;
    }
});

document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        if (e.target.id === "authEmail" || e.target.id === "authPassword") {
            e.preventDefault();
            handleLogin();
        }
    }
});

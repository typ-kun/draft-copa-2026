// ======================
// AUTH - SUPABASE LOGIN/REGISTER
// ======================

let authState = {
    user: null,
    session: null,
    loading: true
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
            if (typeof mpSairSala === "function" && modoAtual !== MODO.OFFLINE) {
                mpSairSala();
            }
        }
    });
}

function getAuthUser() {
    return authState.user;
}

function isAuthenticated() {
    return !!authState.user;
}

// ─── UI ──────────────────────────────────────────────────────────────────────

function renderAuthUI() {
    const loggedOut = document.getElementById("authLoggedOut");
    const loggedIn = document.getElementById("authLoggedIn");
    const userEmail = document.getElementById("authUserEmail");
    const authSection = document.getElementById("authSection");
    if (!loggedOut || !loggedIn || !authSection) return;

    // Esconder error/success ao renderizar
    const errEl = document.getElementById("authError");
    const sucEl = document.getElementById("authSuccess");
    if (errEl) errEl.style.display = "none";
    if (sucEl) sucEl.style.display = "none";

    // Se ainda está carregando (logo após F5), não mostra nenhum estado ainda
    if (authState.loading) {
        loggedOut.style.display = "none";
        loggedIn.style.display = "none";
        authSection.style.display = "none";
        return;
    }

    authSection.style.display = "block";

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
    toast("✅ Login realizado!", 2000);
    renderAuthUI();
}

async function handleLogout() {
    const supabase = initSupabase();
    if (!supabase) return;

    setAuthLoading(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
        showAuthError(error.message);
        return;
    }

    document.getElementById("authEmail").value = "";
    document.getElementById("authPassword").value = "";
    toast("Desconectado.", 2000);
    renderAuthUI();
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
        showAuthError(translateAuthError(error.message));
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
});

document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        if (e.target.id === "authEmail" || e.target.id === "authPassword") {
            e.preventDefault();
            handleLogin();
        }
    }
});

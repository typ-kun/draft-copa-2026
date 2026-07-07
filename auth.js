// ======================
// AUTH - SUPABASE LOGIN/REGISTER
// ======================

let authState = {
    user: null,
    session: null,
    loading: true,
    isGuest: false,
    userLevel: null
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
        if (authState.user) fetchUserLevel(authState.user.id).then(() => renderAuthUI());
        else renderAuthUI();
    });

    supabase.auth.onAuthStateChange((event, session) => {
        authState.session = session;
        authState.user = session?.user ?? null;
        authState.userLevel = null;

        if (event === "SIGNED_IN" && session?.user) {
            fetchUserLevel(session.user.id).then(() => renderAuthUI());
        } else {
            renderAuthUI();
        }

        if (event === "SIGNED_OUT") {
            authState.isGuest = false;
            if (typeof mpSairSala === "function" && modoAtual !== MODO.OFFLINE) {
                mpSairSala();
            }
        }
    });
}

const ADMIN_EMAILS = ["guilherme_marchese@hotmail.com"];
const PREMIUM_EMAILS = [];

function getAuthUser() {
    return authState.user;
}

function isAuthenticated() {
    return !!authState.user;
}

function isAdmin() {
    return authState.user && ADMIN_EMAILS.includes(authState.user.email);
}

function getUserLevel() {
    if (!authState.user) return authState.isGuest ? "guest" : null;
    if (ADMIN_EMAILS.includes(authState.user.email)) return "admin";
    if (authState.userLevel) return authState.userLevel;
    if (PREMIUM_EMAILS.includes(authState.user.email)) return "premium";
    return "common";
}

async function fetchUserLevel(userId) {
    const supabase = initSupabase();
    if (!supabase || !userId) return;
    const { data } = await supabase
        .from("profiles")
        .select("level")
        .eq("id", userId)
        .single();
    if (data?.level) {
        authState.userLevel = data.level;
    }
}

function canPlayOffline() {
    const level = getUserLevel();
    return level === "admin" || level === "premium";
}

function canCreateRoom() {
    const level = getUserLevel();
    return level === "admin";
}

// ─── UI ──────────────────────────────────────────────────────────────────────

function atualizarStatusPreMenu() {
    const statusEl = document.getElementById("preMenuAccountStatus");
    const btnLabel = document.getElementById("btnLogarRegistrar");
    if (!statusEl) return;

    if (authState.user) {
        const nivel = getUserLevel();
        const icones = { admin: "👑", premium: "⭐", common: "🎮" };
        const icone = icones[nivel] || "🎮";
        statusEl.innerHTML = `✅ <strong>Logado</strong> <span style="color:var(--muted);font-size:11px;">${icone} ${nivel === "admin" ? "ADMIN" : nivel === "premium" ? "Premium" : "Jogador"}</span>`;
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
        const privEl = document.getElementById("authPrivilege");
        if (privEl) {
            const nivel = getUserLevel();
            const nomes = { admin: "👑 ADMIN", premium: "⭐ Jogador Premium", common: "🎮 Jogador Comum" };
            privEl.textContent = "Nível: " + (nomes[nivel] || "🎮 Jogador Comum");
        }
    } else {
        loggedOut.style.display = "block";
        loggedIn.style.display = "none";
    }

    if (gameMenu) {
        gameMenu.style.display = menuLiberado ? "block" : "none";
    }

    // Atualizar status no pré-menu e botão admin
    atualizarStatusPreMenu();
    atualizarBotaoAdmin();
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
    if (!supabase) {
        showAuthError("Erro de conexao. Tente novamente.");
        setAuthLoading(false);
        return;
    }

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
        console.error("[Register error]", error);
        const msg = error?.message || error?.error_description || error?.code || "Erro no servidor. Verifique se o Supabase esta ativo.";
        if (msg === "{}") showAuthError("Erro no servidor. Verifique o console (F12) para detalhes.");
        else showAuthError(translateAuthError(msg));
        return;
    }

    if (data?.user?.identities?.length === 0) {
        showAuthSuccess("Email ja cadastrado. Faca login.");
    } else {
        showAuthSuccess("Cadastro realizado! Verifique seu email para confirmar.");
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
        console.error("[Login error]", error);
        const msg = error?.message || error?.error_description || error?.code || "Erro no servidor. Verifique se o Supabase esta ativo.";
        if (msg === "{}") showAuthError("Erro no servidor. Verifique o console (F12) para detalhes.");
        else showAuthError(translateAuthError(msg));
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

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────

function atualizarBotaoAdmin() {
    const btn = document.getElementById("btnAdminPanel");
    if (!btn) return;
    btn.style.display = isAdmin() ? "block" : "none";
}

function mpAbrirAdminPanel() {
    document.getElementById("adminPanel").style.display = "block";
    mpListarProfiles();
}

function mpFecharAdminPanel() {
    document.getElementById("adminPanel").style.display = "none";
}

async function mpListarProfiles() {
    const supabase = initSupabase();
    const listEl = document.getElementById("adminProfilesList");
    if (!supabase || !listEl) return;

    listEl.innerHTML = '<div class="open-rooms-empty">🔄 Carregando...</div>';

    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        listEl.innerHTML = '<div class="open-rooms-empty" style="color:#e74c3c;">❌ Erro: ' + error.message + '</div>';
        return;
    }

    if (!data || data.length === 0) {
        listEl.innerHTML = '<div class="open-rooms-empty">Nenhum usuário encontrado. Execute o SQL primeiro.</div>';
        return;
    }

    const nomesNivel = { admin: "👑 Admin", premium: "⭐ Premium", common: "🎮 Comum" };

    listEl.innerHTML = data.map(profile => `
        <div class="open-room-item">
            <div class="open-room-info" style="flex-direction:column;align-items:flex-start;gap:2px;">
                <span style="font-weight:600;font-size:14px;color:var(--ink);">${profile.email || "Sem email"}</span>
                <span style="font-size:11px;color:var(--muted);">
                    ${nomesNivel[profile.level] || "🎮 Comum"}
                    ${profile.created_at ? " • " + new Date(profile.created_at).toLocaleDateString("pt-BR") : ""}
                </span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
                ${profile.email !== "guilherme_marchese@hotmail.com" ? `
                <select class="admin-level-select" data-profile-id="${profile.id}" data-current="${profile.level}">
                    <option value="common" ${profile.level === "common" ? "selected" : ""}>🎮 Comum</option>
                    <option value="premium" ${profile.level === "premium" ? "selected" : ""}>⭐ Premium</option>
                </select>
                <button class="admin-delete-btn" data-profile-id="${profile.id}" data-profile-email="${profile.email}" title="Deletar ${profile.email}">✕</button>` : '<span style="font-size:11px;color:var(--accent);font-weight:700;">👑 ADMIN</span>'}
            </div>
        </div>
    `).join("");
}

async function mpAlterarNivel(profileId, novoNivel) {
    const supabase = initSupabase();
    if (!supabase) return;

    const { error } = await supabase
        .from("profiles")
        .update({ level: novoNivel })
        .eq("id", profileId);

    if (error) {
        toast("❌ Erro ao alterar nível: " + error.message, 3000);
    } else {
        toast("✅ Nível alterado!", 2000);
        mpListarProfiles();
    }
}

async function mpDeletarProfile(profileId, email) {
    if (!confirm(`Tem certeza que deseja deletar "${email}"?\n\nIsso remove o perfil e a conta de usuário permanentemente.`)) return;

    const supabase = initSupabase();
    if (!supabase) return;

    // Tenta usar a função RPC admin_delete_user (se existir no banco)
    const { error: rpcError } = await supabase.rpc("admin_delete_user", {
        target_user_id: profileId
    });

    if (rpcError) {
        // Fallback: tenta deletar só da tabela profiles
        if (rpcError.message && rpcError.message.includes("function not found")) {
            const { error: delError } = await supabase
                .from("profiles")
                .delete()
                .eq("id", profileId);

            if (delError) {
                toast("❌ Erro ao deletar: " + delError.message, 3000);
            } else {
                toast("✅ Perfil deletado! O usuario ainda existe em auth.users — delete manualmente no Supabase Dashboard se necessario.", 4000);
                mpListarProfiles();
            }
        } else {
            toast("❌ Erro ao deletar: " + rpcError.message, 3000);
        }
    } else {
        toast("✅ Usuário deletado com sucesso!", 2000);
        mpListarProfiles();
    }
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
    if (!supabase) {
        showAuthError("Supabase nao configurado.");
        setAuthLoading(false);
        return;
    }

    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: window.location.origin + window.location.pathname,
                queryParams: {
                    access_type: "offline",
                    prompt: "consent"
                }
            }
        });

        if (error) {
            console.error("[Google OAuth]", error);
            if (error.message && error.message.includes("provider is not enabled")) {
                showAuthError("Login Google nao configurado no Supabase. Use email/senha ou configure em Authentication > Providers.");
            } else {
                showAuthError("Erro: " + (error.message || "desconhecido"));
            }
            setAuthLoading(false);
        }
        // Se não houve erro, o navegador redireciona para o Google
    } catch (err) {
        console.error("[Google OAuth exception]", err);
        showAuthError("Erro inesperado: " + (err.message || "desconhecido"));
        setAuthLoading(false);
    }
}

// ─── RECUPERACAO DE SENHA ────────────────────────────────────────────────────

function authMostrarFormRecuperacao() {
    document.getElementById("authLoginForm").style.display = "none";
    document.getElementById("authResetPasswordForm").style.display = "block";
    document.getElementById("authResetEmail").value = document.getElementById("authEmail").value;
    const errEl = document.getElementById("authError");
    const sucEl = document.getElementById("authSuccess");
    if (errEl) errEl.style.display = "none";
    if (sucEl) sucEl.style.display = "none";
}

function authVoltarAoLogin() {
    document.getElementById("authResetPasswordForm").style.display = "none";
    document.getElementById("authLoginForm").style.display = "block";
    const errEl = document.getElementById("authError");
    const sucEl = document.getElementById("authSuccess");
    if (errEl) errEl.style.display = "none";
    if (sucEl) sucEl.style.display = "none";
}

async function handleForgotPassword() {
    const email = document.getElementById("authResetEmail")?.value.trim();

    if (!email || !isValidEmail(email)) {
        showAuthError("Digite um email valido.");
        return;
    }

    setAuthLoading(true);

    const supabase = initSupabase();
    if (!supabase) {
        setAuthLoading(false);
        return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname
    });

    setAuthLoading(false);

    if (error) {
        console.error("[ForgotPassword error]", error);
        const msg = error?.message || error?.error_description || error?.code || "Erro no servidor. Verifique se o Supabase esta ativo.";
        if (msg === "{}") showAuthError("Erro no servidor. Verifique o console (F12) para detalhes.");
        else showAuthError(translateAuthError(msg));
        return;
    }

    authVoltarAoLogin();
    showAuthSuccess("Email enviado! Verifique sua caixa de entrada (e a pasta de spam).");
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
    if (e.target.id === "authForgotPassword" || e.target.closest("#authForgotPassword")) {
        e.preventDefault();
        authMostrarFormRecuperacao();
        return;
    }
    if (e.target.id === "btnSendReset" || e.target.closest("#btnSendReset")) {
        handleForgotPassword();
        return;
    }
    if (e.target.id === "btnContinuarConvidado" || e.target.closest("#btnContinuarConvidado")) {
        handleContinuarConvidado();
        return;
    }
    if (e.target.id === "btnLogarRegistrar" || e.target.closest("#btnLogarRegistrar")) {
        document.getElementById("preMenu").style.display = "none";
        document.getElementById("authScreen").style.display = "block";
        authVoltarAoLogin();
        renderAuthUI();
        return;
    }
    if (e.target.id === "btnVoltarDeAuth" || e.target.closest("#btnVoltarDeAuth")) {
        const resetForm = document.getElementById("authResetPasswordForm");
        if (resetForm && resetForm.style.display !== "none") {
            authVoltarAoLogin();
        } else {
            document.getElementById("authScreen").style.display = "none";
            document.getElementById("preMenu").style.display = "block";
        }
        return;
    }
    if (e.target.id === "btnAdminPanel" || e.target.closest("#btnAdminPanel")) {
        mpAbrirAdminPanel();
        return;
    }
    if (e.target.id === "btnVoltarDeAdmin" || e.target.closest("#btnVoltarDeAdmin")) {
        mpFecharAdminPanel();
        return;
    }
    if (e.target.id === "btnFecharAdminDrawer" || e.target.closest("#btnFecharAdminDrawer")) {
        mpFecharAdminPanel();
        return;
    }
    if (e.target.id === "adminPanelBackdrop") {
        mpFecharAdminPanel();
        return;
    }
    if (e.target.id === "btnRefreshProfiles" || e.target.closest("#btnRefreshProfiles")) {
        mpListarProfiles();
        return;
    }
    if (e.target.classList.contains("admin-level-select")) {
        // Não fazer nada no click, apenas abrir o dropdown
        return;
    }
    if (e.target.classList.contains("admin-delete-btn")) {
        const profileId = e.target.dataset.profileId;
        const profileEmail = e.target.dataset.profileEmail;
        if (profileId) mpDeletarProfile(profileId, profileEmail);
        return;
    }
});

// Change nos selects de nível (dispara quando seleciona uma opção)
document.addEventListener("change", function (e) {
    if (e.target.classList.contains("admin-level-select")) {
        const profileId = e.target.dataset.profileId;
        const novoNivel = e.target.value;
        if (profileId && novoNivel) mpAlterarNivel(profileId, novoNivel);
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

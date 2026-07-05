// ======================
// SUPABASE CONFIG
// ======================
// Para rodar o multiplayer, você precisa de um projeto Supabase.
// 1. Crie uma conta grátis em https://supabase.com
// 2. Crie um novo projeto
// 3. Vá em Settings → API e copie a Project URL e a anon key (ou sb_publishable key)
// 4. Cole abaixo no lugar dos placeholders
// 5. Execute o SQL do plano no SQL Editor do Supabase para criar as tabelas
// ======================

const SUPABASE_URL = "https://cglddmsrqjuozssienna.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_rHfQZZvToAzUNBFsBCYrbg_L60kVyI6";

// Criação do cliente Supabase
// Usa a variável global `supabase` do CDN carregado no index.html
let supabaseClient = null;

function initSupabase() {
    if (supabaseClient) return supabaseClient;

    if (typeof supabase === "undefined" || !supabase.createClient) {
        console.error("[Supabase] Biblioteca não carregada. Verifique o CDN no index.html.");
        return null;
    }

    if (SUPABASE_URL.includes("SEU_PROJETO")) {
        console.error("[Supabase] Configure SUPABASE_URL e SUPABASE_ANON_KEY no supabase-config.js");
        return null;
    }

    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        }
    });
    return supabaseClient;
}

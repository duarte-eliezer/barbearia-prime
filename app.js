// CONEXÃO COM SUPABASE

const SUPABASE_URL = "https://zqeibwfycaknwczsjvrc.supabase.co";

const SUPABASE_KEY = "sb_publishable_O6jr9-8YBIlQksSNlAuWlA_SmyOxE8M";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

console.log("Supabase conectado!");

// TESTE DE CONEXÃO COM O BANCO

async function testarConexao() {
    const { data, error } = await supabaseClient
        .from("servicos")
        .select("nome")
        .eq("ativo", true);

    if (error) {
        alert("Erro na conexão: " + error.message);
        return;
    }

    alert("Conexão realizada! Serviços encontrados: " + data.length);
}

testarConexao();
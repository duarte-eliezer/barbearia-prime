
// ==========================================
// BARBEARIA PRIME - SISTEMA DE AGENDAMENTOS
// ==========================================


// 1. CONEXÃO COM O SUPABASE

const SUPABASE_URL = "https://zqeibwfycaknwczsjvrc.supabase.co";

// Mantenha aqui sua Publishable Key do Supabase


const SUPABASE_KEY = "sb_publishable_O6jr9-8YBIlQksSNlAuWlA_SmyOxE8M";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// 2. ELEMENTOS DO HTML

const listaServicos = document.getElementById("lista-servicos");
const servicoSelect = document.getElementById("servico");
const barbeiroSelect = document.getElementById("barbeiro");
const dataInput = document.getElementById("data");

const botaoBuscar = document.getElementById("buscar-horarios");
const horariosContainer = document.getElementById("horarios-container");

const dadosCliente = document.getElementById("dados-cliente");
const nomeInput = document.getElementById("nome");
const telefoneInput = document.getElementById("telefone");

const botaoConfirmar = document.getElementById("confirmar-agendamento");
const mensagem = document.getElementById("mensagem");

let horarioSelecionado = null;


// 3. NAVEGAÇÃO ENTRE AS TELAS

function mostrarTela(id) {
    document.querySelectorAll(".tela").forEach(tela => {
        tela.classList.remove("ativa");
    });

    document.getElementById(id).classList.add("ativa");

    window.scrollTo(0, 0);
}

function voltarInicio() {
    mostrarTela("inicio");
}

function abrirServicos() {
    mostrarTela("servicos");
}

function abrirAgendamento() {
    mostrarTela("agendamento");
}


// 4. FORMATAÇÃO DE PREÇOS

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}


// 5. MENSAGENS DO SISTEMA

function mostrarMensagem(texto, tipo = "erro") {
    mensagem.textContent = texto;
    mensagem.className = tipo;
}


// 6. CARREGAR SERVIÇOS

async function carregarServicos() {
    listaServicos.textContent = "Carregando serviços...";

    const { data, error } = await supabaseClient
        .from("servicos")
        .select("id, nome, descricao, preco")
        .eq("ativo", true)
        .order("nome");

    if (error) {
        listaServicos.textContent = "Não foi possível carregar os serviços.";
        mostrarMensagem(error.message);
        return;
    }

    listaServicos.replaceChildren();

    servicoSelect.innerHTML =
        '<option value="">Selecione um serviço</option>';

    data.forEach(item => {
        const card = document.createElement("div");
        card.className = "servico-card";

        const titulo = document.createElement("h3");
        titulo.textContent = item.nome;

        const descricao = document.createElement("p");
        descricao.textContent = item.descricao || "";

        const preco = document.createElement("strong");
        preco.textContent = formatarPreco(item.preco);

        card.append(titulo, descricao, preco);
        listaServicos.appendChild(card);

        const opcao = document.createElement("option");
        opcao.value = item.id;
        opcao.textContent =
            `${item.nome} - ${formatarPreco(item.preco)}`;

        servicoSelect.appendChild(opcao);
    });

    if (data.length === 0) {
        listaServicos.textContent = "Nenhum serviço cadastrado.";
    }
}


// 7. CARREGAR BARBEIROS

async function carregarBarbeiros() {
    const { data, error } = await supabaseClient
        .from("barbeiros")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

    if (error) {
        mostrarMensagem(error.message);
        return;
    }

    barbeiroSelect.innerHTML =
        '<option value="">Qualquer barbeiro disponível</option>';

    data.forEach(item => {
        const opcao = document.createElement("option");

        opcao.value = item.id;
        opcao.textContent = item.nome;

        barbeiroSelect.appendChild(opcao);
    });
}


// 8. LIMPAR SELEÇÃO DE HORÁRIO

function limparSelecao() {
    horarioSelecionado = null;

    dadosCliente.style.display = "none";

    horariosContainer
        .querySelectorAll(".horario-botao")
        .forEach(botao => {
            botao.classList.remove("selecionado");
        });
}


// 9. BUSCAR HORÁRIOS DISPONÍVEIS

async function buscarHorarios() {
    const servicoId = servicoSelect.value;
    const data = dataInput.value;
    const barbeiroId = barbeiroSelect.value || null;

    horariosContainer.replaceChildren();
    limparSelecao();
    mostrarMensagem("");

    if (!servicoId || !data) {
        mostrarMensagem("Selecione um serviço e uma data.");
        return;
    }

    horariosContainer.textContent = "Buscando horários...";

    const { data: horarios, error } = await supabaseClient
        .rpc("consultar_horarios_disponiveis", {
            p_data: data,
            p_servico_id: servicoId,
            p_barbeiro_id: barbeiroId
        });

    if (error) {
        horariosContainer.textContent =
            "Não foi possível consultar os horários.";

        mostrarMensagem(error.message);
        return;
    }

    horariosContainer.replaceChildren();

    if (!horarios || horarios.length === 0) {
        horariosContainer.textContent =
            "Não há horários disponíveis nesta data.";

        return;
    }

    horarios.forEach(item => {
        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "horario-botao";

        const hora = new Date(item.inicio).toLocaleTimeString(
            "pt-BR",
            {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

        botao.textContent = `${hora} - ${item.barbeiro_nome}`;

        botao.addEventListener("click", () => {
            selecionarHorario(item, botao);
        });

        horariosContainer.appendChild(botao);
    });
}


// 10. SELECIONAR HORÁRIO

function selecionarHorario(item, botao) {
    limparSelecao();

    horarioSelecionado = item;

    botao.classList.add("selecionado");

    dadosCliente.style.display = "block";

    mostrarMensagem(
        "Horário selecionado! Preencha seus dados.",
        "sucesso"
    );
}


// 11. CONFIRMAR AGENDAMENTO

async function confirmarAgendamento() {
    if (!horarioSelecionado) {
        mostrarMensagem("Selecione um horário primeiro.");
        return;
    }

    const nome = nomeInput.value.trim();
    const telefone = telefoneInput.value.trim();

    if (!nome || !telefone) {
        mostrarMensagem("Preencha seu nome e telefone.");
        return;
    }

    botaoConfirmar.disabled = true;
    botaoConfirmar.textContent = "Confirmando...";

    const { data, error } = await supabaseClient.rpc(
        "solicitar_agendamento",
        {
            p_nome_cliente: nome,
            p_telefone_cliente: telefone,
            p_servico_id: servicoSelect.value,
            p_inicio: horarioSelecionado.inicio,
            p_barbeiro_id: horarioSelecionado.barbeiro_id
        }
    );

    botaoConfirmar.disabled = false;
    botaoConfirmar.textContent = "Confirmar agendamento";

    if (error) {
        mostrarMensagem(error.message);
        return;
    }

    mostrarMensagem(
        "Agendamento solicitado com sucesso! Aguarde a confirmação da barbearia.",
        "sucesso"
    );

    nomeInput.value = "";
    telefoneInput.value = "";

    limparSelecao();

    await buscarHorarios();
}


// 12. EVENTOS DOS BOTÕES

botaoBuscar.addEventListener("click", buscarHorarios);

botaoConfirmar.addEventListener(
    "click",
    confirmarAgendamento
);

servicoSelect.addEventListener("change", () => {
    horariosContainer.replaceChildren();
    limparSelecao();
});

barbeiroSelect.addEventListener("change", () => {
    horariosContainer.replaceChildren();
    limparSelecao();
});

dataInput.addEventListener("change", () => {
    horariosContainer.replaceChildren();
    limparSelecao();
});


// 13. INICIAR O SITE

async function iniciarSite() {
    console.log("Conectando à Barbearia Prime...");

    dadosCliente.style.display = "none";

    await carregarServicos();
    await carregarBarbeiros();

    console.log("Barbearia Prime carregada!");
}

iniciarSite();

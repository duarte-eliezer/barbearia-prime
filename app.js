
// ======================================
// BARBEARIA PRIME - CONEXÃO COM SUPABASE
// ======================================

const SUPABASE_URL = "https://zqeibwfycaknwczsjvrc.supabase.co";
const SUPABASE_KEY = "sb_publishable_O6jr9-8YBIlQksSNlAuWlA_SmyOxE8M";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ELEMENTOS DO SITE

const listaServicos = document.getElementById("lista-servicos");
const servicoSelect = document.getElementById("servico");
const barbeiroSelect = document.getElementById("barbeiro");
const dataInput = document.getElementById("data");
const buscarBtn = document.getElementById("buscar-horarios");
const horariosContainer = document.getElementById("horarios-container");
const dadosCliente = document.getElementById("dados-cliente");
const nomeInput = document.getElementById("nome");
const telefoneInput = document.getElementById("telefone");
const confirmarBtn = document.getElementById("confirmar-agendamento");
const mensagem = document.getElementById("mensagem");

let horarioSelecionado = null;

// DATA ATUAL NO FUSO LOCAL

function dataAtualLocal() {
    const agora = new Date();

    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

dataInput.min = dataAtualLocal();

// FORMATAÇÃO DE PREÇO

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// FORMATAÇÃO DE HORÁRIO

function formatarHorario(data) {
    return new Date(data).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo"
    });
}

// MENSAGENS

function mostrarMensagem(texto, sucesso = false) {
    mensagem.textContent = texto;
    mensagem.style.color = sucesso ? "#c9a44c" : "#ff7777";
}

// RESETAR SELEÇÃO DE HORÁRIO

function limparSelecao() {
    horarioSelecionado = null;
    dadosCliente.hidden = true;

    horariosContainer.textContent =
        "Escolha o serviço e a data para consultar os horários.";

    mostrarMensagem("");
}

// ======================================
// CARREGAR SERVIÇOS
// ======================================

async function carregarServicos() {
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

    data.forEach(servico => {
        const card = document.createElement("div");
        card.className = "servico-card";

        const titulo = document.createElement("h3");
        titulo.textContent = servico.nome;

        const descricao = document.createElement("p");
        descricao.textContent = servico.descricao || "";

        const preco = document.createElement("strong");
        preco.textContent = formatarPreco(servico.preco);

        card.append(titulo, descricao, preco);
        listaServicos.appendChild(card);

        const opcao = document.createElement("option");
        opcao.value = servico.id;
        opcao.textContent =
            `${servico.nome} - ${formatarPreco(servico.preco)}`;

        servicoSelect.appendChild(opcao);
    });

    if (data.length === 0) {
        listaServicos.textContent = "Nenhum serviço cadastrado.";
    }
}

// ======================================
// CARREGAR BARBEIROS
// ======================================

async function carregarBarbeiros() {
    const { data, error } = await supabaseClient
        .from("barbeiros")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

    if (error) {
        mostrarMensagem("Erro ao carregar barbeiros: " + error.message);
        return;
    }

    barbeiroSelect.innerHTML =
        '<option value="">Qualquer barbeiro disponível</option>';

    data.forEach(barbeiro => {
        const opcao = document.createElement("option");

        opcao.value = barbeiro.id;
        opcao.textContent = barbeiro.nome;

        barbeiroSelect.appendChild(opcao);
    });
}

// ======================================
// CONSULTAR HORÁRIOS DISPONÍVEIS
// ======================================

async function buscarHorarios() {
    limparSelecao();

    const servicoId = servicoSelect.value;
    const data = dataInput.value;
    const barbeiroId = barbeiroSelect.value || null;

    if (!servicoId || !data) {
        mostrarMensagem("Selecione um serviço e uma data.");
        return;
    }

    if (data < dataAtualLocal()) {
        mostrarMensagem("Escolha uma data futura ou hoje.");
        return;
    }

    buscarBtn.disabled = true;
    buscarBtn.textContent = "CONSULTANDO...";

    horariosContainer.textContent = "Buscando horários disponíveis...";

    const { data: horarios, error } = await supabaseClient.rpc(
        "consultar_horarios_disponiveis",
        {
            p_data: data,
            p_servico_id: servicoId,
            p_barbeiro_id: barbeiroId
        }
    );

    buscarBtn.disabled = false;
    buscarBtn.textContent = "VER HORÁRIOS DISPONÍVEIS";

    if (error) {
        horariosContainer.textContent = "";
        mostrarMensagem("Erro ao consultar horários: " + error.message);
        return;
    }

    horariosContainer.replaceChildren();

    if (!horarios || horarios.length === 0) {
        horariosContainer.textContent =
            "Não há horários disponíveis para essa escolha.";
        return;
    }

    const titulo = document.createElement("h3");
    titulo.textContent = "Horários disponíveis";

    horariosContainer.appendChild(titulo);

    horarios.forEach(horario => {
        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "horario-btn";

        botao.textContent =
            `${formatarHorario(horario.inicio)} - ${horario.barbeiro_nome}`;

        botao.addEventListener("click", () => {
            document.querySelectorAll(".horario-btn").forEach(item => {
                item.classList.remove("selecionado");
            });

            botao.classList.add("selecionado");

            horarioSelecionado = horario;

            dadosCliente.hidden = false;

            mostrarMensagem(
                `Horário escolhido: ${formatarHorario(horario.inicio)} com ${horario.barbeiro_nome}`,
                true
            );
        });

        horariosContainer.appendChild(botao);
    });
}

// ======================================
// SOLICITAR AGENDAMENTO
// ======================================

async function confirmarAgendamento() {
    if (!horarioSelecionado) {
        mostrarMensagem("Escolha um horário primeiro.");
        return;
    }

    const nome = nomeInput.value.trim();
    const telefone = telefoneInput.value.trim();
    const servicoId = servicoSelect.value;

    if (!nome || !telefone) {
        mostrarMensagem("Preencha seu nome e WhatsApp.");
        return;
    }

    confirmarBtn.disabled = true;
    confirmarBtn.textContent = "ENVIANDO...";

    const { data, error } = await supabaseClient.rpc(
        "solicitar_agendamento",
        {
            p_nome_cliente: nome,
            p_telefone_cliente: telefone,
            p_servico_id: servicoId,
            p_inicio: horarioSelecionado.inicio,
            p_barbeiro_id: horarioSelecionado.barbeiro_id
        }
    );

    confirmarBtn.disabled = false;
    confirmarBtn.textContent = "SOLICITAR AGENDAMENTO";

    if (error) {
        mostrarMensagem(
            "Não foi possível agendar: " + error.message
        );
        return;
    }

    mostrarMensagem(
        "Agendamento solicitado com sucesso! Aguarde a confirmação da barbearia.",
        true
    );

    dadosCliente.hidden = true;
    horarioSelecionado = null;

    nomeInput.value = "";
    telefoneInput.value = "";

    await buscarHorarios();

    console.log("Agendamento registrado:", data);
}

// ======================================
// EVENTOS
// ======================================

buscarBtn.addEventListener("click", buscarHorarios);

confirmarBtn.addEventListener("click", confirmarAgendamento);

servicoSelect.addEventListener("change", limparSelecao);
barbeiroSelect.addEventListener("change", limparSelecao);
dataInput.addEventListener("change", limparSelecao);

// ======================================
// INICIALIZAÇÃO
// ======================================

async function iniciarSite() {
    console.log("Conectando à Barbearia Prime...");

    await carregarServicos();
    await carregarBarbeiros();

    console.log("Barbearia Prime carregada!");
}

iniciarSite();

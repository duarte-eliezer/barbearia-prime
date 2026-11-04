
/* =====================================
   CONFIGURAÇÃO SUPABASE
===================================== */

const SUPABASE_URL = "https://zqeibwfycaknwczsjvrc.supabase.co";

// Use aqui a mesma chave PUBLICÁVEL já utilizada no app.js.
const SUPABASE_KEY = "sb_publishable_O6jr9-8YBIlQksSNlAuWlA_SmyOxE8M";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


/* =====================================
   ELEMENTOS E VARIÁVEIS
===================================== */

let todosAgendamentos = [];
let todosServicos = [];
let todosBarbeiros = [];

const fusoHorario = "America/Sao_Paulo";


/* =====================================
   FUNÇÕES AUXILIARES
===================================== */

function elemento(id) {
    return document.getElementById(id);
}

function mostrarMensagem(mensagem, erro = false) {
    const campo = elemento("mensagem-admin");

    campo.textContent = mensagem;
    campo.style.color = erro ? "#b94b42" : "#267342";
}

function formatarData(data) {
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: fusoHorario
    }).format(new Date(data));
}

function formatarHora(data) {
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: fusoHorario,
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date(data));
}

function obterDataLocal() {
    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: fusoHorario,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const valores = {};

    partes.forEach(parte => {
        valores[parte.type] = parte.value;
    });

    return `${valores.year}-${valores.month}-${valores.day}`;
}

function obterDataDoAgendamento(data) {
    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: fusoHorario,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date(data));

    const valores = {};

    partes.forEach(parte => {
        valores[parte.type] = parte.value;
    });

    return `${valores.year}-${valores.month}-${valores.day}`;
}

function nomeStatus(status) {
    const nomes = {
        pendente: "Pendente",
        confirmado: "Confirmado",
        cancelado: "Cancelado"
    };

    return nomes[status] || status;
}

function classeStatus(status) {
    const classes = {
        pendente: "pendente",
        confirmado: "confirmado",
        cancelado: "cancelado"
    };

    return classes[status] || "";
}

function criarElemento(tag, classe, texto) {
    const item = document.createElement(tag);

    if (classe) {
        item.className = classe;
    }

    if (texto !== undefined) {
        item.textContent = texto;
    }

    return item;
}


/* =====================================
   LOGIN
===================================== */

elemento("form-login").addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = elemento("email").value.trim();
    const senha = elemento("senha").value;

    elemento("mensagem-login").textContent = "Entrando...";

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password: senha
    });

    if (error) {
        elemento("mensagem-login").textContent =
            "E-mail ou senha inválidos.";

        return;
    }

    await verificarAdministrador();
});


/* =====================================
   VERIFICAR ADMINISTRADOR
===================================== */

async function verificarAdministrador() {
    const { data, error } = await supabaseClient.rpc("is_admin");

    if (error || data !== true) {
        await supabaseClient.auth.signOut();

        elemento("mensagem-login").textContent =
            "Você não tem permissão para acessar este painel.";

        return;
    }

    elemento("login").style.display = "none";
    elemento("painel").style.display = "block";

    await mostrarPainel();
}


/* =====================================
   CARREGAR PAINEL
===================================== */

async function mostrarPainel() {
    elemento("data-agenda").value = obterDataLocal();

    await carregarAgendamentos();
    await carregarServicos();
    await carregarBarbeiros();

    carregarAgenda();
}


/* =====================================
   SAIR
===================================== */

elemento("botao-sair").addEventListener("click", async function() {
    await supabaseClient.auth.signOut();
    location.reload();
});


/* =====================================
   AGENDAMENTOS
===================================== */

async function carregarAgendamentos() {
    const { data, error } = await supabaseClient
        .from("agendamentos")
        .select(`
            id,
            nome_cliente,
            telefone_cliente,
            inicio,
            fim,
            status,
            servicos(nome),
            barbeiros(nome)
        `)
        .order("inicio", { ascending: true });

    if (error) {
        mostrarMensagem("Erro ao carregar agendamentos.", true);
        console.error(error);
        return;
    }

    todosAgendamentos = data || [];

    atualizarResumo();
    mostrarAgendamentos();
}

function atualizarResumo() {
    elemento("total-agendamentos").textContent =
        todosAgendamentos.length;

    elemento("total-pendentes").textContent =
        todosAgendamentos.filter(item => item.status === "pendente").length;

    elemento("total-confirmados").textContent =
        todosAgendamentos.filter(item => item.status === "confirmado").length;
}

function mostrarAgendamentos() {
    const lista = elemento("lista-agendamentos");

    lista.innerHTML = "";

    todosAgendamentos.forEach(item => {
        const linha = document.createElement("tr");

        const dados = [
            item.nome_cliente,
            item.telefone_cliente,
            item.servicos?.nome || "—",
            item.barbeiros?.nome || "—",
            formatarData(item.inicio),
            formatarHora(item.inicio),
        ];

        dados.forEach(valor => {
            const celula = document.createElement("td");
            celula.textContent = valor;
            linha.appendChild(celula);
        });

        const celulaStatus = document.createElement("td");

        const status = criarElemento(
            "span",
            `status ${classeStatus(item.status)}`,
            nomeStatus(item.status)
        );

        celulaStatus.appendChild(status);
        linha.appendChild(celulaStatus);

        const celulaAcoes = document.createElement("td");

        if (item.status === "pendente") {
            const confirmar = criarElemento(
                "button",
                "botao-acao botao-confirmar",
                "Confirmar"
            );

            confirmar.addEventListener("click", () => {
                alterarStatus(item.id, "confirmado");
            });

            celulaAcoes.appendChild(confirmar);

            const cancelar = criarElemento(
                "button",
                "botao-acao botao-cancelar",
                "Cancelar"
            );

            cancelar.addEventListener("click", () => {
                alterarStatus(item.id, "cancelado");
            });

            celulaAcoes.appendChild(cancelar);
        }

        const whatsapp = criarElemento(
            "button",
            "botao-acao botao-whatsapp",
            "WhatsApp"
        );

        whatsapp.addEventListener("click", () => {
            abrirWhatsApp(item);
        });

        celulaAcoes.appendChild(whatsapp);

        linha.appendChild(celulaAcoes);

        lista.appendChild(linha);
    });
}


/* =====================================
   ALTERAR STATUS
===================================== */

async function alterarStatus(id, status) {
    const mensagem = status === "confirmado"
        ? "Deseja confirmar este agendamento?"
        : "Deseja cancelar este agendamento?";

    if (!confirm(mensagem)) {
        return;
    }

    const { error } = await supabaseClient
        .from("agendamentos")
        .update({ status })
        .eq("id", id);

    if (error) {
        mostrarMensagem("Não foi possível atualizar o agendamento.", true);
        console.error(error);
        return;
    }

    mostrarMensagem("Agendamento atualizado com sucesso!");

    await carregarAgendamentos();
    carregarAgenda();
}


/* =====================================
   WHATSAPP
===================================== */

function abrirWhatsApp(item) {
    const telefone = String(item.telefone_cliente || "")
        .replace(/\D/g, "");

    if (!telefone) {
        mostrarMensagem("Telefone do cliente não encontrado.", true);
        return;
    }

    const numero = telefone.startsWith("55")
        ? telefone
        : "55" + telefone;

    const mensagem =
        `Olá, ${item.nome_cliente}! Tudo bem? Aqui é da Barbearia Prime. ` +
        `Gostaríamos de falar sobre seu agendamento de ` +
        `${item.servicos?.nome || "serviço"} para o dia ` +
        `${formatarData(item.inicio)} às ${formatarHora(item.inicio)}.`;

    const link =
        `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;

    window.open(link, "_blank");
}


/* =====================================
   AGENDA DIÁRIA
===================================== */

async function carregarAgenda() {
    const dataSelecionada = elemento("data-agenda").value;

    if (!dataSelecionada) {
        mostrarMensagem("Selecione uma data.", true);
        return;
    }

    await carregarAgendamentos();

    const agendamentosDoDia = todosAgendamentos.filter(item => {
        return obterDataDoAgendamento(item.inicio) === dataSelecionada;
    });

    mostrarAgenda(agendamentosDoDia);
}

function mostrarAgenda(agendamentos) {
    const lista = elemento("lista-agenda");

    lista.innerHTML = "";

    elemento("agenda-total").textContent = agendamentos.length;

    elemento("agenda-confirmados").textContent =
        agendamentos.filter(item => item.status === "confirmado").length;

    elemento("agenda-pendentes").textContent =
        agendamentos.filter(item => item.status === "pendente").length;

    if (agendamentos.length === 0) {
        lista.appendChild(
            criarElemento(
                "div",
                "agenda-vazia",
                "Nenhum agendamento encontrado para esta data."
            )
        );

        return;
    }

    agendamentos.forEach(item => {
        const card = criarElemento("article", "agenda-card");

        const horario = criarElemento(
            "div",
            "agenda-hora",
            formatarHora(item.inicio)
        );

        const detalhes = criarElemento("div", "agenda-detalhes");

        detalhes.appendChild(
            criarElemento("h3", "", item.nome_cliente)
        );

        detalhes.appendChild(
            criarElemento(
                "p",
                "",
                `Serviço: ${item.servicos?.nome || "Não informado"}`
            )
        );

        detalhes.appendChild(
            criarElemento(
                "p",
                "",
                `Barbeiro: ${item.barbeiros?.nome || "Não informado"}`
            )
        );

        detalhes.appendChild(
            criarElemento(
                "p",
                "",
                `Telefone: ${item.telefone_cliente}`
            )
        );

        const status = criarElemento(
            "span",
            `status ${classeStatus(item.status)}`,
            nomeStatus(item.status)
        );

        detalhes.appendChild(status);

        const acoes = criarElemento("div", "agenda-acoes");

        if (item.status === "pendente") {
            const confirmar = criarElemento(
                "button",
                "botao-acao botao-confirmar",
                "Confirmar"
            );

            confirmar.addEventListener("click", () => {
                alterarStatus(item.id, "confirmado");
            });

            acoes.appendChild(confirmar);

            const cancelar = criarElemento(
                "button",
                "botao-acao botao-cancelar",
                "Cancelar"
            );

            cancelar.addEventListener("click", () => {
                alterarStatus(item.id, "cancelado");
            });

            acoes.appendChild(cancelar);
        }

        const whatsapp = criarElemento(
            "button",
            "botao-acao botao-whatsapp",
            "WhatsApp"
        );

        whatsapp.addEventListener("click", () => {
            abrirWhatsApp(item);
        });

        acoes.appendChild(whatsapp);

        card.appendChild(horario);
        card.appendChild(detalhes);
        card.appendChild(acoes);

        lista.appendChild(card);
    });
}


/* =====================================
   BOTÃO BUSCAR AGENDA
===================================== */

elemento("buscar-agenda").addEventListener("click", carregarAgenda);


/* =====================================
   SERVIÇOS
===================================== */

async function carregarServicos() {
    const { data, error } = await supabaseClient
        .from("servicos")
        .select("*")
        .order("nome");

    if (error) {
        mostrarMensagem("Erro ao carregar serviços.", true);
        console.error(error);
        return;
    }

    todosServicos = data || [];

    mostrarServicos();
}

function mostrarServicos() {
    const lista = elemento("lista-servicos-admin");

    lista.innerHTML = "";

    todosServicos.forEach(servico => {
        const linha = document.createElement("tr");

        const valores = [
            servico.nome,
            `${servico.duracao} min`,
            Number(servico.preco).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
            })
        ];

        valores.forEach(valor => {
            const celula = document.createElement("td");
            celula.textContent = valor;
            linha.appendChild(celula);
        });

        const status = criarElemento(
            "span",
            `status ${servico.ativo ? "confirmado" : "cancelado"}`,
            servico.ativo ? "Ativo" : "Inativo"
        );

        const celulaStatus = document.createElement("td");
        celulaStatus.appendChild(status);
        linha.appendChild(celulaStatus);

        const celulaAcao = document.createElement("td");

        const botao = criarElemento(
            "button",
            "botao-acao",
            servico.ativo ? "Desativar" : "Ativar"
        );

        botao.addEventListener("click", () => {
            alterarAtivo("servicos", servico.id, !servico.ativo);
        });

        celulaAcao.appendChild(botao);
        linha.appendChild(celulaAcao);

        lista.appendChild(linha);
    });
}

elemento("form-servico").addEventListener("submit", async function(event) {
    event.preventDefault();

    const nome = elemento("nome-servico").value.trim();
    const descricao = elemento("descricao-servico").value.trim();
    const duracao = Number(elemento("duracao-servico").value);
    const preco = Number(elemento("preco-servico").value);

    const { error } = await supabaseClient
        .from("servicos")
        .insert({
            nome,
            descricao,
            duracao,
            preco,
            ativo: true
        });

    if (error) {
        mostrarMensagem("Erro ao cadastrar serviço.", true);
        console.error(error);
        return;
    }

    this.reset();

    mostrarMensagem("Serviço cadastrado com sucesso!");

    await carregarServicos();
});


/* =====================================
   BARBEIROS
===================================== */

async function carregarBarbeiros() {
    const { data, error } = await supabaseClient
        .from("barbeiros")
        .select("*")
        .order("nome");

    if (error) {
        mostrarMensagem("Erro ao carregar barbeiros.", true);
        console.error(error);
        return;
    }

    todosBarbeiros = data || [];

    mostrarBarbeiros();
}

function mostrarBarbeiros() {
    const lista = elemento("lista-barbeiros-admin");

    lista.innerHTML = "";

    todosBarbeiros.forEach(barbeiro => {
        const linha = document.createElement("tr");

        const nome = document.createElement("td");
        nome.textContent = barbeiro.nome;

        const status = criarElemento(
            "span",
            `status ${barbeiro.ativo ? "confirmado" : "cancelado"}`,
            barbeiro.ativo ? "Ativo" : "Inativo"
        );

        const celulaStatus = document.createElement("td");
        celulaStatus.appendChild(status);

        const celulaAcao = document.createElement("td");

        const botao = criarElemento(
            "button",
            "botao-acao",
            barbeiro.ativo ? "Desativar" : "Ativar"
        );

        botao.addEventListener("click", () => {
            alterarAtivo("barbeiros", barbeiro.id, !barbeiro.ativo);
        });

        celulaAcao.appendChild(botao);

        linha.appendChild(nome);
        linha.appendChild(celulaStatus);
        linha.appendChild(celulaAcao);

        lista.appendChild(linha);
    });
}

elemento("form-barbeiro").addEventListener("submit", async function(event) {
    event.preventDefault();

    const nome = elemento("nome-barbeiro").value.trim();

    const { error } = await supabaseClient
        .from("barbeiros")
        .insert({
            nome,
            ativo: true
        });

    if (error) {
        mostrarMensagem("Erro ao cadastrar barbeiro.", true);
        console.error(error);
        return;
    }

    this.reset();

    mostrarMensagem("Barbeiro cadastrado com sucesso!");

    await carregarBarbeiros();
});


/* =====================================
   ATIVAR / DESATIVAR
===================================== */

async function alterarAtivo(tabela, id, ativo) {
    const { error } = await supabaseClient
        .from(tabela)
        .update({ ativo })
        .eq("id", id);

    if (error) {
        mostrarMensagem("Não foi possível alterar o status.", true);
        console.error(error);
        return;
    }

    mostrarMensagem("Status atualizado com sucesso!");

    if (tabela === "servicos") {
        await carregarServicos();
    }

    if (tabela === "barbeiros") {
        await carregarBarbeiros();
    }
}


/* =====================================
   NAVEGAÇÃO DO MENU
===================================== */

document.querySelectorAll(".menu-admin button").forEach(botao => {

    botao.addEventListener("click", function() {

        const areaSelecionada = this.dataset.area;

        document.querySelectorAll(".area-admin").forEach(area => {
            area.hidden = true;
        });

        document.querySelectorAll(".menu-admin button").forEach(item => {
            item.classList.remove("ativo");
        });

        elemento(`area-${areaSelecionada}`).hidden = false;

        this.classList.add("ativo");

        if (areaSelecionada === "agenda") {
            carregarAgenda();
        }

        if (areaSelecionada === "agendamentos") {
            carregarAgendamentos();
        }

    });

});


/* =====================================
   ATUALIZAÇÃO MANUAL
===================================== */

const botaoAtualizar = criarElemento(
    "button",
    "botao-atualizar",
    "Atualizar dados"
);

botaoAtualizar.type = "button";

botaoAtualizar.addEventListener("click", async function() {
    await carregarAgendamentos();
    await carregarServicos();
    await carregarBarbeiros();
    await carregarAgenda();

    mostrarMensagem("Dados atualizados com sucesso!");
});

elemento("painel").querySelector(".topo-admin").appendChild(botaoAtualizar);


/* =====================================
   VERIFICAR SESSÃO AO ABRIR
===================================== */

async function iniciarPainel() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        console.error(error);
        return;
    }

    if (data.session) {
        await verificarAdministrador();
    }
}

iniciarPainel();

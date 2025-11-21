// URL base da API
const API_URL = 'https://api-da-faculdade.onrender.com';

// Variável para controlar modo de edição
let modoEdicao = false;
let raEmEdicao = null;
let modalAluno; // Armazenar instância do modal 
let alunosCache = [];
let alunoSelecionado = null;



// Carregar alunos ao iniciar a página
document.addEventListener('DOMContentLoaded', function () {
    carregarAlunos();
    carregarCobrancas();

    // Inicializar modal de alunos
    modalAluno = new bootstrap.Modal(document.getElementById('modalAluno'));

    // Inicializar variáveis do modal gerar cobrança apenas após DOM carregado
    searchAlunoInput = document.getElementById('searchAluno');
    listaAlunosDropdown = document.getElementById('listaAlunosDropdown');

    // Eventos filtro alunos e gerar cobrança
    document.getElementById('filtroAlunos').addEventListener('input', filtrarAlunos);
    searchAlunoInput.addEventListener('input', () => {
        preencherListaAlunosDropdown(searchAlunoInput.value);
    });

    // Limpar formulário modal alunos ao fechar
    document.getElementById('modalAluno').addEventListener('hidden.bs.modal', () => {
        if (!modoEdicao) limparFormulario();
    });

    // Limpar formulário modal gerar cobrança ao fechar
    modalGerarCobrancaElm.addEventListener('hidden.bs.modal', () => {
        limparFormularioGerarCobranca();
    });

    // Fechar dropdown aluno ao clicar fora
    document.addEventListener('click', e => {
        if (!searchAlunoInput.contains(e.target) && !listaAlunosDropdown.contains(e.target)) {
            listaAlunosDropdown.style.display = 'none';
        }
    });
});



// Função para submeter o formulário (chamada pelo botão do modal)
function submitForm() {
    if (modoEdicao) {
        atualizarAluno();
    } else {
        cadastrarAluno();
    }
}


// Função para carregar todos os alunos
function carregarAlunos() {
    fetch(`${API_URL}/alunos`)
        .then(response => response.json())
        .then(data => {
            exibirAlunos(data);
        })
        .catch(error => {
            console.error('Erro ao carregar alunos:', error);
            document.getElementById('alunosTableBody').innerHTML =
                '<tr><td colspan="6" class="text-center text-danger">Erro ao carregar alunos</td></tr>';
        });
}

// Função para exibir alunos na tabela
function exibirAlunos(alunos) {
    const tbody = document.getElementById('alunosTableBody');

    if (alunos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum aluno cadastrado</td></tr>';
        return;
    }

    tbody.innerHTML = '';

    alunos.forEach(aluno => {
        const statusBadge = aluno.ativo
            ? '<span class="badge bg-success">Ativo</span>'
            : '<span class="badge bg-danger">Inativo</span>';

        const acoes = aluno.ativo
            ? `<button class="btn btn-sm btn-warning" onclick="editarAluno('${aluno.ra}')">Editar</button>
               <button class="btn btn-sm btn-danger" onclick="desativarAluno('${aluno.ra}')">Desativar</button>`
            : `<button class="btn btn-sm btn-success" onclick="reativarAluno('${aluno.ra}')">Reativar</button>`;

        const row = `
            <tr>
                <td>${aluno.ra}</td>
                <td>${aluno.nome}</td>
                <td>${aluno.email}</td>
                <td>R$ ${aluno.mensalidade.toFixed(2)}</td>
                <td>${statusBadge}</td>
                <td>${acoes}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Função para cadastrar novo aluno
function cadastrarAluno() {
    const aluno = {
        nome: document.getElementById('nome').value,
        ra: document.getElementById('ra').value,
        email: document.getElementById('email').value,
        senha: document.getElementById('senha').value,
        mensalidade: parseFloat(document.getElementById('mensalidade').value.replace(/\./g, '').replace(',', '.'))
    };

    fetch(`${API_URL}/alunos`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(aluno)
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Erro ao cadastrar aluno');
            }
        })
        .then(data => {
            alert('Aluno cadastrado com sucesso!');
            modalAluno.hide(); // Fechar modal
            limparFormulario();
            carregarAlunos();
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao cadastrar aluno. Verifique se o RA já não está cadastrado.');
        });
}


// Função para buscar aluno por RA
function buscarPorRA() {
    const ra = document.getElementById('buscarRA').value;

    if (!ra) {
        alert('Digite um RA para buscar');
        return;
    }

    fetch(`${API_URL}/alunos/${ra}`)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Aluno não encontrado');
            }
        })
        .then(aluno => {
            const statusBadge = aluno.ativo
                ? '<span class="badge bg-success">Ativo</span>'
                : '<span class="badge bg-danger">Inativo</span>';

            document.getElementById('resultadoBusca').innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h6>Resultado da Busca:</h6>
                        <p><strong>RA:</strong> ${aluno.ra}</p>
                        <p><strong>Nome:</strong> ${aluno.nome}</p>
                        <p><strong>Email:</strong> ${aluno.email}</p>
                        <p><strong>Mensalidade:</strong> R$ ${aluno.mensalidade.toFixed(2)}</p>
                        <p><strong>Status:</strong> ${statusBadge}</p>
                    </div>
                </div>
            `;
        })
        .catch(error => {
            document.getElementById('resultadoBusca').innerHTML =
                '<div class="alert alert-danger">Aluno não encontrado</div>';
        });
}

function editarAluno(ra) {
    fetch(`${API_URL}/alunos/${ra}`)
        .then(response => response.json())
        .then(aluno => {
            document.getElementById('nome').value = aluno.nome;
            document.getElementById('ra').value = aluno.ra;
            document.getElementById('ra').disabled = true; // bloquear edição do RA
            document.getElementById('email').value = aluno.email;
            document.getElementById('senha').value = ''; // limpar para não mostrar hash
            document.getElementById('mensalidade').value = formatarValorParaBRL(aluno.mensalidade);

            modoEdicao = true;
            raEmEdicao = ra;

            document.getElementById('modalAlunoLabel').textContent = 'Atualizar Aluno';
            document.getElementById('btnSubmit').textContent = 'Atualizar';

            modalAluno.show();
        })
        .catch(error => {
            console.error('Erro ao carregar aluno:', error);
            alert('Erro ao carregar dados do aluno');
        });
}



// Função para atualizar aluno
function atualizarAluno() {
    const aluno = {
        nome: document.getElementById('nome').value,
        email: document.getElementById('email').value,
        senha: document.getElementById('senha').value,
        mensalidade: parseFloat(document.getElementById('mensalidade').value)
    };

    fetch(`${API_URL}/alunos/${raEmEdicao}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(aluno)
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Erro ao atualizar aluno');
            }
        })
        .then(data => {
            alert('Aluno atualizado com sucesso!');
            modalAluno.hide(); // Fechar modal
            cancelarEdicao();
            carregarAlunos();
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao atualizar aluno');
        });
}


// Função para desativar aluno
function desativarAluno(ra) {
    if (!confirm('Tem certeza que deseja desativar este aluno?')) {
        return;
    }

    fetch(`${API_URL}/alunos/${ra}`, {
        method: 'DELETE'
    })
        .then(response => {
            if (response.ok) {
                alert('Aluno desativado com sucesso!');
                carregarAlunos();
            } else {
                throw new Error('Erro ao desativar aluno');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao desativar aluno');
        });
}

// Função para reativar aluno
function reativarAluno(ra) {
    if (!confirm('Tem certeza que deseja reativar este aluno?')) {
        return;
    }

    fetch(`${API_URL}/alunos/reativar/${ra}`, {
        method: 'PUT'
    })
        .then(response => {
            if (response.ok) {
                alert('Aluno reativado com sucesso!');
                carregarAlunos();
            } else {
                throw new Error('Erro ao reativar aluno');
            }
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao reativar aluno');
        });
}

// Função para cancelar edição
function cancelarEdicao() {
    modoEdicao = false;
    raEmEdicao = null;
    limparFormulario();
    document.getElementById('modalAlunoLabel').textContent = 'Cadastrar Novo Aluno';
    document.getElementById('btnSubmit').textContent = 'Cadastrar';
    document.getElementById('ra').disabled = false;
}


// Função para limpar formulário
function limparFormulario() {
    document.getElementById('alunoForm').reset();
}


// Função para filtrar alunos em tempo real
function filtrarAlunos() {
    const filtro = document.getElementById('filtroAlunos').value.toLowerCase();
    const linhas = document.querySelectorAll('#alunosTableBody tr');

    linhas.forEach(linha => {
        const texto = linha.textContent.toLowerCase();
        if (texto.includes(filtro)) {
            linha.style.display = '';
        } else {
            linha.style.display = 'none';
        }
    });
}


function carregarCobrancas() {
    fetch(`${API_URL}/cobrancas`)
        .then(response => response.json())
        .then(data => {
            // Ordenar por dataGeracao decrescente
            data.sort((a, b) => new Date(b.dataGeracao) - new Date(a.dataGeracao));
            exibirCobrancas(data);
        })
        .catch(error => {
            console.error('Erro ao carregar cobranças:', error);
            document.getElementById('cobrancasTableBody').innerHTML =
                '<tr><td colspan="6" class="text-center text-danger">Erro ao carregar cobranças</td></tr>';
        });
}


function exibirCobrancas(cobrancas) {
    const tbody = document.getElementById('cobrancasTableBody');

    if (cobrancas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhuma cobrança registrada</td></tr>';
        return;
    }
    tbody.innerHTML = '';
    cobrancas.forEach(cob => {
        const alunoInfo = cob.aluno ? `${cob.aluno.nome} (${cob.aluno.ra})` : '-';
        let statusBadge;
        switch (cob.status) {
            case 'PAGO':
                statusBadge = '<span class="badge bg-success">Pago</span>'; break;
            case 'VENCIDO':
                statusBadge = '<span class="badge bg-danger">Vencido</span>'; break;
            case 'CANCELADO':
                statusBadge = '<span class="badge bg-secondary">Cancelado</span>'; break;
            default:
                statusBadge = '<span class="badge bg-warning text-dark">Em Aberto</span>';
        }

        // Botão alterar status abre prompt simples, ou pode ser um modal (exemplo de prompt aqui)
        const btnAlterar = `<button class="btn btn-sm btn-warning" onclick="abrirModalAlterarStatus('${cob.linhaDigitavel}', '${cob.status}')">Alterar Status</button>`;

        const row = `
            <tr>
                <td  style="white-space: nowrap;">${alunoInfo}</td>
                <td  style="white-space: nowrap;">${cob.linhaDigitavel}</td>
                <td  style="white-space: nowrap;">R$ ${cob.valor.toFixed(2)}</td>
                <td  style="white-space: nowrap;">${statusBadge}</td>
                <td  style="white-space: nowrap;">${formatarData(cob.dataVencimento)}</td>
                <td  style="white-space: nowrap;">${formatarDataHora(cob.dataGeracao)}</td>
                <td  style="white-space: nowrap;">${btnAlterar}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}


let linhaDigitavelAtual = null;
const modalAlterarStatusElm = new bootstrap.Modal(document.getElementById('modalAlterarStatus'));

function abrirModalAlterarStatus(linhaDigitavel, statusAtual) {
    linhaDigitavelAtual = linhaDigitavel;
    // Ajusta o valor do select para o status atual da cobrança
    document.getElementById('selectStatus').value = statusAtual || 'EM_ABERTO';
    document.getElementById('msgAlterarStatus').innerHTML = '';
    modalAlterarStatusElm.show();
}

function confirmarAlterarStatus() {
    const novoStatus = document.getElementById('selectStatus').value;
    if (!linhaDigitavelAtual || !novoStatus) {
        alert('Dados inválidos');
        return;
    }
    fetch(`${API_URL}/cobrancas/status/${linhaDigitavelAtual}?status=${novoStatus}`, {
        method: 'PUT',
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Erro ao atualizar status');
            }
        })
        .then(data => {
            document.getElementById('msgAlterarStatus').innerHTML = `<div class="alert alert-success">Status atualizado com sucesso!</div>`;
            carregarCobrancas();
            setTimeout(() => {
                modalAlterarStatusElm.hide();
            }, 1000);
        })
        .catch(error => {
            document.getElementById('msgAlterarStatus').innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        });
}



function alterarStatus(linhaDigitavel) {
    const statusAtual = prompt("Digite o novo status para a cobrança:\nValores válidos: EM_ABERTO, PAGO, VENCIDO, CANCELADO", "EM_ABERTO");
    if (!statusAtual) return; // Cancelado
    const statusVal = statusAtual.toUpperCase();

    const validos = ['EM_ABERTO', 'PAGO', 'VENCIDO', 'CANCELADO'];
    if (!validos.includes(statusVal)) {
        alert('Status inválido. Use um dos valores: EM_ABERTO, PAGO, VENCIDO, CANCELADO');
        return;
    }

    fetch(`${API_URL}/cobrancas/status/${linhaDigitavel}?status=${statusVal}`, {
        method: 'PUT',
    })
        .then(res => {
            if (res.ok) {
                alert('Status atualizado com sucesso!');
                carregarCobrancas();
            } else {
                throw new Error('Erro ao atualizar status');
            }
        })
        .catch(err => {
            alert('Erro: ' + err.message);
        });
}



// Funções auxiliares de formatação de datas
function formatarData(dataStr) {
    if (!dataStr) return '-';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(dataHoraStr) {
    if (!dataHoraStr) return '-';
    const [data, hora] = dataHoraStr.split('T');
    return formatarData(data) + ' ' + hora.substring(0, 5);
}

function toggleSenha() {
    const senhaInput = document.getElementById('senha');
    const btnIcon = document.querySelector('#toggleSenhaBtn i');

    if (senhaInput.type === 'password') {
        senhaInput.type = 'text';
        btnIcon.classList.remove('bi-eye');
        btnIcon.classList.add('bi-eye-slash');
    } else {
        senhaInput.type = 'password';
        btnIcon.classList.remove('bi-eye-slash');
        btnIcon.classList.add('bi-eye');
    }
}


// Quando abrir o modal de gerar cobrança
const modalGerarCobrancaElm = document.getElementById('modalGerarCobranca');

modalGerarCobrancaElm.addEventListener('show.bs.modal', () => {
    carregarTodosAlunosParaGerarCobranca();
    limparFormularioGerarCobranca();

    const dataVencimentoInput = document.getElementById('dataVencimento');
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);

    // Formata para yyyy-MM-dd
    const yyyy = amanha.getFullYear();
    const mm = String(amanha.getMonth() + 1).padStart(2, '0');
    const dd = String(amanha.getDate()).padStart(2, '0');

    const dataMinima = `${yyyy}-${mm}-${dd}`;
    dataVencimentoInput.min = dataMinima;
});


function carregarTodosAlunosParaGerarCobranca() {
    fetch(`${API_URL}/alunos`)
        .then(res => res.json())
        .then(data => {
            alunosCache = data;
        })
        .catch(err => {
            console.error('Erro ao carregar alunos para gerar cobrança', err);
        });
}


let searchAlunoInput;
let listaAlunosDropdown;


function preencherListaAlunosDropdown(filtro) {
    const filtroLower = filtro.toLowerCase();
    const alunosFiltrados = alunosCache.filter(a =>
        a.nome.toLowerCase().includes(filtroLower) || a.ra.toLowerCase().includes(filtroLower)
    );

    if (alunosFiltrados.length === 0) {
        listaAlunosDropdown.style.display = 'none';
        listaAlunosDropdown.innerHTML = '';
        alunoSelecionado = null;
        preencherValorCobranca(null);
        return;
    }

    let html = '';
    alunosFiltrados.forEach(a => {
        html += `<li class="list-group-item list-group-item-action" style="cursor: pointer;" data-ra="${a.ra}">${a.nome} (${a.ra})</li>`;
    });

    listaAlunosDropdown.innerHTML = html;
    listaAlunosDropdown.style.display = 'block';

    // Adiciona evento para clique em item da lista
    Array.from(listaAlunosDropdown.children).forEach(item => {
        item.addEventListener('click', () => {
            const ra = item.getAttribute('data-ra');
            alunoSelecionado = alunosCache.find(a => a.ra === ra);
            searchAlunoInput.value = `${alunoSelecionado.nome} (${alunoSelecionado.ra})`;
            listaAlunosDropdown.style.display = 'none';
            preencherValorCobranca(alunoSelecionado);
        });
    });
}


// Fechar dropdown se clicar fora do input ou da lista
document.addEventListener('click', (e) => {
    if (!searchAlunoInput.contains(e.target) && !listaAlunosDropdown.contains(e.target)) {
        listaAlunosDropdown.style.display = 'none';
    }
});


// Preenche o campo valor com a mensalidade do aluno selecionado
function preencherValorCobranca(aluno) {
    const valorInput = document.getElementById('valorCobranca');
    if (aluno && aluno.mensalidade) {
        valorInput.value = formatarValorParaBRL(aluno.mensalidade);
    } else {
        valorInput.value = '';
    }
}


// Função auxiliar para formatar valor numérico em moeda BRL
function formatarValorParaBRL(valor) {
  if (valor == null || valor === '') return '';
  
  // Converte para número com duas casas decimais
  let num = parseFloat(valor).toFixed(2);
  
  // Substitui ponto por vírgula
  num = num.replace('.', ',');
  
  // Adiciona separadores de milhar
  num = num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return num;
}


modalGerarCobrancaElm.addEventListener('hidden.bs.modal', () => {
    limparFormularioGerarCobranca();
});

function limparFormularioGerarCobranca() {
    searchAlunoInput.value = '';
    listaAlunosDropdown.innerHTML = '';
    listaAlunosDropdown.style.display = 'none';
    alunoSelecionado = null;
    document.getElementById('valorCobranca').value = '';
    document.getElementById('dataVencimento').value = '';
    document.getElementById('msgGerarCobranca').innerHTML = '';
}



// Função para enviar os dados para gerar a cobrança
function gerarCobranca() {
    if (!alunoSelecionado) {
        alert('Selecione um aluno');
        return;
    }

    const valor = obterValorNumerico();
    if (isNaN(valor) || valor <= 0) {
        alert('Informe um valor válido para a cobrança');
        return;
    }


    const dataVencimentoInput = document.getElementById('dataVencimento').value; // yyyy-MM-dd

    if (!dataVencimentoInput) {
        alert('Informe a data de vencimento');
        return;
    }

    // Converte a data de yyyy-MM-dd para dd/MM/yyyy
    const parts = dataVencimentoInput.split('-');
    const dataVencimento = `${parts[2]}/${parts[1]}/${parts[0]}`;

    // Monta URL com query params corretamente formatados
    const url = new URL(`${API_URL}/cobrancas`);
    url.searchParams.append('ra', alunoSelecionado.ra);
    url.searchParams.append('valor', valor);
    url.searchParams.append('dataVencimento', dataVencimento);

    fetch(url.toString(), {
        method: 'POST',
    })
        .then(res => {
            if (res.status === 201) {
                return res.json();
            } else {
                throw new Error('Erro ao gerar cobrança');
            }
        })
        .then(data => {
            document.getElementById('msgGerarCobranca').innerHTML = `<div class="alert alert-success">Cobrança gerada com sucesso!</div>`;
            carregarCobrancas();
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(modalGerarCobrancaElm);
                modal.hide();
                limparFormularioGerarCobranca();
            }, 1500);
        })
        .catch(error => {
            document.getElementById('msgGerarCobranca').innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        });
}


// Função para formatar valor em moeda BRL enquanto digita
function formatarMoedaBRL(e) {
  let value = e.target.value;

  // Remove tudo que não é número
  value = value.replace(/\D/g, '');

  if (value === '') {
    e.target.value = '';
    return;
  }

  // Converte para número e ajusta as casas decimais
  let num = (parseInt(value, 10) / 100).toFixed(2);

  // Formata para padrão BR, substitui ponto por vírgula
  num = num.replace('.', ',');

  // Adiciona separadores de milhar
  num = num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  e.target.value = num;
}


const mensalidadeInput = document.getElementById('mensalidade');
mensalidadeInput.addEventListener('input', formatarMoedaBRL);


const valorCobrancaInput = document.getElementById('valorCobranca');
valorCobrancaInput.addEventListener('input', formatarMoedaBRL);

function obterValorNumerico() {
    let val = valorCobrancaInput.value;
    val = val.replace(/\./g, '').replace(',', '.');
    return parseFloat(val);
}







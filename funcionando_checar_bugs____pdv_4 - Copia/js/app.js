import { UI } from './ui.js';
import { Services } from './services.js';

const App = {
    db: null,
    usuarioLogado: null,
    vendaAtual: {},
    ultimaVendaConcluida: null,
    formaPagamentoSelecionada: null,
    edicaoProdutoId: null,
    edicaoClienteId: null,
    edicaoFornecedorId: null,
    edicaoBandeiraId: null,
    edicaoPixId: null,
    descontoVenda: { tipo: 'valor', valor: 0 },
    acrescimoVenda: { tipo: 'valor', valor: 0 },
    pagamentosMistos: [],
    recuperacao: {
        userId: null,
        usuario: null,
    },
    graficos: {
        pagamentos: null,
        produtos: null,
        faturamento: null,
    },
    ordenacaoAtual: {
        tabela: '',
        coluna: null,
        direcao: 'asc'
    },

    async init() {
        await this.initDB();
        await this.aplicarCustomizacoes();
        this.initEventListeners();
        this.setupFormNavigation();

        if (sessionStorage.getItem('usuarioLogado')) {
            this.mostrarApp();
        } else {
            this.mostrarLogin();
        }
    },

    initDB() {
        this.db = new Dexie("PDVDatabase");
        // CORREÇÃO: Adicionada a tabela 'pix' à definição da base de dados.
        this.db.version(8).stores({
            produtos: '++id, nome, nomeNormalizado, estoque',
            clientes: '++id, nome',
            vendas: '++id, dataHora, clienteId, bandeiraId, status',
            bandeiras: '++id, nome, tipo',
            fornecedores: '++id, nome',
            configuracoes: 'key',
            usuarios: '++id, &usuario, perguntaSeguranca',
            pix: '++id, nome'
        });
        Services.init(this.db);
        return Services.verificarUsuarioPadrao();
    },

    initEventListeners() {
        document.getElementById('form-login').addEventListener('submit', (e) => this.fazerLogin(e));
        document.getElementById('form-cadastro-produto').addEventListener('submit', (e) => this.salvarProduto(e));
        document.getElementById('form-cadastro-cliente').addEventListener('submit', (e) => this.salvarCliente(e));
        document.getElementById('form-cadastro-fornecedor').addEventListener('submit', (e) => this.salvarFornecedor(e));
        document.getElementById('form-cadastro-bandeira').addEventListener('submit', (e) => this.salvarBandeira(e));
        document.getElementById('form-cadastro-usuario').addEventListener('submit', (e) => this.salvarUsuario(e));
        // CORREÇÃO: Listeners para o formulário de PIX
        document.getElementById('form-cadastro-pix').addEventListener('submit', (e) => this.salvarPix(e));
        document.getElementById('btn-cancelar-edicao-pix').addEventListener('click', () => this.cancelarEdicaoPix());

        document.getElementById('busca-produto').addEventListener('input', (e) => this.atualizarProdutosGrid(e.target.value));
        document.getElementById('busca-produto-gerenciar').addEventListener('input', (e) => this.atualizarListaGerenciamentoProdutos(e.target.value));
        document.getElementById('busca-cliente-gerenciar').addEventListener('input', (e) => this.atualizarListaGerenciamentoClientes(e.target.value));
        document.getElementById('busca-fornecedor-gerenciar').addEventListener('input', (e) => this.atualizarListaGerenciamentoFornecedores(e.target.value));
        document.getElementById('filtro-data-relatorio').addEventListener('change', () => this.preencherRelatorio());
        document.getElementById('import-file-input').addEventListener('change', (e) => this.importarDados(e));
        document.querySelectorAll('#tela-relatorios .tab-btn').forEach(btn => btn.addEventListener('click', (e) => this.switchTab('tela-relatorios', e.target.id, 'conteudo-')));
        document.querySelectorAll('#tela-configuracoes .tab-btn').forEach(btn => btn.addEventListener('click', (e) => this.switchTab('tela-configuracoes', e.target.id, 'conteudo-')));
        
        const btnSalvarAparencia = document.getElementById('btn-salvar-aparencia');
        if (btnSalvarAparencia) btnSalvarAparencia.addEventListener('click', () => this.salvarAparencia());
        
        const btnRedefinirAparencia = document.getElementById('btn-redefinir-aparencia');
        if(btnRedefinirAparencia) btnRedefinirAparencia.addEventListener('click', () => this.redefinirAparencia());
        
        const imagemLogoInput = document.getElementById('imagem-logo');
        if (imagemLogoInput) imagemLogoInput.addEventListener('change', (e) => this.previewLogo(e));
        
        document.getElementById('link-recuperar-senha').addEventListener('click', (e) => { e.preventDefault(); this.mostrarTelaRecuperacao(); });
        document.getElementById('link-voltar-login').addEventListener('click', (e) => { e.preventDefault(); this.mostrarLogin(); });
        document.getElementById('btn-avancar-recuperacao').addEventListener('click', () => this.verificarUsuarioParaRecuperacao());
        document.getElementById('btn-verificar-resposta').addEventListener('click', () => this.verificarRespostaParaRecuperacao());
        document.getElementById('btn-salvar-nova-senha').addEventListener('click', () => this.finalizarRecuperacaoSenha());
    },

    async aplicarCustomizacoes() {
        const nomeEmpresa = await Services.getConfig('nomeEmpresa');
        const logoBase64 = await Services.getConfig('logoImage');
        const corTema = await Services.getConfig('themeColor');

        const nomePadrao = "Miro Gás & Água";
        const corPadrao = "#2563eb";

        const nomeFinal = nomeEmpresa ? nomeEmpresa.value : nomePadrao;
        const corFinal = corTema ? corTema.value : corPadrao;

        document.getElementById('titulo-login').textContent = nomeFinal;
        document.getElementById('titulo-header').textContent = `${nomeFinal} PDV`;

        const logoLogin = document.getElementById('logo-login');
        const logoHeader = document.getElementById('logo-header');
        const logoPreview = document.getElementById('logo-preview');

        if (logoBase64 && logoBase64.value) {
            logoLogin.src = logoBase64.value;
            logoHeader.src = logoBase64.value;
            logoLogin.classList.remove('hidden');
            logoHeader.classList.remove('hidden');
            if (logoPreview) {
                logoPreview.innerHTML = `<img src="${logoBase64.value}" class="max-h-full max-w-full">`;
            }
        } else {
            logoLogin.classList.add('hidden');
            logoHeader.classList.add('hidden');
             if (logoPreview) {
                logoPreview.innerHTML = `<span class="text-gray-500">Sem logo</span>`;
            }
        }
        
        const styleSheet = document.getElementById('estilos-customizados');
        if(styleSheet) {
            styleSheet.innerHTML = `
                :root {
                    --cor-primaria: ${corFinal};
                    --cor-primaria-hover: ${this.ajustarBrilhoCor(corFinal, -10)};
                }
                #app-container > header { background-color: var(--cor-primaria) !important; }
                .btn-primario { 
                    background-color: var(--cor-primaria) !important;
                    border-color: var(--cor-primaria) !important;
                }
                .btn-primario:hover { 
                    background-color: var(--cor-primaria-hover) !important;
                    border-color: var(--cor-primaria-hover) !important;
                }
                .nav-btn-active {
                    color: var(--cor-primaria) !important;
                    border-color: var(--cor-primaria) !important;
                }
                .tab-btn-active {
                    color: var(--cor-primaria) !important;
                    border-color: var(--cor-primaria) !important;
                }
            `;
        }

        const nomeEmpresaInput = document.getElementById('nome-empresa');
        const corTemaInput = document.getElementById('cor-tema');
        if (nomeEmpresaInput) nomeEmpresaInput.value = nomeFinal;
        if (corTemaInput) corTemaInput.value = corFinal;
    },

    async salvarAparencia() {
        const nomeEmpresa = document.getElementById('nome-empresa').value;
        const corTema = document.getElementById('cor-tema').value;
        const logoFile = document.getElementById('imagem-logo').files[0];

        await Services.setConfig('nomeEmpresa', this.sanitizar(nomeEmpresa));
        await Services.setConfig('themeColor', corTema);

        if (logoFile) {
            const logoBase64 = await this.toBase64(logoFile);
            await Services.setConfig('logoImage', logoBase64);
        }

        await this.aplicarCustomizacoes();
        this.showModal("Aparência salva com sucesso!");
    },
    
    redefinirAparencia() {
        this.showConfirmation("Tem certeza que deseja redefinir a aparência para o padrão?", async () => {
            await this.db.configuracoes.bulkDelete(['nomeEmpresa', 'logoImage', 'themeColor']);
            document.getElementById('imagem-logo').value = '';
            await this.aplicarCustomizacoes();
            this.showModal("Aparência redefinida.");
        });
    },

    async previewLogo(event) {
        const file = event.target.files[0];
        if (file) {
            const base64Image = await this.toBase64(file);
            document.getElementById('logo-preview').innerHTML = `<img src="${base64Image}" class="max-h-full max-w-full">`;
        }
    },
    
    ajustarBrilhoCor(hex, percent) {
        hex = hex.replace(/^\s*#|\s*$/g, '');
        if(hex.length == 3){
            hex = hex.replace(/(.)/g, '$1$1');
        }
        let r = parseInt(hex.substr(0, 2), 16),
            g = parseInt(hex.substr(2, 2), 16),
            b = parseInt(hex.substr(4, 2), 16);

        const amount = Math.floor(255 * (percent/100));
        r = Math.max(0, Math.min(255, r + amount));
        g = Math.max(0, Math.min(255, g + amount));
        b = Math.max(0, Math.min(255, b + amount));
        
        return "#" + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');
    },

    sanitizar(texto) {
        if (!texto) return '';
        return texto.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
    
    async fazerLogin(event) {
        event.preventDefault(); 
        const usuario = document.getElementById('usuario').value;
        const senha = document.getElementById('senha').value;
        const errorMessage = document.getElementById('login-error-message');
        this.usuarioLogado = await Services.autenticarUsuario(usuario, senha);
        if (this.usuarioLogado) {
            sessionStorage.setItem('usuarioLogado', JSON.stringify(this.usuarioLogado));
            this.mostrarApp();
        } else {
            errorMessage.textContent = 'Usuário ou senha inválidos.';
            setTimeout(() => errorMessage.textContent = '', 3000);
        }
    },

    fazerLogout() {
        this.showConfirmation("Deseja realmente sair do sistema?", () => {
            this.usuarioLogado = null;
            sessionStorage.removeItem('usuarioLogado');
            window.location.reload();
        });
    },
    
    mostrarLogin() {
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('tela-recuperar-senha').classList.remove('ativo');
        document.getElementById('tela-recuperar-senha').classList.add('hidden');
        document.getElementById('tela-login').classList.remove('hidden');
        document.getElementById('tela-login').classList.add('ativo');
    },

    mostrarApp() {
        document.getElementById('tela-login').classList.remove('ativo');
        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('flex');
        
        this.mostrarTela('tela-vendas');
        this.verificarAlertaEstoque();
    },
    
    mostrarTela(idTela) {
        document.querySelectorAll('#app-container .tela, body > .tela').forEach(tela => tela.classList.remove('ativo'));
        const telaAtiva = document.getElementById(idTela);
        if (telaAtiva) {
            telaAtiva.classList.add('ativo');
        }
        
        if(idTela.startsWith('tela-')){
            document.querySelectorAll('nav .nav-btn, nav .nav-btn-active').forEach(btn => {
                if (!btn.id.includes('sair')) {
                    btn.classList.remove('nav-btn-active');
                    btn.classList.add('nav-btn');
                }
            });
            const navId = `nav-${idTela.split('-')[1]}`;
            const activeButton = document.getElementById(navId);
            if (activeButton) {
                activeButton.classList.add('nav-btn-active');
                activeButton.classList.remove('nav-btn');
            }
            this.verificarAlertaEstoque();
            const initFunctions = {
                'tela-vendas': this.initTelaVendas,
                'tela-gerenciar': this.initTelaProdutos,
                'tela-clientes': this.initTelaClientes,
                'tela-fornecedores': this.initTelaFornecedores,
                'tela-relatorios': this.initTelaRelatorios,
                'tela-configuracoes': this.initTelaConfiguracoes,
            };
            if (initFunctions[idTela]) initFunctions[idTela].bind(this)();
        }
    },
    
    mostrarTelaRecuperacao() {
        document.getElementById('tela-login').classList.remove('ativo');
        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('tela-recuperar-senha').classList.remove('hidden');
        document.getElementById('tela-recuperar-senha').classList.add('ativo');
        document.getElementById('recuperar-passo-1').classList.remove('hidden');
        document.getElementById('recuperar-passo-2').classList.add('hidden');
        document.getElementById('recuperar-passo-3').classList.add('hidden');
        document.getElementById('usuario-recuperar').value = '';
        document.getElementById('resposta-recuperar').value = '';
        document.getElementById('nova-senha-recuperar').value = '';
        document.getElementById('recuperar-error-message').textContent = '';
    },
    
    initTelaVendas() { this.atualizarProdutosGrid(); },
    initTelaProdutos() { this.atualizarListaGerenciamentoProdutos(); this.cancelarEdicaoProduto(); },
    initTelaClientes() { this.atualizarListaGerenciamentoClientes(); this.cancelarEdicaoCliente(); },
    initTelaFornecedores() { this.atualizarListaGerenciamentoFornecedores(); this.cancelarEdicaoFornecedor(); },
    initTelaConfiguracoes() {
        this.switchTab('tela-configuracoes', 'tab-bandeiras', 'conteudo-');
        this.atualizarListaGerenciamentoBandeiras();
        this.cancelarEdicaoBandeira();
        this.atualizarListaPix();
        this.atualizarListaGerenciamentoUsuarios();
        this.aplicarCustomizacoes();
    },
    initTelaRelatorios() {
        this.switchTab('tela-relatorios', 'tab-dashboard', 'conteudo-');
        this.preencherRelatorio();
        this.criarGraficos();
    },

    switchTab(containerId, buttonId, contentPrefix) {
        const container = document.getElementById(containerId);
        container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('tab-btn-active');
        });
        container.querySelectorAll(`[id^=${contentPrefix}]`).forEach(content => content.classList.add('hidden'));
        const activeBtn = document.getElementById(buttonId);
        activeBtn.classList.add('tab-btn-active');
        const activeContentId = contentPrefix + buttonId.split('-')[1];
        document.getElementById(activeContentId).classList.remove('hidden');
    },

    showModal(message) {
        const modal = document.getElementById('modal'), modalContent = document.getElementById('modal-content'), modalMessage = document.getElementById('modal-message'), modalButtons = document.getElementById('modal-buttons');
        modalMessage.innerHTML = `<p>${message}</p>`;
        modalButtons.innerHTML = `<button onclick="App.closeModal()" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold btn-primario">OK</button>`;
        modal.classList.remove('hidden');
        setTimeout(() => { modalContent.classList.add('scale-100', 'opacity-100'); modalContent.classList.remove('scale-95', 'opacity-0'); }, 10);
    },

    showConfirmation(message, onConfirm) {
        const modal = document.getElementById('modal'), modalContent = document.getElementById('modal-content'), modalMessage = document.getElementById('modal-message'), modalButtons = document.getElementById('modal-buttons');
        modalMessage.innerText = message;
        modalButtons.innerHTML = `<button id="confirm-cancel" class="bg-gray-300 px-6 py-2 rounded-lg font-bold">Não</button><button id="confirm-ok" class="bg-red-500 text-white px-6 py-2 rounded-lg font-bold">Sim</button>`;
        modal.classList.remove('hidden');
        setTimeout(() => { modalContent.classList.add('scale-100', 'opacity-100'); modalContent.classList.remove('scale-95', 'opacity-0'); }, 10);
        document.getElementById('confirm-ok').onclick = () => { onConfirm(); this.closeModal(); };
        document.getElementById('confirm-cancel').onclick = () => this.closeModal();
    },

    closeModal() {
        const modal = document.getElementById('modal'), modalContent = document.getElementById('modal-content');
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 200);
    },
    
    async verificarAlertaEstoque() {
        const produtos = await Services.listarProdutos();
        const temEstoqueBaixo = produtos.some(p => (p.estoque || 0) <= (p.estoqueMinimo || 0));
        document.getElementById('alerta-relatorios').style.display = temEstoqueBaixo ? 'block' : 'none';
    },

    toBase64: file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    }),

    normalizarString: (str) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    },

    setupFormNavigation: () => {
        document.querySelectorAll('.form-navegavel').forEach(form => {
            form.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') {
                    const focusable = Array.from(form.querySelectorAll('input, select, button[type=submit]'));
                    const index = focusable.indexOf(e.target);
                    if (index > -1 && index < focusable.length - 1) {
                        e.preventDefault();
                        focusable[index + 1].focus();
                    }
                }
            });
        });
    },

    async criarGraficos() {
        Object.values(this.graficos).forEach(grafico => {
            if (grafico) grafico.destroy();
        });

        const vendas = await Services.getVendasPorPeriodo('todos');
        const corPrimaria = getComputedStyle(document.documentElement).getPropertyValue('--cor-primaria').trim();
        
        const dadosPagamentos = vendas.reduce((acc, venda) => {
            if (venda.status === 'concluida') {
                acc[venda.formaPagamento] = (acc[venda.formaPagamento] || 0) + 1;
            }
            return acc;
        }, {});
        const ctxPagamentos = document.getElementById('grafico-pagamentos');
        if (ctxPagamentos) {
            this.graficos.pagamentos = new Chart(ctxPagamentos, {
                type: 'bar',
                data: {
                    labels: Object.keys(dadosPagamentos),
                    datasets: [{
                        label: 'Vendas por Forma de Pagamento',
                        data: Object.values(dadosPagamentos),
                        backgroundColor: corPrimaria,
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Vendas por Forma de Pagamento' } } }
            });
        }

        const dadosProdutos = vendas.flatMap(v => v.itens).reduce((acc, item) => {
            acc[item.nome] = (acc[item.nome] || 0) + item.quantidade;
            return acc;
        }, {});
        const ctxProdutos = document.getElementById('grafico-produtos');
        if (ctxProdutos) {
            this.graficos.produtos = new Chart(ctxProdutos, {
                type: 'pie',
                data: {
                    labels: Object.keys(dadosProdutos),
                    datasets: [{
                        label: 'Produtos Mais Vendidos',
                        data: Object.values(dadosProdutos),
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
                    }]
                },
                options: { 
                    responsive: true, 
                    plugins: { 
                        title: { display: true, text: 'Produtos Mais Vendidos (Quantidade)' },
                        datalabels: {
                            formatter: (value, ctx) => {
                                const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = (value / total * 100).toFixed(1) + '%';
                                return percentage;
                            },
                            color: '#fff',
                        }
                    } 
                },
                plugins: [ChartDataLabels]
            });
        }

        const dadosFaturamento = vendas.filter(v => v.status === 'concluida').reduce((acc, venda) => {
            const mesAno = new Date(venda.dataHora).toISOString().slice(0, 7);
            acc[mesAno] = (acc[mesAno] || 0) + venda.total;
            return acc;
        }, {});
        const labelsFaturamento = Object.keys(dadosFaturamento).sort();
        const dataFaturamento = labelsFaturamento.map(mes => dadosFaturamento[mes]);
        const ctxFaturamento = document.getElementById('grafico-faturamento');
        if (ctxFaturamento) {
            this.graficos.faturamento = new Chart(ctxFaturamento, {
                type: 'line',
                data: {
                    labels: labelsFaturamento,
                    datasets: [{
                        label: 'Faturamento Mensal',
                        data: dataFaturamento,
                        borderColor: corPrimaria,
                        tension: 0.1,
                        fill: false
                    }]
                },
                options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Faturamento Mensal (R$)' } } }
            });
        }
    },

    async verificarUsuarioParaRecuperacao() {
        const nomeUsuario = document.getElementById('usuario-recuperar').value.trim();
        const errorMsg = document.getElementById('recuperar-error-message');
        errorMsg.textContent = '';

        if (!nomeUsuario) {
            errorMsg.textContent = 'Por favor, insira um nome de usuário.';
            return;
        }

        const user = await Services.buscarUsuarioPorNome(nomeUsuario);
        if (!user || !user.perguntaSeguranca) {
            errorMsg.textContent = 'Usuário não encontrado ou sem pergunta de segurança definida.';
            return;
        }

        this.recuperacao.userId = user.id;
        this.recuperacao.usuario = user.usuario;
        document.getElementById('pergunta-seguranca-texto').textContent = user.perguntaSeguranca;
        document.getElementById('recuperar-passo-1').classList.add('hidden');
        document.getElementById('recuperar-passo-2').classList.remove('hidden');
    },

    async verificarRespostaParaRecuperacao() {
        const resposta = document.getElementById('resposta-recuperar').value;
        const errorMsg = document.getElementById('recuperar-error-message');
        errorMsg.textContent = '';
        
        const isCorrect = await Services.verificarRespostaSeguranca(this.recuperacao.userId, resposta);
        if (isCorrect) {
            document.getElementById('recuperar-passo-2').classList.add('hidden');
            document.getElementById('recuperar-passo-3').classList.remove('hidden');
        } else {
            errorMsg.textContent = 'Resposta incorreta. Tente novamente.';
        }
    },

    async finalizarRecuperacaoSenha() {
        const novaSenha = document.getElementById('nova-senha-recuperar').value;
        const errorMsg = document.getElementById('recuperar-error-message');
        errorMsg.textContent = '';

        try {
            await Services.alterarSenha(this.recuperacao.userId, novaSenha);
            this.showModal("Senha redefinida com sucesso! Você já pode fazer o login.");
            this.mostrarLogin();
        } catch (error) {
            errorMsg.textContent = error.message;
        }
    },

    abrirModalPerguntaSeguranca(userId, nomeUsuario) {
        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modal-content');
        const modalMessage = document.getElementById('modal-message');
        const modalButtons = document.getElementById('modal-buttons');

        modalMessage.innerHTML = `
            <h3 class="text-xl font-bold mb-4">Pergunta de Segurança para ${nomeUsuario}</h3>
            <div class="text-left space-y-4">
                <div>
                    <label for="pergunta-seguranca-modal" class="font-semibold text-gray-600 mb-1 block">Pergunta</label>
                    <input type="text" id="pergunta-seguranca-modal" required class="w-full p-3 border rounded-lg" placeholder="Ex: Nome do primeiro animal?">
                </div>
                <div>
                    <label for="resposta-seguranca-modal" class="font-semibold text-gray-600 mb-1 block">Resposta</label>
                    <input type="text" id="resposta-seguranca-modal" required class="w-full p-3 border rounded-lg" placeholder="A resposta não diferencia maiúsculas.">
                </div>
            </div>
        `;
        
        modalButtons.innerHTML = `
            <button onclick="App.closeModal()" class="bg-gray-300 px-6 py-2 rounded-lg font-bold">Cancelar</button>
            <button onclick="App.confirmarPerguntaSeguranca(${userId})" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold btn-primario">Salvar</button>
        `;

        modal.classList.remove('hidden');
        setTimeout(() => { modalContent.classList.add('scale-100', 'opacity-100'); modalContent.classList.remove('scale-95', 'opacity-0'); }, 10);
    },

    async confirmarPerguntaSeguranca(userId) {
        const pergunta = this.sanitizar(document.getElementById('pergunta-seguranca-modal').value);
        const resposta = document.getElementById('resposta-seguranca-modal').value;

        try {
            await Services.salvarPerguntaSeguranca(userId, pergunta, resposta);
            this.closeModal();
            this.showModal("Pergunta de segurança salva com sucesso!");
        } catch (error) {
            this.showModal(error.message);
        }
    },
    
    async atualizarListaGerenciamentoUsuarios() {
        const usuarios = await Services.listarUsuarios();
        UI.atualizarListaGerenciamento('lista-usuarios-gerenciar', usuarios, (user) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-gray-50';
            const recoveryButton = `<button onclick="App.abrirModalPerguntaSeguranca(${user.id}, '${user.usuario}')" class="bg-green-500 text-white px-3 py-1 rounded-md text-sm font-semibold mr-2 hover:bg-green-600">Recuperação</button>`;
            const changePasswordButton = `<button onclick="App.abrirModalAlterarSenha(${user.id}, '${user.usuario}')" class="bg-yellow-500 text-white px-3 py-1 rounded-md text-sm font-semibold mr-2 hover:bg-yellow-600">Alterar Senha</button>`;
            const deleteButton = `<button onclick="App.confirmarExclusaoUsuario(${user.id})" class="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-red-600">Excluir</button>`;
            tr.innerHTML = `
                <td class="p-3">${user.usuario}</td>
                <td class="p-3 text-right">
                    ${recoveryButton}
                    ${changePasswordButton}
                    ${deleteButton}
                </td>`;
            return tr;
        });
    },

    async confirmarExclusaoUsuario(id) {
        this.showConfirmation(`Tem certeza que deseja excluir este usuário?`, async () => {
            try {
                await Services.excluirUsuario(id);
                await this.atualizarListaGerenciamentoUsuarios();
                this.showModal("Usuário excluído!");
            } catch (error) {
                this.showModal(error.message); 
            }
        });
    },

    abrirModalAlterarSenha(userId, nomeUsuario) {
        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modal-content');
        const modalMessage = document.getElementById('modal-message');
        const modalButtons = document.getElementById('modal-buttons');

        modalMessage.innerHTML = `
            <h3 class="text-xl font-bold mb-4">Alterar Senha para "${nomeUsuario}"</h3>
            <div class="text-left">
                <label for="nova-senha-modal" class="font-semibold text-gray-600 mb-1 block">Nova Senha:</label>
                <input type="password" id="nova-senha-modal" required class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
        `;
        
        modalButtons.innerHTML = `
            <button onclick="App.closeModal()" class="bg-gray-300 px-6 py-2 rounded-lg font-bold">Cancelar</button>
            <button onclick="App.confirmarAlteracaoSenha(${userId})" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold btn-primario">Salvar</button>
        `;

        modal.classList.remove('hidden');
        setTimeout(() => { modalContent.classList.add('scale-100', 'opacity-100'); modalContent.classList.remove('scale-95', 'opacity-0'); }, 10);
    },

    async confirmarAlteracaoSenha(userId) {
        const novaSenha = document.getElementById('nova-senha-modal').value;
        if (!novaSenha) {
            const label = document.querySelector('label[for="nova-senha-modal"]');
            label.textContent = "Nova Senha (obrigatório!):";
            label.classList.add('text-red-500');
            return;
        }

        try {
            await Services.alterarSenha(userId, novaSenha);
            this.closeModal();
            this.showModal("Senha alterada com sucesso!");
        } catch (error) {
            this.closeModal();
            this.showModal(`Erro ao alterar senha: ${error.message}`);
        }
    },
    
    async atualizarProdutosGrid(filtro = '') {
        const grid = document.getElementById('produtos-grid');
        if(!grid) return;
        const produtos = await Services.listarProdutos();
        const filtroNormalizado = this.normalizarString(filtro);
        grid.innerHTML = '';
        const produtosFiltrados = produtos.filter(p => this.normalizarString(p.nome).includes(filtroNormalizado));
        if (produtosFiltrados.length === 0) {
            grid.innerHTML = `<p class="col-span-full text-center text-gray-500">Nenhum produto encontrado.</p>`;
            return;
        }
        produtosFiltrados.forEach(prod => {
            const qtd = this.vendaAtual[prod.id] || 0;
            const semEstoque = prod.estoque <= 0 && qtd === 0;
            const card = document.createElement('div');
            card.className = `relative p-4 bg-white rounded-lg shadow-md flex flex-col items-center justify-between text-center border-2 transition-all ${qtd > 0 ? 'border-blue-500' : 'border-gray-200'} ${semEstoque ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;
            if (!semEstoque) {
                card.onclick = (e) => {
                    if (e.target.closest('.qtd-controls')) return;
                    this.aumentarQtd(prod.id, card);
                };
            }
            card.innerHTML = `
                <img src="${prod.imagem || 'https://placehold.co/100x100/e0e0e0/757575?text=Img'}" alt="${prod.nome}" class="w-24 h-24 object-cover mb-2 rounded-md">
                <h3 class="font-bold text-gray-800">${prod.nome}</h3>
                <p class="text-xl font-semibold text-green-600">R$ ${prod.preco.toFixed(2)}</p>
                ${semEstoque ? '<p class="text-red-500 font-bold text-sm mt-1">SEM ESTOQUE</p>' : ''}
                ${qtd > 0 ? `
                    <div class="absolute top-1 right-1 flex items-center bg-blue-500 text-white rounded-full text-lg font-bold shadow-lg qtd-controls">
                        <button onclick="App.diminuirQtd(${prod.id})" class="w-8 h-8 flex items-center justify-center rounded-l-full hover:bg-blue-600">-</button>
                        <span class="px-2">${qtd}</span>
                        <button onclick="App.aumentarQtd(${prod.id})" class="w-8 h-8 flex items-center justify-center rounded-r-full hover:bg-blue-600">+</button>
                    </div>
                ` : ''}
            `;
            grid.appendChild(card);
        });
    },
    
    async aumentarQtd(id, element) {
        if (typeof id !== 'number') return;
        const produto = await Services.buscarProdutoPorId(id);
        const qtdAtual = this.vendaAtual[id] || 0;
        if (produto.estoque > qtdAtual) {
            this.vendaAtual[id] = qtdAtual + 1;
            if(element) {
                element.classList.add('flash-success');
                setTimeout(() => element.classList.remove('flash-success'), 700);
            }
            this.atualizarTotal();
        } else {
            this.showModal(`Estoque insuficiente para "${produto.nome}".`);
        }
    },

    diminuirQtd(id) {
        if (typeof id !== 'number' || !this.vendaAtual[id]) return;
        this.vendaAtual[id]--;
        if (this.vendaAtual[id] <= 0) delete this.vendaAtual[id];
        this.atualizarTotal();
    },

    cancelarVenda() {
        if (Object.keys(this.vendaAtual).length > 0 || this.descontoVenda.valor > 0 || this.acrescimoVenda.valor > 0) {
            this.showConfirmation('Deseja cancelar a venda atual?', () => {
                this.novaVenda();
            });
        }
    },

    novaVenda() {
        this.vendaAtual = {};
        this.descontoVenda = { tipo: 'valor', valor: 0 };
        this.acrescimoVenda = { tipo: 'valor', valor: 0 };
        this.formaPagamentoSelecionada = null;
        this.pagamentosMistos = [];
        this.mostrarTela('tela-vendas');
        this.atualizarProdutosGrid();
        this.atualizarTotal();
    },

    async atualizarTotal() {
        const produtoIds = Object.keys(this.vendaAtual).map(Number);
        let subtotal = 0;
        if (produtoIds.length > 0) {
            const produtosDaVenda = await this.db.produtos.where('id').anyOf(produtoIds).toArray();
            subtotal = produtosDaVenda.reduce((sum, prod) => sum + (prod.preco * (this.vendaAtual[prod.id] || 0)), 0);
        }

        let valorDesconto = 0;
        if (this.descontoVenda.tipo === 'percentual') {
            valorDesconto = subtotal * (this.descontoVenda.valor / 100);
        } else {
            valorDesconto = this.descontoVenda.valor;
        }

        let valorAcrescimo = 0;
        if (this.acrescimoVenda.tipo === 'percentual') {
            valorAcrescimo = subtotal * (this.acrescimoVenda.valor / 100);
        } else {
            valorAcrescimo = this.acrescimoVenda.valor;
        }
        
        const totalFinal = subtotal - valorDesconto + valorAcrescimo;

        const totalEl = document.getElementById('total');
        if (totalEl) {
            totalEl.textContent = `Total: R$ ${totalFinal.toFixed(2)}`;
        }
        
        const detalhesDiv = document.getElementById('detalhes-desconto-acrescimo');
        if (detalhesDiv) {
            let detalhesTexto = `Subtotal: R$ ${subtotal.toFixed(2)}`;
            if (valorDesconto > 0) {
                detalhesTexto += ` - Desconto: R$ ${valorDesconto.toFixed(2)}`;
            }
            if (valorAcrescimo > 0) {
                detalhesTexto += ` + Acréscimo: R$ ${valorAcrescimo.toFixed(2)}`;
            }
            detalhesDiv.textContent = detalhesTexto;
        }
        
        const buscaProdutoEl = document.getElementById('busca-produto');
        if (buscaProdutoEl) {
            this.atualizarProdutosGrid(buscaProdutoEl.value);
        }
        return { subtotal, totalFinal, valorDesconto, valorAcrescimo };
    },

    irPagamento() {
        if (Object.keys(this.vendaAtual).length === 0) { this.showModal('Selecione ao menos um produto para continuar.'); return; }
        this.mostrarTela('tela-pagamento');
        this.prepararPagamento();
    },

    voltarVenda() { this.mostrarTela('tela-vendas'); },

    selecionarPagamento(tipo) {
        this.formaPagamentoSelecionada = tipo;
        document.querySelectorAll('.forma-pagamento-btn').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.getAttribute('data-tipo') === tipo) btn.classList.add('selected');
        });
        this.prepararPagamento();
    },

    async prepararPagamento() {
        const info = document.getElementById('info-pagamento');
        info.innerHTML = '';
        document.getElementById('btn-finalizar').disabled = !this.formaPagamentoSelecionada;
        
        if (!this.formaPagamentoSelecionada) {
            info.innerHTML = '<p class="text-gray-500">Selecione uma forma de pagamento.</p>';
            return;
        };
        const { totalFinal } = await this.atualizarTotal();
        if (this.formaPagamentoSelecionada === 'credito' || this.formaPagamentoSelecionada === 'debito') {
            const bandeiras = await Services.listarBandeiras();
            const bandeirasFiltradas = bandeiras.filter(b => b.tipo === this.formaPagamentoSelecionada);

            if(bandeirasFiltradas.length === 0) { 
                info.innerHTML = `<p class="text-red-500 font-semibold">Nenhuma bandeira de ${this.formaPagamentoSelecionada} cadastrada. Vá para Configurações.</p>`; 
                document.getElementById('btn-finalizar').disabled = true; 
                return;
            }
            const options = bandeirasFiltradas.map(b => `<option value="${b.id}">${b.nome} (${b.taxa}%)</option>`).join('');
            info.innerHTML = `<div class="flex flex-col items-center gap-2"><label for="bandeira-cartao" class="font-semibold text-gray-700">Selecionar Bandeira:</label><select id="bandeira-cartao" class="p-2 border rounded-lg w-64">${options}</select></div>`;
        } else if (this.formaPagamentoSelecionada === 'dinheiro') {
            info.innerHTML = `<div class="flex flex-col items-center gap-2"><label for="valor-recebido" class="font-semibold text-gray-700">Valor recebido (R$):</label><input type="number" min="${totalFinal.toFixed(2)}" step="0.01" id="valor-recebido" value="${totalFinal.toFixed(2)}" class="p-2 border rounded-lg text-center text-lg w-40"><div id="troco-resultado" class="font-bold text-xl text-green-600 mt-2">Troco: R$ 0,00</div></div>`;
            document.getElementById('valor-recebido').addEventListener('input', this.calcularTroco.bind(this));
            this.calcularTroco();
        } else if (this.formaPagamentoSelecionada === 'fiado') {
            const clientes = await Services.listarClientes();
            if(clientes.length === 0) { info.innerHTML = `<p class="text-red-500 font-semibold">Nenhum cliente cadastrado. Cadastre um cliente primeiro.</p>`; document.getElementById('btn-finalizar').disabled = true; return; }
            const options = clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
            info.innerHTML = `<div class="flex flex-col items-center gap-2"><label for="cliente-fiado" class="font-semibold text-gray-700">Selecionar Cliente:</label><select id="cliente-fiado" class="p-2 border rounded-lg w-64">${options}</select></div>`;
        } else if (this.formaPagamentoSelecionada === 'pix') {
            const pixQRCodes = await Services.listarPix();
            if(pixQRCodes.length === 0) { info.innerHTML = `<p class="text-red-500 font-semibold">Nenhum QR Code PIX cadastrado. Vá para Configurações.</p>`; document.getElementById('btn-finalizar').disabled = true; return; }
            const options = pixQRCodes.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
            info.innerHTML = `
                <div class="flex flex-col items-center gap-2">
                    <label for="pix-selecionado" class="font-semibold text-gray-700">Selecionar PIX:</label>
                    <select id="pix-selecionado" class="p-2 border rounded-lg w-64">${options}</select>
                    <div id="pix-qrcode-container" class="mt-4"></div>
                </div>`;
            document.getElementById('pix-selecionado').addEventListener('change', (e) => this.exibirQrCodePix(e.target.value));
            this.exibirQrCodePix(pixQRCodes[0].id);
        } else if (this.formaPagamentoSelecionada === 'misto') {
            info.innerHTML = `
                <div class="w-full max-w-lg mx-auto space-y-2">
                    <div id="pagamentos-mistos-container"></div>
                    <button class="text-sm text-blue-600 font-semibold" onclick="App.adicionarPagamentoMisto()">+ Adicionar Pagamento</button>
                    <p class="text-lg font-bold pt-4">Total Pago: <span id="total-pago-misto">R$ 0,00</span></p>
                    <p class="text-lg font-bold">Restante: <span id="restante-misto" class="text-red-500">R$ ${totalFinal.toFixed(2)}</span></p>
                </div>
            `;
            this.adicionarPagamentoMisto();
        }
    },

    async calcularTroco() {
        const { totalFinal } = await this.atualizarTotal();
        const valorRecebidoEl = document.getElementById('valor-recebido');
        const valorRecebido = parseFloat(valorRecebidoEl.value) || 0;
        let troco = valorRecebido - totalFinal;
        if (troco < 0) troco = 0;
        document.getElementById('troco-resultado').textContent = 'Troco: R$ ' + troco.toFixed(2);
        document.getElementById('btn-finalizar').disabled = valorRecebido < totalFinal;
    },

    async finalizarVenda() {
        document.getElementById('btn-finalizar').disabled = true;
        const { subtotal, totalFinal, valorDesconto, valorAcrescimo } = await this.atualizarTotal();
        let troco = 0, clienteId = null, bandeiraId = null, valorTaxa = 0;
        if (this.formaPagamentoSelecionada === 'dinheiro') {
            const valorRecebido = parseFloat(document.getElementById('valor-recebido').value);
            if (isNaN(valorRecebido) || valorRecebido < totalFinal) { this.showModal('Valor recebido é insuficiente.'); document.getElementById('btn-finalizar').disabled = false; return; }
            troco = valorRecebido - totalFinal;
        } else if(this.formaPagamentoSelecionada === 'fiado') {
            clienteId = parseInt(document.getElementById('cliente-fiado').value);
            if(isNaN(clienteId)) { this.showModal('Por favor, selecione um cliente.'); document.getElementById('btn-finalizar').disabled = false; return; }
        } else if (this.formaPagamentoSelecionada === 'credito' || this.formaPagamentoSelecionada === 'debito') {
            bandeiraId = parseInt(document.getElementById('bandeira-cartao').value);
            const bandeira = await Services.buscarBandeiraPorId(bandeiraId);
            if (bandeira) valorTaxa = totalFinal * (bandeira.taxa / 100);
        }
        const produtoIds = Object.keys(this.vendaAtual).map(Number);
        const produtosDaVenda = await this.db.produtos.where('id').anyOf(produtoIds).toArray();
        const itens = produtosDaVenda.map(p => ({ nome: p.nome, preco: p.preco, custo: p.custo || 0, quantidade: this.vendaAtual[p.id] }));
        
        const venda = { 
            dataHora: new Date(), 
            itens, 
            subtotal,
            desconto: this.descontoVenda,
            acrescimo: this.acrescimoVenda,
            total: totalFinal, 
            formaPagamento: this.formaPagamentoSelecionada, 
            troco, 
            status: 'concluida', 
            clienteId, 
            bandeiraId, 
            valorTaxa 
        };
        if (this.formaPagamentoSelecionada === 'fiado') venda.status = 'pendente';
        this.ultimaVendaConcluida = venda;
        await Services.finalizarVenda(venda);
        await this.verificarAlertaEstoque();
        this.mostrarTela('tela-finalizado');
        document.getElementById('btn-finalizar').disabled = false;
    },

    imprimirRecibo() {
        if (!this.ultimaVendaConcluida) {
            this.showModal("Não há uma última venda para imprimir.");
            return;
        }
        const venda = this.ultimaVendaConcluida;
        const reciboContainer = document.createElement('div');
        reciboContainer.className = 'recibo-imprimivel';
        let itensHtml = '';
        venda.itens.forEach(item => {
            itensHtml += `
                <tr>
                    <td>${item.quantidade}x ${item.nome}</td>
                    <td class="text-right">R$ ${item.preco.toFixed(2)}</td>
                    <td class="text-right">R$ ${(item.quantidade * item.preco).toFixed(2)}</td>
                </tr>
            `;
        });

        let valorDesconto = 0;
        if (venda.desconto.tipo === 'percentual') {
            valorDesconto = venda.subtotal * (venda.desconto.valor / 100);
        } else {
            valorDesconto = venda.desconto.valor;
        }

        let valorAcrescimo = 0;
        if (venda.acrescimo.tipo === 'percentual') {
            valorAcrescimo = venda.subtotal * (venda.acrescimo.valor / 100);
        } else {
            valorAcrescimo = venda.acrescimo.valor;
        }

        reciboContainer.innerHTML = `
            <h1>${document.getElementById('titulo-header').textContent.replace(' PDV', '')}</h1>
            <p>Data: ${new Date(venda.dataHora).toLocaleString('pt-BR')}</p>
            <hr>
            <table>
                <thead>
                    <tr><th>Item</th><th class="text-right">Unit.</th><th class="text-right">Total</th></tr>
                </thead>
                <tbody>${itensHtml}</tbody>
            </table>
            <hr>
            <p>Subtotal: <span style="float: right;">R$ ${venda.subtotal.toFixed(2)}</span></p>
            ${valorDesconto > 0 ? `<p>Desconto: <span style="float: right;">- R$ ${valorDesconto.toFixed(2)}</span></p>` : ''}
            ${valorAcrescimo > 0 ? `<p>Acréscimo: <span style="float: right;">+ R$ ${valorAcrescimo.toFixed(2)}</span></p>` : ''}
            <p><strong>Total: <span style="float: right;">R$ ${venda.total.toFixed(2)}</span></strong></p>
            <p>Pagamento: ${venda.formaPagamento.toUpperCase()}</p>
            ${venda.troco > 0 ? `<p>Troco: <span style="float: right;">R$ ${venda.troco.toFixed(2)}</span></p>` : ''}
            <hr>
            <p style="text-align:center;">Obrigado pela preferência!</p>
        `;
        document.body.appendChild(reciboContainer);
        window.print();
        document.body.removeChild(reciboContainer);
    },

    // CORREÇÃO: Função atualizada para chamar todas as funções de preenchimento de relatórios.
    async preencherRelatorio() {
        const filtro = document.getElementById('filtro-data-relatorio').value;
        const vendas = await Services.getVendasPorPeriodo(filtro);
        
        await this.preencherDashboard(vendas);
        await this.preencherHistorico(vendas);
        await this.preencherLucratividade(vendas);
        await this.preencherCurvaABC(vendas);
        await this.preencherContasAReceber();
        await this.preencherEstoqueBaixo();
    },

    async preencherDashboard(vendas) {
        const dashboard = document.getElementById('conteudo-dashboard');
        const vendasPagas = vendas.filter(v => v.status === 'concluida');
        const totalBruto = vendasPagas.reduce((sum, v) => sum + v.total, 0);
        const totalTaxas = vendasPagas.reduce((sum, v) => sum + (v.valorTaxa || 0), 0);
        const totalCusto = vendasPagas.flatMap(v => v.itens).reduce((sum, i) => sum + ((i.custo || 0) * i.quantidade), 0);
        const totalLucro = totalBruto - totalTaxas - totalCusto;
        const totalFiadoPendente = (await Services.getVendasPendentes()).reduce((sum, v) => sum + v.total, 0);
        const contagemProdutos = vendas.filter(v => v.status !== 'cancelada').flatMap(v => v.itens).reduce((acc, item) => { acc[item.nome] = (acc[item.nome] || 0) + item.quantidade; return acc; }, {});
        const produtoMaisVendido = Object.entries(contagemProdutos).sort((a, b) => b[1] - a[1])[0] || ['Nenhum', 0];
        dashboard.innerHTML = `
            <div class="bg-white p-4 rounded-xl shadow-lg text-center"><p class="text-gray-500">Faturamento Bruto</p><h3 class="text-4xl font-bold text-blue-600">R$ ${(totalBruto || 0).toFixed(2)}</h3></div>
            <div class="bg-white p-4 rounded-xl shadow-lg text-center"><p class="text-gray-500">Lucro Líquido</p><h3 class="text-4xl font-bold text-green-600">R$ ${(totalLucro || 0).toFixed(2)}</h3></div>
            <div class="bg-white p-4 rounded-xl shadow-lg text-center"><p class="text-gray-500">Total em Taxas</p><h3 class="text-4xl font-bold text-red-500">R$ ${(totalTaxas || 0).toFixed(2)}</h3></div>
            <div class="bg-white p-4 rounded-xl shadow-lg text-center"><p class="text-gray-500">"Fiado" a Receber</p><h3 class="text-4xl font-bold text-yellow-600">R$ ${(totalFiadoPendente || 0).toFixed(2)}</h3></div>
            <div class="bg-white p-4 rounded-xl shadow-lg text-center col-span-1 md:col-span-2 lg:col-span-4"><p class="text-gray-500">Produto Mais Vendido (Período)</p><h3 class="text-3xl font-bold">${produtoMaisVendido[0]} <span class="text-xl text-gray-600">(${produtoMaisVendido[1]} un)</span></h3></div>
        `;
    },

    async preencherHistorico(vendas) {
        const container = document.getElementById('conteudo-historico');
        container.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left"><thead class="bg-gray-100"><tr>
            <th class="p-3 cursor-pointer" onclick="App.ordenarTabela('dataHora')">Data/Hora ⇅</th>
            <th class="p-3">Itens</th>
            <th class="p-3 cursor-pointer" onclick="App.ordenarTabela('total')">Total ⇅</th>
            <th class="p-3">Pagamento</th>
            <th class="p-3 cursor-pointer" onclick="App.ordenarTabela('clienteId')">Cliente ⇅</th>
            <th class="p-3 cursor-pointer" onclick="App.ordenarTabela('status')">Status ⇅</th>
            <th class="p-3 text-right">Ações</th>
        </tr></thead><tbody id="tabela-historico-body"></tbody></table></div>`;
        this.renderizarTabelaHistorico(vendas);
    },

    // CORREÇÃO: Nova função para renderizar a tabela de histórico, que estava em falta.
    async renderizarTabelaHistorico(vendas) {
        const tbody = document.getElementById('tabela-historico-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const clientes = await Services.listarClientes();
        const clienteMap = new Map(clientes.map(c => [c.id, c.nome]));

        if (vendas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center p-10 text-gray-500">Nenhuma venda encontrada para o período.</td></tr>`;
            return;
        }

        vendas.forEach(venda => {
            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-gray-50';
            const itensTexto = venda.itens.map(i => `${i.quantidade}x ${i.nome}`).join(', ');
            const statusClass = venda.status === 'concluida' ? 'bg-green-100 text-green-800' : (venda.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800');

            tr.innerHTML = `
                <td class="p-3">${new Date(venda.dataHora).toLocaleString('pt-BR')}</td>
                <td class="p-3">${itensTexto}</td>
                <td class="p-3 font-semibold">R$ ${venda.total.toFixed(2)}</td>
                <td class="p-3 capitalize">${venda.formaPagamento}</td>
                <td class="p-3">${venda.clienteId ? (clienteMap.get(venda.clienteId) || 'Cliente Removido') : 'N/A'}</td>
                <td class="p-3"><span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">${venda.status}</span></td>
                <td class="p-3 text-right">
                    ${venda.status !== 'cancelada' ? `<button onclick="App.confirmarCancelamentoVenda(${venda.id})" class="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-red-600">Cancelar</button>` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    },
    
    // CORREÇÃO: Nova função para ordenar a tabela de histórico, que estava em falta.
    async ordenarTabela(coluna) {
        if (this.ordenacaoAtual.coluna === coluna) {
            this.ordenacaoAtual.direcao = this.ordenacaoAtual.direcao === 'asc' ? 'desc' : 'asc';
        } else {
            this.ordenacaoAtual.coluna = coluna;
            this.ordenacaoAtual.direcao = 'asc';
        }

        const filtro = document.getElementById('filtro-data-relatorio').value;
        let vendas = await Services.getVendasPorPeriodo(filtro);

        vendas.sort((a, b) => {
            let valA = a[coluna];
            let valB = b[coluna];

            if (coluna === 'dataHora') {
                valA = new Date(a.dataHora);
                valB = new Date(b.dataHora);
            }

            if (valA < valB) return this.ordenacaoAtual.direcao === 'asc' ? -1 : 1;
            if (valA > valB) return this.ordenacaoAtual.direcao === 'asc' ? 1 : -1;
            return 0;
        });

        this.renderizarTabelaHistorico(vendas);
    },

    async preencherContasAReceber() {
        const container = document.getElementById('conteudo-fiado');
        container.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left"><thead class="bg-gray-100"><tr><th class="p-3">Cliente</th><th class="p-3">Total Devido</th><th class="p-3 text-right">Ações</th></tr></thead><tbody></tbody></table></div>`;
        const tbody = container.querySelector('tbody');
        tbody.innerHTML = '';
        const vendasPendentes = await Services.getVendasPendentes();
        const clientes = await Services.listarClientes();
        const clienteMap = new Map(clientes.map(c => [c.id, c.nome]));
        const dividasPorCliente = vendasPendentes.reduce((acc, venda) => { acc[venda.clienteId] = (acc[venda.clienteId] || 0) + venda.total; return acc; }, {});
        if (Object.keys(dividasPorCliente).length === 0) { tbody.innerHTML = `<tr><td colspan="3" class="text-center p-10 text-gray-500">Nenhuma conta pendente.</td></tr>`; return; }
        for (const clienteId in dividasPorCliente) {
            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-gray-50';
            tr.innerHTML = `<td class="p-3 font-semibold">${clienteMap.get(parseInt(clienteId)) || 'Cliente Removido'}</td><td class="p-3 font-bold text-red-600">R$ ${dividasPorCliente[clienteId].toFixed(2)}</td><td class="p-3 text-right"><button onclick="App.mostrarDetalhesFiado(${clienteId})" class="bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-semibold btn-primario">Ver Detalhes</button></td>`;
            tbody.appendChild(tr);
        }
    },

    async mostrarDetalhesFiado(clienteId) {
        const cliente = await Services.buscarClientePorId(clienteId);
        const vendas = await Services.getVendasPendentesPorCliente(clienteId);
        const totalDivida = vendas.reduce((sum, v) => sum + v.total, 0);

        const modal = document.getElementById('modal-detalhes-fiado');
        const modalContent = modal.querySelector('.transform');
        document.getElementById('modal-fiado-title').textContent = `Dívidas de ${cliente.nome}`;
        document.getElementById('modal-fiado-total-geral').textContent = `R$ ${totalDivida.toFixed(2)}`;
        
        const tbody = document.getElementById('modal-fiado-tbody');
        tbody.innerHTML = '';
        vendas.forEach(venda => {
            const tr = document.createElement('tr');
            tr.className = 'border-b';
            const itensTexto = venda.itens.map(i => `${i.quantidade}x ${i.nome}`).join(', ');
            tr.innerHTML = `
                <td class="p-2 w-10 text-center"><input type="checkbox" class="fiado-checkbox h-5 w-5" data-id="${venda.id}" data-valor="${venda.total}"></td>
                <td class="p-3">${new Date(venda.dataHora).toLocaleDateString('pt-BR')}</td>
                <td class="p-3">${itensTexto}</td>
                <td class="p-3 text-right">R$ ${venda.total.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.fiado-checkbox').forEach(cb => cb.addEventListener('change', () => this.atualizarTotalFiadoSelecionado()));
        document.getElementById('selecionar-todas-dividas').addEventListener('change', (e) => this.selecionarTodasDividas(e.target.checked));
        document.getElementById('modal-fiado-quitar-btn').onclick = () => this.confirmarQuitacaoFiado();
        
        this.atualizarTotalFiadoSelecionado();
        modal.classList.remove('hidden');
        setTimeout(() => { modalContent.classList.add('scale-100', 'opacity-100'); modalContent.classList.remove('scale-95', 'opacity-0'); }, 10);
    },

    selecionarTodasDividas(checked) {
        document.querySelectorAll('.fiado-checkbox').forEach(cb => cb.checked = checked);
        this.atualizarTotalFiadoSelecionado();
    },

    atualizarTotalFiadoSelecionado() {
        const checkboxes = document.querySelectorAll('.fiado-checkbox:checked');
        let totalSelecionado = 0;
        checkboxes.forEach(cb => {
            totalSelecionado += parseFloat(cb.dataset.valor);
        });
        document.getElementById('modal-fiado-total-selecionado').textContent = `R$ ${totalSelecionado.toFixed(2)}`;
        document.getElementById('modal-fiado-quitar-btn').disabled = totalSelecionado === 0;
    },

    confirmarQuitacaoFiado() {
        const checkboxes = document.querySelectorAll('.fiado-checkbox:checked');
        if (checkboxes.length === 0) return;

        const idsParaQuitar = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));
        const mensagem = `Confirmar o pagamento das ${idsParaQuitar.length} dívida(s) selecionada(s)?`;
        
        this.fecharDetalhesFiado();

        setTimeout(() => {
            this.showConfirmation(mensagem, async () => {
                await Services.quitarVendasSelecionadas(idsParaQuitar);
                this.showModal("Dívida(s) quitada(s) com sucesso!");
                await this.preencherRelatorio();
            });
        }, 250);
    },

    fecharDetalhesFiado() {
        const modal = document.getElementById('modal-detalhes-fiado');
        const modalContent = modal.querySelector('.transform');
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.getElementById('selecionar-todas-dividas').checked = false;
        }, 200);
    },
    
    confirmarCancelamentoVenda(id) {
        this.showConfirmation("Tem certeza que deseja cancelar esta venda? O estoque dos itens será devolvido.", async () => {
            await Services.cancelarVenda(id);
            await this.preencherRelatorio();
            await this.verificarAlertaEstoque();
            this.showModal("Venda cancelada com sucesso.");
        });
    },

    async preencherEstoqueBaixo() {
        const container = document.getElementById('conteudo-estoque');
        container.innerHTML = `<div class="overflow-x-auto"><table class="w-full text-left"><thead class="bg-gray-100"><tr><th class="p-3">Produto</th><th class="p-3">Estoque Atual</th><th class="p-3">Estoque Mínimo</th></tr></thead><tbody></tbody></table></div>`;
        const tbody = container.querySelector('tbody');
        tbody.innerHTML = '';
        const produtos = await Services.listarProdutos();
        const produtosBaixoEstoque = produtos.filter(p => (p.estoque || 0) <= (p.estoqueMinimo || 0));
        if (produtosBaixoEstoque.length === 0) { tbody.innerHTML = `<tr><td colspan="3" class="text-center p-10 text-gray-500">Nenhum produto com estoque baixo.</td></tr>`; return; }
        produtosBaixoEstoque.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = 'border-b bg-red-50 hover:bg-red-100';
            tr.innerHTML = `<td class="p-3 font-semibold">${p.nome}</td><td class="p-3 font-bold text-red-600">${p.estoque}</td><td class="p-3">${p.estoqueMinimo}</td>`;
            tbody.appendChild(tr);
        });
    },

    // CORREÇÃO: Nova função para preencher a aba de lucratividade, que estava em falta.
    async preencherLucratividade(vendas) {
        const container = document.getElementById('conteudo-lucratividade');
        if (!container) return;

        const vendasPagas = vendas.filter(v => v.status === 'concluida');
        let html = `<div class="overflow-x-auto"><table class="w-full text-left"><thead class="bg-gray-100"><tr>
            <th class="p-3">Produto</th>
            <th class="p-3 text-right">Qtde. Vendida</th>
            <th class="p-3 text-right">Receita Total</th>
            <th class="p-3 text-right">Custo Total</th>
            <th class="p-3 text-right">Lucro Bruto</th>
            <th class="p-3 text-right">Margem</th>
        </tr></thead><tbody>`;

        const produtosVendidos = {};

        vendasPagas.forEach(venda => {
            venda.itens.forEach(item => {
                if (!produtosVendidos[item.nome]) {
                    produtosVendidos[item.nome] = { qtde: 0, receita: 0, custo: 0 };
                }
                produtosVendidos[item.nome].qtde += item.quantidade;
                produtosVendidos[item.nome].receita += item.preco * item.quantidade;
                produtosVendidos[item.nome].custo += (item.custo || 0) * item.quantidade;
            });
        });

        if (Object.keys(produtosVendidos).length === 0) {
            html += `<tr><td colspan="6" class="text-center p-10 text-gray-500">Nenhum dado de lucratividade para o período.</td></tr>`;
        } else {
             Object.entries(produtosVendidos).forEach(([nome, dados]) => {
                const lucro = dados.receita - dados.custo;
                const margem = dados.receita > 0 ? (lucro / dados.receita) * 100 : 0;
                html += `<tr class="border-b hover:bg-gray-50">
                    <td class="p-3 font-semibold">${nome}</td>
                    <td class="p-3 text-right">${dados.qtde}</td>
                    <td class="p-3 text-right text-blue-600">R$ ${dados.receita.toFixed(2)}</td>
                    <td class="p-3 text-right text-orange-600">R$ ${dados.custo.toFixed(2)}</td>
                    <td class="p-3 text-right font-bold text-green-600">R$ ${lucro.toFixed(2)}</td>
                    <td class="p-3 text-right font-semibold ${margem > 0 ? 'text-green-700' : 'text-red-700'}">${margem.toFixed(1)}%</td>
                </tr>`;
            });
        }

        html += `</tbody></table></div>`;
        container.innerHTML = html;
    },
    
    // CORREÇÃO: Nova função para preencher a aba de Curva ABC, que estava em falta.
    async preencherCurvaABC(vendas) {
        const container = document.getElementById('conteudo-abc');
        if (!container) return;

        const vendasPagas = vendas.filter(v => v.status === 'concluida');
        const produtosVendidos = {};
        let faturamentoTotal = 0;

        vendasPagas.forEach(venda => {
            venda.itens.forEach(item => {
                const receitaItem = item.preco * item.quantidade;
                if (!produtosVendidos[item.nome]) {
                    produtosVendidos[item.nome] = { receita: 0 };
                }
                produtosVendidos[item.nome].receita += receitaItem;
                faturamentoTotal += receitaItem;
            });
        });

        const produtosOrdenados = Object.entries(produtosVendidos)
            .map(([nome, dados]) => ({ nome, ...dados }))
            .sort((a, b) => b.receita - a.receita);

        let html = `<div class="overflow-x-auto"><table class="w-full text-left"><thead class="bg-gray-100"><tr>
            <th class="p-3">Produto</th>
            <th class="p-3 text-right">Faturamento</th>
            <th class="p-3 text-right">% do Total</th>
            <th class="p-3 text-right">% Acumulada</th>
            <th class="p-3 text-center">Classificação</th>
        </tr></thead><tbody>`;

        if (produtosOrdenados.length === 0) {
             html += `<tr><td colspan="5" class="text-center p-10 text-gray-500">Nenhum dado para gerar a Curva ABC.</td></tr>`;
        } else {
            let percentualAcumulado = 0;
            produtosOrdenados.forEach(produto => {
                const percentual = faturamentoTotal > 0 ? (produto.receita / faturamentoTotal) * 100 : 0;
                percentualAcumulado += percentual;
                let classe = '';
                let classeBg = '';
                if (percentualAcumulado <= 80) {
                    classe = 'A';
                    classeBg = 'bg-green-200 text-green-800';
                } else if (percentualAcumulado <= 95) {
                    classe = 'B';
                    classeBg = 'bg-yellow-200 text-yellow-800';
                } else {
                    classe = 'C';
                    classeBg = 'bg-red-200 text-red-800';
                }

                html += `<tr class="border-b hover:bg-gray-50">
                    <td class="p-3 font-semibold">${produto.nome}</td>
                    <td class="p-3 text-right">R$ ${produto.receita.toFixed(2)}</td>
                    <td class="p-3 text-right">${percentual.toFixed(2)}%</td>
                    <td class="p-3 text-right">${percentualAcumulado.toFixed(2)}%</td>
                    <td class="p-3 text-center"><span class="px-3 py-1 rounded-full font-bold text-sm ${classeBg}">${classe}</span></td>
                </tr>`;
            });
        }

        html += `</tbody></table></div>`;
        container.innerHTML = html;
    },

    async exportarDados() {
        try {
            const backupData = await Services.getBackupData();
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const data = new Date();
            a.href = url;
            a.download = `backup-pdv-${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}-${String(data.getDate()).padStart(2,'0')}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showModal("Backup exportado com sucesso!");
        } catch (error) { console.error("Erro ao exportar:", error); this.showModal("Ocorreu um erro ao exportar os dados."); }
    },

    importarDados(event) {
        const file = event.target.files[0];
        if (!file) return;
        this.showConfirmation("IMPORTANTE: A importação irá APAGAR TODOS os dados atuais. Deseja continuar?", () => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    await Services.restoreBackupData(data);
                    this.showModal("Backup restaurado com sucesso! A página será recarregada.");
                    setTimeout(() => window.location.reload(), 2000);
                } catch (error) {
                    console.error("Erro ao importar:", error);
                    this.showModal("Erro ao importar o backup. Verifique se o arquivo .json é válido.");
                }
            };
            reader.readAsText(file);
        });
        event.target.value = '';
    },

    confirmarLimpezaTotal() {
        this.showConfirmation("CUIDADO! Esta ação é irreversível e apagará TUDO. Deseja realmente limpar o banco de dados?", async () => {
            await Services.limparBancoDeDados();
            await Services.verificarUsuarioPadrao();
            this.showModal("Banco de dados limpo! O usuário 'admin' foi mantido. A página será recarregada.");
            setTimeout(() => window.location.reload(), 2000);
        });
    },

    async salvarProduto(event) {
        event.preventDefault();
        const nome = this.sanitizar(document.getElementById('nome-produto').value.trim());
        const preco = parseFloat(document.getElementById('preco-produto').value);
        const custo = parseFloat(document.getElementById('custo-produto').value);
        const estoque = parseInt(document.getElementById('estoque-produto').value, 10);
        const estoqueMinimo = parseInt(document.getElementById('estoque-minimo-produto').value, 10);
        const imagemInput = document.getElementById('imagem-produto').files[0];

        if (!nome || isNaN(preco) || isNaN(custo) || preco < 0 || custo < 0 || isNaN(estoque) || isNaN(estoqueMinimo)) { 
            this.showModal('Por favor, preencha todos os campos corretamente.'); 
            return; 
        }

        if (preco < custo) {
            this.showModal("O preço de venda não pode ser menor que o preço de custo.");
            return;
        }
        
        const data = { 
            nome, 
            preco, 
            custo, 
            estoque, 
            estoqueMinimo, 
            nomeNormalizado: this.normalizarString(nome) 
        };

        if (imagemInput) {
            data.imagem = await this.toBase64(imagemInput);
        } else if (this.edicaoProdutoId) {
            const produtoExistente = await Services.buscarProdutoPorId(this.edicaoProdutoId);
            data.imagem = produtoExistente.imagem;
        }

        await Services.salvarProduto(data, this.edicaoProdutoId); 
        this.showModal(this.edicaoProdutoId ? 'Produto atualizado!' : 'Produto cadastrado!'); 
        this.cancelarEdicaoProduto();
        await this.atualizarListaGerenciamentoProdutos();
        await this.verificarAlertaEstoque();
    },

    async atualizarListaGerenciamentoProdutos(filtro = '') {
        const produtos = await Services.listarProdutos();
        const filtroNormalizado = this.normalizarString(filtro);
        const itensFiltrados = produtos.filter(p => this.normalizarString(p.nome).includes(filtroNormalizado));
        UI.atualizarListaGerenciamento('lista-produtos-gerenciar', itensFiltrados, (prod) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-gray-50';
            const placeholderImg = 'https://placehold.co/40x40/e0e0e0/757575?text=Img';
            tr.innerHTML = `
                <td class="p-2"><img src="${prod.imagem || placeholderImg}" class="w-10 h-10 rounded-md object-cover"></td>
                <td class="p-3">${prod.nome}</td>
                <td class="p-3 font-semibold ${prod.estoque <= prod.estoqueMinimo ? 'text-red-500' : ''}">${prod.estoque}</td>
                <td class="p-3">R$ ${(prod.custo || 0).toFixed(2)}</td>
                <td class="p-3">R$ ${prod.preco.toFixed(2)}</td>
                <td class="p-3 text-right">
                    <button onclick="App.prepararEdicaoProduto(${prod.id})" class="bg-yellow-500 text-white px-3 py-1 rounded-md text-sm font-semibold mr-2 hover:bg-yellow-600">Editar</button>
                    <button onclick="App.confirmarExclusaoProduto(${prod.id})" class="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-red-600">Excluir</button>
                </td>`;
            return tr;
        });
    },

    async prepararEdicaoProduto(id) {
        const produto = await Services.buscarProdutoPorId(id);
        if (!produto) return;
        this.edicaoProdutoId = id;
        document.getElementById('nome-produto').value = produto.nome;
        document.getElementById('preco-produto').value = produto.preco;
        document.getElementById('custo-produto').value = produto.custo || 0;
        document.getElementById('estoque-produto').value = produto.estoque || 0;
        document.getElementById('estoque-minimo-produto').value = produto.estoqueMinimo || 0;
        document.getElementById('form-title-produto').innerText = 'Editando Produto';
        document.getElementById('btn-cancelar-edicao-produto').classList.remove('hidden');
        window.scrollTo(0, 0);
    },

    cancelarEdicaoProduto() {
        this.edicaoProdutoId = null;
        const form = document.getElementById('form-cadastro-produto');
        if(form) {
            form.reset();
            document.getElementById('form-title-produto').innerText = 'Adicionar Novo Produto';
            document.getElementById('btn-cancelar-edicao-produto').classList.add('hidden');
        }
    },

    async confirmarExclusaoProduto(id) {
        const produto = await Services.buscarProdutoPorId(id);
        if (!produto) return;
        this.showConfirmation(`Excluir o produto "${produto.nome}"? Esta ação não pode ser desfeita.`, async () => {
            await Services.excluirProduto(id);
            await this.atualizarListaGerenciamentoProdutos();
            this.showModal("Produto excluído!");
        });
    },
    
    async salvarCliente(event) {
        event.preventDefault();
        const nome = this.sanitizar(document.getElementById('nome-cliente').value.trim());
        const telefone = this.sanitizar(document.getElementById('telefone-cliente').value.trim());
        if (!nome) { this.showModal('O nome do cliente é obrigatório.'); return; }
        const data = { nome, telefone };
        await Services.salvarCliente(data, this.edicaoClienteId); 
        this.showModal(this.edicaoClienteId ? 'Cliente atualizado!' : 'Cliente cadastrado!');
        this.cancelarEdicaoCliente();
        await this.atualizarListaGerenciamentoClientes();
    },

    async atualizarListaGerenciamentoClientes(filtro = '') {
        const clientes = await Services.listarClientes();
        const filtroNormalizado = this.normalizarString(filtro);
        const itensFiltrados = clientes.filter(c => this.normalizarString(c.nome).includes(filtroNormalizado));
        UI.atualizarListaGerenciamento('lista-clientes-gerenciar', itensFiltrados, (cli) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-gray-50';
            tr.innerHTML = `<td class="p-3">${cli.nome}</td><td class="p-3">${cli.telefone || ''}</td><td class="p-3 text-right"><button onclick="App.prepararEdicaoCliente(${cli.id})" class="bg-yellow-500 text-white px-3 py-1 rounded-md text-sm font-semibold mr-2">Editar</button><button onclick="App.confirmarExclusaoCliente(${cli.id})" class="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold">Excluir</button></td>`;
            return tr;
        });
    },

    async prepararEdicaoCliente(id) {
        const cliente = await Services.buscarClientePorId(id);
        if (!cliente) return;
        this.edicaoClienteId = id;
        document.getElementById('nome-cliente').value = cliente.nome;
        document.getElementById('telefone-cliente').value = cliente.telefone;
        document.getElementById('form-title-cliente').innerText = 'Editando Cliente';
        document.getElementById('btn-cancelar-edicao-cliente').classList.remove('hidden');
        window.scrollTo(0, 0);
    },

    cancelarEdicaoCliente() {
        this.edicaoClienteId = null;
        const form = document.getElementById('form-cadastro-cliente');
        if(form) {
            form.reset();
            document.getElementById('form-title-cliente').innerText = 'Adicionar Novo Cliente';
            document.getElementById('btn-cancelar-edicao-cliente').classList.add('hidden');
        }
    },

    async confirmarExclusaoCliente(id) {
        const cliente = await Services.buscarClientePorId(id);
        if (!cliente) return;
        this.showConfirmation(`Excluir o cliente "${cliente.nome}"? Vendas associadas a ele não serão excluídas, mas o nome não aparecerá mais nos relatórios.`, async () => {
            await Services.excluirCliente(id);
            await this.atualizarListaGerenciamentoClientes();
            await this.preencherRelatorio();
            this.showModal("Cliente excluído!");
        });
    },

    async salvarFornecedor(event) {
        event.preventDefault();
        const nome = this.sanitizar(document.getElementById('nome-fornecedor').value.trim());
        const contato = this.sanitizar(document.getElementById('contato-fornecedor').value.trim());
        if (!nome) { this.showModal('O nome do fornecedor é obrigatório.'); return; }
        const data = { nome, contato };
        await Services.salvarFornecedor(data, this.edicaoFornecedorId);
        this.showModal(this.edicaoFornecedorId ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!');
        this.cancelarEdicaoFornecedor();
        await this.atualizarListaGerenciamentoFornecedores();
    },

    async atualizarListaGerenciamentoFornecedores(filtro = '') {
        const fornecedores = await Services.listarFornecedores();
        const filtroNormalizado = this.normalizarString(filtro);
        const itensFiltrados = fornecedores.filter(f => this.normalizarString(f.nome).includes(filtroNormalizado));
        UI.atualizarListaGerenciamento('lista-fornecedores-gerenciar', itensFiltrados, (f) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-gray-50';
            tr.innerHTML = `<td class="p-3">${f.nome}</td><td class="p-3">${f.contato || ''}</td><td class="p-3 text-right"><button onclick="App.prepararEdicaoFornecedor(${f.id})" class="bg-yellow-500 text-white px-3 py-1 rounded-md text-sm font-semibold mr-2">Editar</button><button onclick="App.confirmarExclusaoFornecedor(${f.id})" class="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold">Excluir</button></td>`;
            return tr;
        });
    },

    async prepararEdicaoFornecedor(id) {
        const fornecedor = await Services.buscarFornecedorPorId(id);
        if (!fornecedor) return;
        this.edicaoFornecedorId = id;
        document.getElementById('nome-fornecedor').value = fornecedor.nome;
        document.getElementById('contato-fornecedor').value = fornecedor.contato;
        document.getElementById('form-title-fornecedor').innerText = 'Editando Fornecedor';
        document.getElementById('btn-cancelar-edicao-fornecedor').classList.remove('hidden');
        window.scrollTo(0, 0);
    },

    cancelarEdicaoFornecedor() {
        this.edicaoFornecedorId = null;
        const form = document.getElementById('form-cadastro-fornecedor');
        if(form) {
            form.reset();
            document.getElementById('form-title-fornecedor').innerText = 'Adicionar Novo Fornecedor';
            document.getElementById('btn-cancelar-edicao-fornecedor').classList.add('hidden');
        }
    },

    async confirmarExclusaoFornecedor(id) {
        const fornecedor = await Services.buscarFornecedorPorId(id);
        if (!fornecedor) return;
        this.showConfirmation(`Excluir o fornecedor "${fornecedor.nome}"?`, async () => {
            await Services.excluirFornecedor(id);
            await this.atualizarListaGerenciamentoFornecedores();
            this.showModal("Fornecedor excluído!");
        });
    },

    async salvarBandeira(event) {
        event.preventDefault();
        const nome = this.sanitizar(document.getElementById('nome-bandeira').value.trim());
        const taxa = parseFloat(document.getElementById('taxa-bandeira').value);
        const tipo = document.getElementById('tipo-bandeira').value;

        if (!nome || isNaN(taxa) || taxa < 0) { this.showModal('Por favor, preencha os dados corretamente.'); return; }
        const data = { nome, taxa, tipo };
        await Services.salvarBandeira(data, this.edicaoBandeiraId);
        this.showModal(this.edicaoBandeiraId ? 'Bandeira atualizada!' : 'Bandeira cadastrada!');
        this.cancelarEdicaoBandeira();
        await this.atualizarListaGerenciamentoBandeiras();
    },

    async atualizarListaGerenciamentoBandeiras() {
        const bandeiras = await Services.listarBandeiras();
        UI.atualizarListaGerenciamento('lista-bandeiras-gerenciar', bandeiras, (b) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-gray-50';
            tr.innerHTML = `<td class="p-3">${b.nome}</td><td class="p-3">${b.taxa.toFixed(2)}%</td><td class="p-3 capitalize">${b.tipo}</td><td class="p-3 text-right"><button onclick="App.prepararEdicaoBandeira(${b.id})" class="bg-yellow-500 text-white px-3 py-1 rounded-md text-sm font-semibold mr-2">Editar</button><button onclick="App.confirmarExclusaoBandeira(${b.id})" class="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold">Excluir</button></td>`;
            return tr;
        });
    },

    async prepararEdicaoBandeira(id) {
        const bandeira = await Services.buscarBandeiraPorId(id);
        if (!bandeira) return;
        this.edicaoBandeiraId = id;
        document.getElementById('nome-bandeira').value = bandeira.nome;
        document.getElementById('taxa-bandeira').value = bandeira.taxa;
        document.getElementById('tipo-bandeira').value = bandeira.tipo;
        document.getElementById('btn-cancelar-edicao-bandeira').classList.remove('hidden');
    },

    cancelarEdicaoBandeira() {
        this.edicaoBandeiraId = null;
        const form = document.getElementById('form-cadastro-bandeira');
        if (form) {
            form.reset();
            document.getElementById('btn-cancelar-edicao-bandeira').classList.add('hidden');
        }
    },

    async confirmarExclusaoBandeira(id) {
        const bandeira = await Services.buscarBandeiraPorId(id);
        if (!bandeira) return;
        this.showConfirmation(`Excluir a bandeira "${bandeira.nome}"?`, async () => {
            await Services.excluirBandeira(id);
            await this.atualizarListaGerenciamentoBandeiras();
            this.showModal("Bandeira excluída!");
        });
    },

    async salvarUsuario(event) {
        event.preventDefault();
        const usuario = this.sanitizar(document.getElementById('nome-usuario-cadastro').value.trim());
        const senha = document.getElementById('senha-usuario-cadastro').value;

        if (!usuario || !senha) {
            this.showModal('Por favor, preencha todos os campos.');
            return;
        }

        try {
            await Services.salvarUsuario({ usuario, senha });
            this.showModal('Usuário cadastrado com sucesso!');
            document.getElementById('form-cadastro-usuario').reset();
            await this.atualizarListaGerenciamentoUsuarios();
        } catch (error) {
            this.showModal(error.message);
        }
    },
    
    abrirModalDescontoAcrescimo(tipo) {
        const titulo = tipo === 'desconto' ? 'Aplicar Desconto' : 'Adicionar Acréscimo';
        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modal-content');
        const modalMessage = document.getElementById('modal-message');
        const modalButtons = document.getElementById('modal-buttons');

        modalMessage.innerHTML = `
            <h3 class="text-xl font-bold mb-4">${titulo}</h3>
            <div class="text-left space-y-4">
                <div>
                    <label for="tipo-ajuste" class="font-semibold text-gray-600 mb-1 block">Tipo</label>
                    <select id="tipo-ajuste" class="w-full p-3 border rounded-lg">
                        <option value="valor">Valor Fixo (R$)</option>
                        <option value="percentual">Percentual (%)</option>
                    </select>
                </div>
                <div>
                    <label for="valor-ajuste" class="font-semibold text-gray-600 mb-1 block">Valor</label>
                    <input type="number" id="valor-ajuste" step="0.01" min="0" required class="w-full p-3 border rounded-lg">
                </div>
            </div>
        `;
        
        modalButtons.innerHTML = `
            <button onclick="App.closeModal()" class="bg-gray-300 px-6 py-2 rounded-lg font-bold">Cancelar</button>
            <button onclick="App.aplicarDescontoAcrescimo('${tipo}')" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold btn-primario">Aplicar</button>
        `;

        modal.classList.remove('hidden');
        setTimeout(() => { modalContent.classList.add('scale-100', 'opacity-100'); modalContent.classList.remove('scale-95', 'opacity-0'); }, 10);
    },

    async aplicarDescontoAcrescimo(tipo) {
        const tipoAjuste = document.getElementById('tipo-ajuste').value;
        const valorAjuste = parseFloat(document.getElementById('valor-ajuste').value);

        if (isNaN(valorAjuste) || valorAjuste < 0) {
            this.showModal("Por favor, insira um valor válido.");
            return;
        }

        if (tipo === 'desconto') {
            this.descontoVenda = { tipo: tipoAjuste, valor: valorAjuste };
        } else {
            this.acrescimoVenda = { tipo: tipoAjuste, valor: valorAjuste };
        }

        await this.atualizarTotal();
        this.closeModal();
    },

    // CORREÇÃO: Novas funções para gerir o PIX, que estavam em falta.
    async salvarPix(event) {
        event.preventDefault();
        const nome = this.sanitizar(document.getElementById('nome-pix').value.trim());
        const imagemInput = document.getElementById('imagem-pix').files[0];

        if (!nome) {
            this.showModal('O nome de identificação é obrigatório.');
            return;
        }

        if (!imagemInput && !this.edicaoPixId) {
            this.showModal('A imagem do QR Code é obrigatória ao criar um novo PIX.');
            return;
        }

        const data = { nome };

        if (imagemInput) {
            try {
                data.imagem = await this.toBase64(imagemInput);
            } catch (error) {
                console.error("Erro ao converter imagem para Base64:", error);
                this.showModal("Ocorreu um erro ao processar a imagem.");
                return;
            }
        } else if (this.edicaoPixId) {
            const pixExistente = await Services.buscarPixPorId(this.edicaoPixId);
            data.imagem = pixExistente.imagem;
        }

        try {
            await Services.salvarPix(data, this.edicaoPixId);
            this.showModal(this.edicaoPixId ? 'PIX atualizado com sucesso!' : 'PIX cadastrado com sucesso!');
            this.cancelarEdicaoPix();
            await this.atualizarListaPix();
        } catch (error) {
            console.error("Erro ao salvar PIX:", error);
            this.showModal("Ocorreu um erro ao salvar o PIX.");
        }
    },

    async atualizarListaPix() {
        const pixQRCodes = await Services.listarPix();
        const container = document.getElementById('lista-pix-gerenciar');
        if (!container) return;
        container.innerHTML = '';
        if (pixQRCodes.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 mt-4">Nenhum QR Code PIX cadastrado.</p>';
            return;
        }
        pixQRCodes.forEach(pix => {
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between bg-gray-100 p-3 rounded-lg mt-2';
            div.innerHTML = `
                <div class="flex items-center gap-4">
                    <img src="${pix.imagem || 'https://placehold.co/40x40/e0e0e0/757575?text=QR'}" alt="QR Code" class="w-10 h-10 rounded-md object-cover">
                    <span class="font-semibold">${this.sanitizar(pix.nome)}</span>
                </div>
                <div>
                    <button onclick="App.prepararEdicaoPix(${pix.id})" class="bg-yellow-500 text-white px-3 py-1 rounded-md text-sm font-semibold mr-2 hover:bg-yellow-600">Editar</button>
                    <button onclick="App.confirmarExclusaoPix(${pix.id})" class="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-red-600">Excluir</button>
                </div>
            `;
            container.appendChild(div);
        });
    },

    async prepararEdicaoPix(id) {
        const pix = await Services.buscarPixPorId(id);
        if (!pix) return;
        this.edicaoPixId = id;
        document.getElementById('pix-id-edicao').value = id;
        document.getElementById('nome-pix').value = pix.nome;
        document.querySelector('#form-cadastro-pix button[type=submit]').textContent = 'Atualizar PIX';
        document.getElementById('btn-cancelar-edicao-pix').classList.remove('hidden');
        document.getElementById('form-cadastro-pix').scrollIntoView({ behavior: 'smooth' });
    },

    cancelarEdicaoPix() {
        this.edicaoPixId = null;
        const form = document.getElementById('form-cadastro-pix');
        if (form) {
            form.reset();
            document.getElementById('pix-id-edicao').value = '';
            document.querySelector('#form-cadastro-pix button[type=submit]').textContent = 'Salvar PIX';
            document.getElementById('btn-cancelar-edicao-pix').classList.add('hidden');
        }
    },

    async confirmarExclusaoPix(id) {
        const pix = await Services.buscarPixPorId(id);
        if (!pix) return;
        this.showConfirmation(`Tem certeza que deseja excluir o PIX "${this.sanitizar(pix.nome)}"?`, async () => {
            await Services.excluirPix(id);
            this.showModal("PIX excluído com sucesso!");
            await this.atualizarListaPix();
        });
    },

    async exibirQrCodePix(pixId) {
        const pix = await Services.buscarPixPorId(parseInt(pixId));
        const container = document.getElementById('pix-qrcode-container');
        if (pix && pix.imagem) {
            container.innerHTML = `<img src="${pix.imagem}" alt="QR Code PIX" class="mx-auto mt-4 max-w-xs rounded-lg shadow-lg">`;
        } else {
            container.innerHTML = '';
        }
    },
};

window.App = App;
App.init();

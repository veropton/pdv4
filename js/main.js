import { state } from './state.js';
import { dbModule } from './db.js';
import { authModule } from './auth.js';
import { vendasModule } from './vendas.js';
import { produtosModule } from './produtos.js';
import { clientesModule } from './clientes.js';
import { fornecedoresModule } from './fornecedores.js';
import { relatoriosModule } from './relatorios.js';
import { configModule } from './config.js';
import { Services } from './services.js';
import { Logger } from './logger.js';

const App = {
    async init() {
        try {
            Logger.info("Iniciando a aplicação...");
            const dbInstance = await dbModule.initDB();

            Object.assign(this, 
                state,
                { db: dbInstance },
                dbModule,
                authModule,
                vendasModule,
                produtosModule,
                clientesModule,
                fornecedoresModule,
                relatoriosModule,
                configModule
            );
            
            await this.aplicarCustomizacoes();
            this.initEventListeners();
            this.setupFormNavigation();

            if (sessionStorage.getItem('usuarioLogado')) {
                this.usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));
                this.mostrarApp();
            } else {
                this.mostrarLogin();
            }
            Logger.info("Aplicação iniciada com sucesso.");
        } catch (error) {
            Logger.error("Falha crítica durante a inicialização da aplicação.", error);
            document.body.innerHTML = `<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative m-4" role="alert">
                <strong class="font-bold">Erro Crítico!</strong>
                <span class="block sm:inline">Não foi possível iniciar a aplicação. Verifique a consola para mais detalhes.</span>
            </div>`;
        }
    },

    initEventListeners() {
        // Autenticação
        document.getElementById('form-login').addEventListener('submit', (e) => this.fazerLogin(e));
        document.getElementById('link-recuperar-senha').addEventListener('click', (e) => { e.preventDefault(); this.mostrarTelaRecuperacao(); });
        document.getElementById('link-voltar-login').addEventListener('click', (e) => { e.preventDefault(); this.mostrarLogin(); });
        document.getElementById('btn-avancar-recuperacao').addEventListener('click', () => this.verificarUsuarioParaRecuperacao());
        document.getElementById('btn-verificar-resposta').addEventListener('click', () => this.verificarRespostaParaRecuperacao());
        document.getElementById('btn-salvar-nova-senha').addEventListener('click', () => this.finalizarRecuperacaoSenha());

        // Cadastros
        document.getElementById('form-cadastro-produto').addEventListener('submit', (e) => this.salvarProduto(e));
        document.getElementById('form-cadastro-cliente').addEventListener('submit', (e) => this.salvarCliente(e));
        document.getElementById('form-cadastro-fornecedor').addEventListener('submit', (e) => this.salvarFornecedor(e));
        document.getElementById('form-cadastro-bandeira').addEventListener('submit', (e) => this.salvarBandeira(e));
        document.getElementById('form-cadastro-usuario').addEventListener('submit', (e) => this.salvarUsuario(e));
        document.getElementById('form-cadastro-pix').addEventListener('submit', (e) => this.salvarPix(e));
        document.getElementById('btn-cancelar-edicao-pix').addEventListener('click', () => this.cancelarEdicaoPix());

        // Buscas e Filtros
        document.getElementById('busca-produto').addEventListener('input', (e) => this.atualizarProdutosGrid(e.target.value));
        document.getElementById('busca-produto-gerenciar').addEventListener('input', (e) => this.atualizarListaGerenciamentoProdutos(e.target.value));
        document.getElementById('busca-cliente-gerenciar').addEventListener('input', (e) => this.atualizarListaGerenciamentoClientes(e.target.value));
        document.getElementById('busca-fornecedor-gerenciar').addEventListener('input', (e) => this.atualizarListaGerenciamentoFornecedores(e.target.value));
        document.getElementById('filtro-data-relatorio').addEventListener('change', () => this.preencherRelatorio());

        // Configurações e Dados
        document.getElementById('import-file-input').addEventListener('change', (e) => this.importarDados(e));
        document.getElementById('btn-salvar-aparencia').addEventListener('click', () => this.salvarAparencia());
        document.getElementById('btn-redefinir-aparencia').addEventListener('click', () => this.redefinirAparencia());
        document.getElementById('imagem-logo').addEventListener('change', (e) => this.previewLogo(e));
        
        // Navegação por Abas
        document.querySelectorAll('#tela-relatorios .tab-btn').forEach(btn => btn.addEventListener('click', (e) => this.switchTab('tela-relatorios', e.target.id, 'conteudo-')));
        document.querySelectorAll('#tela-configuracoes .tab-btn').forEach(btn => btn.addEventListener('click', (e) => this.switchTab('tela-configuracoes', e.target.id, 'conteudo-')));

        // Navegação Principal (Refatorado)
        document.getElementById('nav-vendas').addEventListener('click', () => this.mostrarTela('tela-vendas'));
        document.getElementById('nav-gerenciar').addEventListener('click', () => this.mostrarTela('tela-gerenciar'));
        document.getElementById('nav-clientes').addEventListener('click', () => this.mostrarTela('tela-clientes'));
        document.getElementById('nav-fornecedores').addEventListener('click', () => this.mostrarTela('tela-fornecedores'));
        document.getElementById('nav-relatorios').addEventListener('click', () => this.mostrarTela('tela-relatorios'));
        document.getElementById('nav-configuracoes').addEventListener('click', () => this.mostrarTela('tela-configuracoes'));
        document.getElementById('nav-sair').addEventListener('click', () => this.fazerLogout());
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

    sanitizar(texto) {
        if (!texto) return '';
        return texto.replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
        } catch (error) { Logger.error("Erro ao exportar dados:", error); this.showModal("Ocorreu um erro ao exportar os dados."); }
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
                    Logger.error("Erro ao importar dados:", error);
                    this.showModal("Erro ao importar o backup. Verifique se o arquivo .json é válido.");
                }
            };
            reader.readAsText(file);
        });
        event.target.value = '';
    },

    confirmarLimpezaTotal() {
        this.showConfirmation("CUIDADO! Esta ação é irreversível e apagará TUDO. Deseja realmente limpar o banco de dados?", async () => {
            try {
                await Services.limparBancoDeDados();
                await Services.verificarUsuarioPadrao();
                this.showModal("Banco de dados limpo! O usuário 'admin' foi mantido. A página será recarregada.");
                setTimeout(() => window.location.reload(), 2000);
            } catch(error) {
                Logger.error("Erro ao limpar o banco de dados:", error);
                this.showModal("Ocorreu um erro ao limpar o banco de dados.");
            }
        });
    },
};

// Expõe o objeto App globalmente para que os `onclick` no HTML funcionem
window.App = App;
// Inicia a aplicação
App.init();

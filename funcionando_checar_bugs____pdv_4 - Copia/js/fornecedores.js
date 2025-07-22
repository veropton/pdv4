import { Services } from './services.js';
import { UI } from './ui.js';

const fornecedoresModule = {
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
};

export { fornecedoresModule };

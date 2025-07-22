import { Services } from './services.js';
import { UI } from './ui.js';

const clientesModule = {
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
};

export { clientesModule };

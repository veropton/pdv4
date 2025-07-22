import { Services } from './services.js';
import { UI } from './ui.js';

const produtosModule = {
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
};

export { produtosModule };

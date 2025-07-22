import { Services } from './services.js';
import { Logger } from './logger.js';

const vendasModule = {
    // Função interna para limpar o estado da venda atual
    _limparVendaAtual() {
        this.vendaAtual = {};
        this.descontoVenda = { tipo: 'valor', valor: 0 };
        this.acrescimoVenda = { tipo: 'valor', valor: 0 };
        this.formaPagamentoSelecionada = null;
        this.pagamentosMistos = [];
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
        this._limparVendaAtual();
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
        let valorTaxaTotal = 0;

        if (this.formaPagamentoSelecionada === 'misto') {
            const { totalFinal } = await this.atualizarTotal();
            const totalPago = this.pagamentosMistos.reduce((acc, p) => acc + p.valor, 0);
            if (Math.abs(totalPago - totalFinal) > 0.01) {
                this.showModal('O total pago no pagamento misto não corresponde ao total da venda.');
                document.getElementById('btn-finalizar').disabled = false;
                return;
            }
            for(const pag of this.pagamentosMistos) {
                if (pag.bandeiraId) {
                    const bandeira = await Services.buscarBandeiraPorId(pag.bandeiraId);
                    if (bandeira) {
                        valorTaxaTotal += pag.valor * (bandeira.taxa / 100);
                    }
                }
            }
        }

        const { subtotal, totalFinal, valorDesconto, valorAcrescimo } = await this.atualizarTotal();
        let troco = 0, clienteId = null, bandeiraId = null;

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
            if (bandeira) valorTaxaTotal = totalFinal * (bandeira.taxa / 100);
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
            valorTaxa: valorTaxaTotal,
            pagamentos: this.formaPagamentoSelecionada === 'misto' ? this.pagamentosMistos : []
        };
        if (this.formaPagamentoSelecionada === 'fiado') venda.status = 'pendente';
        this.ultimaVendaConcluida = venda;
        await Services.finalizarVenda(venda);
        
        this._limparVendaAtual(); // Limpa o estado da venda atual
        
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

    async adicionarPagamentoMisto() {
        const container = document.getElementById('pagamentos-mistos-container');
        const { totalFinal } = await this.atualizarTotal();
        const totalPago = this.pagamentosMistos.reduce((acc, p) => acc + p.valor, 0);
        const restante = totalFinal - totalPago;
    
        const idUnico = Date.now();
        const div = document.createElement('div');
        div.className = 'p-2 bg-gray-100 rounded-lg pag-misto-item';
        div.dataset.id = idUnico;
    
        const options = ['dinheiro', 'pix', 'credito', 'debito']
            .map(opt => `<option value="${opt}">${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`)
            .join('');
    
        div.innerHTML = `
            <div class="flex items-center gap-2">
                <select class="p-2 border rounded-lg bg-white flex-grow tipo-pag-misto">${options}</select>
                <input type="number" step="0.01" min="0" value="${restante > 0 ? restante.toFixed(2) : '0.00'}" class="p-2 border rounded-lg w-32 valor-pag-misto">
                <button class="bg-red-500 text-white w-8 h-8 rounded-lg font-bold flex-shrink-0" onclick="App.removerPagamentoMisto(this)">X</button>
            </div>
            <div id="extra-info-container-${idUnico}" class="mt-2 hidden"></div>
        `;
        container.appendChild(div);
    
        const selectTipo = div.querySelector('.tipo-pag-misto');
        selectTipo.addEventListener('change', () => this.toggleExtraInfoMisto(selectTipo, idUnico));
        div.querySelector('.valor-pag-misto').addEventListener('input', () => this.atualizarPagamentoMisto());
        
        this.atualizarPagamentoMisto();
    },
    
    async toggleExtraInfoMisto(selectElement, id) {
        const tipo = selectElement.value;
        const container = document.getElementById(`extra-info-container-${id}`);
        
        if (tipo === 'credito' || tipo === 'debito') {
            const bandeiras = await Services.listarBandeiras();
            const bandeirasFiltradas = bandeiras.filter(b => b.tipo === tipo);
            
            if (bandeirasFiltradas.length > 0) {
                const options = bandeirasFiltradas.map(b => `<option value="${b.id}">${b.nome} (${b.taxa}%)</option>`).join('');
                container.innerHTML = `<select class="p-2 border rounded-lg w-full bandeira-pag-misto">${options}</select>`;
            } else {
                container.innerHTML = `<p class="text-red-500 text-sm">Nenhuma bandeira de ${tipo} cadastrada.</p>`;
            }
            container.classList.remove('hidden');
        } else if (tipo === 'pix') {
             container.innerHTML = `<button class="w-full bg-blue-500 text-white p-2 rounded-lg font-bold btn-primario" onclick="App.abrirModalSelecaoPix(${id})">Selecionar QR Code</button>`;
             container.classList.remove('hidden');
        } else {
            container.innerHTML = '';
            container.classList.add('hidden');
        }
        this.atualizarPagamentoMisto();
    },

    removerPagamentoMisto(button) {
        button.closest('.pag-misto-item').remove();
        this.atualizarPagamentoMisto();
    },

    async atualizarPagamentoMisto() {
        this.pagamentosMistos = [];
        document.querySelectorAll('.pag-misto-item').forEach(item => {
            const tipo = item.querySelector('.tipo-pag-misto').value;
            const valor = parseFloat(item.querySelector('.valor-pag-misto').value) || 0;
            let bandeiraId = null;
            let pixId = null;
            
            if ((tipo === 'credito' || tipo === 'debito') && item.querySelector('.bandeira-pag-misto')) {
                bandeiraId = parseInt(item.querySelector('.bandeira-pag-misto').value);
            } else if (tipo === 'pix') {
                pixId = item.dataset.pixId ? parseInt(item.dataset.pixId) : null;
            }

            if (valor > 0) {
                this.pagamentosMistos.push({ tipo, valor, bandeiraId, pixId });
            }
        });

        const { totalFinal } = await this.atualizarTotal();
        const totalPago = this.pagamentosMistos.reduce((acc, p) => acc + p.valor, 0);
        const restante = totalFinal - totalPago;

        document.getElementById('total-pago-misto').textContent = `R$ ${totalPago.toFixed(2)}`;
        const restanteEl = document.getElementById('restante-misto');
        restanteEl.textContent = `R$ ${restante.toFixed(2)}`;
        restanteEl.classList.toggle('text-red-500', restante > 0.01);
        restanteEl.classList.toggle('text-green-600', restante <= 0.01);

        document.getElementById('btn-finalizar').disabled = Math.abs(restante) > 0.01;
    },

    async exibirQrCodePix(pixId) {
        const idNumerico = parseInt(pixId, 10);
        if (isNaN(idNumerico)) return;
        
        const pix = await Services.buscarPixPorId(idNumerico);
        const container = document.getElementById('pix-qrcode-container');
        if (pix && pix.imagem) {
            container.innerHTML = `<img src="${pix.imagem}" alt="QR Code PIX" class="mx-auto mt-4 max-w-xs rounded-lg shadow-lg">`;
        } else {
            container.innerHTML = '';
        }
    },

    async abrirModalSelecaoPix(pagamentoMistoId) {
        const modal = document.getElementById('modal-selecionar-pix');
        const listaContainer = document.getElementById('lista-pix-modal');
        const previewContainer = document.getElementById('pix-qrcode-modal-preview');
        listaContainer.innerHTML = '';
        previewContainer.innerHTML = '';

        const pixQRCodes = await Services.listarPix();
        if (pixQRCodes.length === 0) {
            this.showModal("Nenhum QR Code PIX cadastrado.");
            return;
        }

        pixQRCodes.forEach((pix, index) => {
            const div = document.createElement('div');
            div.innerHTML = `
                <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100">
                    <input type="radio" name="pix-selecao" value="${pix.id}" ${index === 0 ? 'checked' : ''}>
                    <span>${pix.nome}</span>
                </label>
            `;
            listaContainer.appendChild(div);
        });

        const showPreview = async (pixId) => {
            const pix = await Services.buscarPixPorId(parseInt(pixId));
            if (pix && pix.imagem) {
                previewContainer.innerHTML = `<img src="${pix.imagem}" class="max-w-full max-h-40 rounded-lg">`;
            } else {
                previewContainer.innerHTML = '';
            }
        };

        listaContainer.querySelectorAll('input[name="pix-selecao"]').forEach(radio => {
            radio.addEventListener('change', (e) => showPreview(e.target.value));
        });

        document.getElementById('btn-confirmar-pix-misto').onclick = () => {
            const selectedPixId = listaContainer.querySelector('input[name="pix-selecao"]:checked').value;
            const pagMistoItem = document.querySelector(`.pag-misto-item[data-id='${pagamentoMistoId}']`);
            if (pagMistoItem) {
                pagMistoItem.dataset.pixId = selectedPixId;
                this.atualizarPagamentoMisto();
            }
            modal.classList.add('hidden');
        };

        document.getElementById('btn-cancelar-pix-misto').onclick = () => {
            modal.classList.add('hidden');
        };

        modal.classList.remove('hidden');
        showPreview(pixQRCodes[0].id);
    }
};

export { vendasModule };

import { Services } from './services.js';
import { Logger } from './logger.js';

const relatoriosModule = {
    async preencherRelatorio() {
        try {
            const filtro = document.getElementById('filtro-data-relatorio').value;
            const vendas = await Services.getVendasPorPeriodo(filtro);
            
            await this.preencherDashboard(vendas);
            await this.preencherHistorico(vendas);
            await this.preencherLucratividade(vendas);
            await this.preencherCurvaABC(vendas);
            await this.preencherContasAReceber();
            await this.preencherEstoqueBaixo();
        } catch (error) {
            Logger.error("Erro ao preencher relatórios:", error);
        }
    },

    async criarGraficos() {
        try {
            Object.values(this.graficos).forEach(grafico => {
                if (grafico) grafico.destroy();
            });

            const vendas = await Services.getVendasPorPeriodo('todos');
            const corPrimaria = getComputedStyle(document.documentElement).getPropertyValue('--cor-primaria').trim();
            
            const dadosPagamentos = vendas.reduce((acc, venda) => {
                if (venda.status === 'concluida') {
                    // CORREÇÃO: Verifica se 'venda.pagamentos' é um array antes de usar o forEach.
                    if (venda.formaPagamento === 'misto' && Array.isArray(venda.pagamentos)) {
                        venda.pagamentos.forEach(p => {
                            acc[p.tipo] = (acc[p.tipo] || 0) + 1;
                        });
                    } else {
                        acc[venda.formaPagamento] = (acc[venda.formaPagamento] || 0) + 1;
                    }
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
                                    if (value === 0) return '';
                                    const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    if (total === 0) return '0%';
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
        } catch (error) {
            Logger.error("Erro ao criar gráficos:", error);
        }
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
            <div class="bg-white p-4 rounded-xl shadow-lg text-center col-span-1 md:col-span-2 lg:col-span-4"><p class="text-gray-500">Produto Mais Vendido (Período)</p><h3 class="text-3xl font-bold">${this.sanitizar(produtoMaisVendido[0])} <span class="text-xl text-gray-600">(${produtoMaisVendido[1]} un)</span></h3></div>
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
        
        this.ordenacaoAtual = { coluna: 'dataHora', direcao: 'desc' };
        const vendasOrdenadas = [...vendas].sort((a, b) => new Date(b.dataHora) - new Date(a.dataHora));

        this.renderizarTabelaHistorico(vendasOrdenadas);
    },

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
            const itensTexto = venda.itens.map(i => `${i.quantidade}x ${this.sanitizar(i.nome)}`).join(', ');
            const statusClass = venda.status === 'concluida' ? 'bg-green-100 text-green-800' : (venda.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800');
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = "flex gap-2 justify-end";

            const detalhesBtn = document.createElement('button');
            detalhesBtn.className = "bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-blue-600";
            detalhesBtn.textContent = "Detalhes";
            detalhesBtn.onclick = () => this.mostrarDetalhesVenda(venda.id);
            actionsDiv.appendChild(detalhesBtn);

            if (venda.status !== 'cancelada') {
                const cancelarBtn = document.createElement('button');
                cancelarBtn.className = "bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-red-600";
                cancelarBtn.textContent = "Cancelar";
                cancelarBtn.onclick = () => this.confirmarCancelamentoVenda(venda.id);
                actionsDiv.appendChild(cancelarBtn);
            }
            
            tr.innerHTML = `
                <td class="p-3">${new Date(venda.dataHora).toLocaleString('pt-BR')}</td>
                <td class="p-3">${itensTexto}</td>
                <td class="p-3 font-semibold">R$ ${venda.total.toFixed(2)}</td>
                <td class="p-3 capitalize">${venda.formaPagamento}</td>
                <td class="p-3">${venda.clienteId ? (clienteMap.get(venda.clienteId) || 'Cliente Removido') : 'N/A'}</td>
                <td class="p-3"><span class="px-2 py-1 rounded-full text-xs font-medium ${statusClass}">${venda.status}</span></td>
            `;
            const actionsCell = document.createElement('td');
            actionsCell.className = 'p-3 text-right';
            actionsCell.appendChild(actionsDiv);
            tr.appendChild(actionsCell);

            tbody.appendChild(tr);
        });
    },
    
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
            
            if (coluna === 'clienteId') {
                valA = valA || 0;
                valB = valB || 0;
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
        const dividasPorCliente = vendasPendentes.reduce((acc, venda) => { 
            if(venda.clienteId) {
                acc[venda.clienteId] = (acc[venda.clienteId] || 0) + venda.total;
            }
            return acc; 
        }, {});
        if (Object.keys(dividasPorCliente).length === 0) { tbody.innerHTML = `<tr><td colspan="3" class="text-center p-10 text-gray-500">Nenhuma conta pendente.</td></tr>`; return; }
        for (const clienteId in dividasPorCliente) {
            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-gray-50';
            tr.innerHTML = `<td class="p-3 font-semibold">${clienteMap.get(parseInt(clienteId)) || 'Cliente Removido'}</td><td class="p-3 font-bold text-red-600">R$ ${dividasPorCliente[clienteId].toFixed(2)}</td><td class="p-3 text-right"><button onclick="App.mostrarDetalhesFiado(${clienteId})" class="bg-blue-500 text-white px-3 py-1 rounded-md text-sm font-semibold btn-primario">Ver Detalhes</button></td>`;
            tbody.appendChild(tr);
        }
    },

    async mostrarDetalhesFiado(clienteId) {
        try {
            const idNumerico = parseInt(clienteId, 10);
            if (isNaN(idNumerico)) {
                Logger.warn("Tentativa de mostrar detalhes de fiado com ID inválido:", clienteId);
                return;
            }

            const cliente = await Services.buscarClientePorId(idNumerico);
            if(!cliente) {
                Logger.warn("Cliente não encontrado para o ID:", idNumerico);
                this.showModal("Cliente não encontrado.");
                return;
            }

            const vendas = await Services.getVendasPendentesPorCliente(idNumerico);
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
        } catch(error) {
            Logger.error("Erro ao mostrar detalhes de fiado:", error);
            this.showModal("Ocorreu um erro ao carregar os detalhes da dívida.");
        }
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
                    <td class="p-3 font-semibold">${this.sanitizar(produto.nome)}</td>
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

    async mostrarDetalhesVenda(vendaId) {
        try {
            const venda = await Services.buscarVendaPorId(vendaId);
            if (!venda) {
                Logger.error(`Venda com ID ${vendaId} não encontrada.`);
                this.showModal("Não foi possível carregar os detalhes da venda.");
                return;
            }

            let pagamentosHtml = '';
            const bandeiras = await Services.listarBandeiras();
            const bandeiraMap = new Map(bandeiras.map(b => [b.id, b.nome]));
            const pixCodes = await Services.listarPix();
            const pixMap = new Map(pixCodes.map(p => [p.id, p.nome]));

            if (venda.formaPagamento === 'misto') {
                pagamentosHtml = venda.pagamentos.map(p => {
                    let detalhe = '';
                    if (p.bandeiraId) {
                        detalhe = ` (${bandeiraMap.get(p.bandeiraId) || 'Bandeira desconhecida'})`;
                    }
                    if (p.pixId) {
                        detalhe = ` (${pixMap.get(p.pixId) || 'PIX desconhecido'})`;
                    }
                    return `<li class="capitalize">${p.tipo}${detalhe}: R$ ${p.valor.toFixed(2)}</li>`;
                }).join('');
            } else {
                 let detalhe = '';
                if (venda.bandeiraId) {
                    detalhe = ` (${bandeiraMap.get(venda.bandeiraId) || 'Bandeira desconhecida'})`;
                }
                pagamentosHtml = `<li class="capitalize">${venda.formaPagamento}${detalhe}: R$ ${venda.total.toFixed(2)}</li>`;
            }

            let itensHtml = venda.itens.map(item => `
                <tr>
                    <td class="p-2">${item.quantidade}x ${this.sanitizar(item.nome)}</td>
                    <td class="p-2 text-right">R$ ${item.preco.toFixed(2)}</td>
                    <td class="p-2 text-right">R$ ${(item.quantidade * item.preco).toFixed(2)}</td>
                </tr>
            `).join('');

            const modalMessage = document.getElementById('modal-message');
            modalMessage.innerHTML = `
                <div class="text-left">
                    <h3 class="text-xl font-bold mb-4 text-gray-800">Detalhes da Venda</h3>
                    <p><strong>Data:</strong> ${new Date(venda.dataHora).toLocaleString('pt-BR')}</p>
                    <hr class="my-2">
                    <h4 class="font-semibold mt-4 mb-2">Itens:</h4>
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50"><tr><th class="p-2 text-left">Produto</th><th class="p-2 text-right">Preço Unit.</th><th class="p-2 text-right">Subtotal</th></tr></thead>
                        <tbody>${itensHtml}</tbody>
                    </table>
                    <hr class="my-2">
                    <div class="text-right mt-2">
                        <p><strong>Subtotal:</strong> R$ ${venda.subtotal.toFixed(2)}</p>
                        ${venda.desconto.valor > 0 ? `<p><strong>Desconto:</strong> - R$ ${(venda.desconto.tipo === 'percentual' ? venda.subtotal * (venda.desconto.valor / 100) : venda.desconto.valor).toFixed(2)}</p>` : ''}
                        ${venda.acrescimo.valor > 0 ? `<p><strong>Acréscimo:</strong> + R$ ${(venda.acrescimo.tipo === 'percentual' ? venda.subtotal * (venda.acrescimo.valor / 100) : venda.acrescimo.valor).toFixed(2)}</p>` : ''}
                        <p class="text-xl font-bold"><strong>Total:</strong> R$ ${venda.total.toFixed(2)}</p>
                    </div>
                    <hr class="my-2">
                    <h4 class="font-semibold mt-4 mb-2">Pagamento:</h4>
                    <ul class="list-disc list-inside">${pagamentosHtml}</ul>
                </div>
            `;
            
            const modalButtons = document.getElementById('modal-buttons');
            modalButtons.innerHTML = `<button onclick="App.closeModal()" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold btn-primario">Fechar</button>`;
            
            const modal = document.getElementById('modal');
            const modalContent = document.getElementById('modal-content');
            modal.classList.remove('hidden');
            setTimeout(() => { modalContent.classList.add('scale-100', 'opacity-100'); modalContent.classList.remove('scale-95', 'opacity-0'); }, 10);

        } catch (error) {
            Logger.error("Erro ao mostrar detalhes da venda:", error);
        }
    }
};

export { relatoriosModule };

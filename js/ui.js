// js/ui.js

const ui = {
    // ... (outras funções de UI existentes como renderProducts, renderClients, etc.)

    renderSalesReport: function(sales) {
        const tbody = document.getElementById('sales-report-tbody');
        if (!tbody) return;
        tbody.innerHTML = ''; // Limpa a tabela antes de renderizar

        if (sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">Nenhuma venda registrada neste período.</td></tr>';
            return;
        }

        sales.forEach(sale => {
            const row = document.createElement('tr');
            const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
            row.innerHTML = `
                <td>${new Date(sale.date).toLocaleString()}</td>
                <td>${totalItems}</td>
                <td>R$ ${sale.total.toFixed(2)}</td>
                <td>${sale.paymentMethod}</td>
            `;
            tbody.appendChild(row);
        });
    },

    updateReportSummary: function(sales) {
        const totalSalesEl = document.getElementById('total-sales');
        const totalItemsSoldEl = document.getElementById('total-items-sold');
        const averageTicketEl = document.getElementById('average-ticket');

        if (!totalSalesEl || !totalItemsSoldEl || !averageTicketEl) return;

        const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
        const totalItems = sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
        const averageTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

        totalSalesEl.textContent = `R$ ${totalRevenue.toFixed(2)}`;
        totalItemsSoldEl.textContent = totalItems;
        averageTicketEl.textContent = `R$ ${averageTicket.toFixed(2)}`;
    },

    renderTopProductsChart: function(sales) {
        const ctx = document.getElementById('top-products-chart')?.getContext('2d');
        if (!ctx) return null;

        const productCounts = sales
            .flatMap(sale => sale.items)
            .reduce((acc, item) => {
                acc[item.name] = (acc[item.name] || 0) + item.quantity;
                return acc;
            }, {});

        const sortedProducts = Object.entries(productCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        const labels = sortedProducts.map(([name]) => name);
        const data = sortedProducts.map(([, count]) => count);

        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantidade Vendida',
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    },

    renderSalesByPaymentMethodChart: function(sales) {
        const ctx = document.getElementById('sales-by-payment-chart')?.getContext('2d');
        if (!ctx) return null;

        const paymentCounts = sales.reduce((acc, sale) => {
            acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
            return acc;
        }, {});

        const labels = Object.keys(paymentCounts);
        const data = Object.values(paymentCounts);

        return new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total por Forma de Pagamento',
                    data: data,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                    ],
                }]
            }
        });
    },

    // --- NOVAS FUNÇÕES DE MODAL ---

    /**
     * Exibe um modal de alerta.
     * @param {string} message - A mensagem a ser exibida.
     */
    showAlert: function(message) {
        const modal = document.getElementById('generic-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalButtons = document.getElementById('modal-buttons');

        modalTitle.textContent = 'Aviso';
        modalMessage.textContent = message;
        
        modalButtons.innerHTML = '<button id="modal-ok-btn" class="btn">OK</button>';
        
        modal.style.display = 'flex';

        document.getElementById('modal-ok-btn').onclick = () => {
            modal.style.display = 'none';
        };
    },

    /**
     * Exibe um modal de confirmação.
     * @param {string} message - A mensagem de confirmação.
     * @param {function} onConfirm - Callback a ser executado se o usuário confirmar.
     */
    showConfirm: function(message, onConfirm) {
        const modal = document.getElementById('generic-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const modalButtons = document.getElementById('modal-buttons');

        modalTitle.textContent = 'Confirmação';
        modalMessage.textContent = message;

        modalButtons.innerHTML = `
            <button id="modal-confirm-btn" class="btn btn-danger">Confirmar</button>
            <button id="modal-cancel-btn" class="btn btn-secondary">Cancelar</button>
        `;
        
        modal.style.display = 'flex';

        document.getElementById('modal-confirm-btn').onclick = () => {
            modal.style.display = 'none';
            onConfirm();
        };

        document.getElementById('modal-cancel-btn').onclick = () => {
            modal.style.display = 'none';
        };
    }
};

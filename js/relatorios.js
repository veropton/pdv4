// js/relatorios.js

document.addEventListener('DOMContentLoaded', () => {
    // Gráficos são inicializados pela função setupReportsPage quando a seção é exibida
});

function setupReportsPage() {
    console.log("Configurando a página de relatórios...");
    
    const filterButton = document.getElementById('filter-reports-btn');
    if (filterButton) {
        // Remove listener antigo para evitar duplicatas se a função for chamada múltiplas vezes
        filterButton.removeEventListener('click', handleFilterClick);
        // Adiciona o novo listener
        filterButton.addEventListener('click', handleFilterClick);
    } else {
        console.error("Botão de filtro não encontrado.");
        return;
    }

    // Define as datas padrão: últimos 30 dias
    const endDateInput = document.getElementById('endDate');
    const startDateInput = document.getElementById('startDate');
    
    if(endDateInput && startDateInput) {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        endDateInput.value = today.toISOString().split('T')[0];
        startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
    }

    // Carrega os relatórios com os dados do período padrão
    loadAndRenderReports();
}

function handleFilterClick() {
    console.log("Botão de filtro clicado.");
    loadAndRenderReports();
}

function loadAndRenderReports() {
    const startDateValue = document.getElementById('startDate').value;
    const endDateValue = document.getElementById('endDate').value;

    if (!startDateValue || !endDateValue) {
        ui.showAlert("Por favor, selecione a data de início e a data de fim.");
        return;
    }

    const allSales = db.getSales();
    const filteredSales = filterSalesByPeriod(allSales, startDateValue, endDateValue);

    if(filteredSales.length === 0){
        console.log("Nenhuma venda encontrada para o período selecionado.");
    }

    // Atualiza a UI com os dados filtrados
    ui.renderSalesReport(filteredSales);
    ui.updateReportSummary(filteredSales);
    
    // Destrói gráficos antigos antes de renderizar novos para evitar sobreposição
    if (window.topProductsChart instanceof Chart) {
        window.topProductsChart.destroy();
    }
    if (window.salesByPaymentChart instanceof Chart) {
        window.salesByPaymentChart.destroy();
    }

    // Renderiza novos gráficos
    window.topProductsChart = ui.renderTopProductsChart(filteredSales);
    window.salesByPaymentChart = ui.renderSalesByPaymentMethodChart(filteredSales);
}

/**
 * Filtra as vendas com base em um período de datas.
 * @param {Array} sales - A lista de todas as vendas.
 * @param {string} startDateStr - A data de início no formato 'YYYY-MM-DD'.
 * @param {string} endDateStr - A data de fim no formato 'YYYY-MM-DD'.
 * @returns {Array} A lista de vendas filtradas.
 */
function filterSalesByPeriod(sales, startDateStr, endDateStr) {
    // Cria objetos Date. Adiciona a hora para garantir que o intervalo seja inclusivo.
    // new Date('2023-10-25') cria uma data com a hora 00:00:00 no fuso horário local.
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0); // Garante que comece no início do dia

    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999); // Garante que termine no final do dia

    return sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= startDate && saleDate <= endDate;
    });
}

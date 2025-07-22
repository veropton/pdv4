// js/produtos.js

document.addEventListener('DOMContentLoaded', () => {
    // Lógica existente para a seção de produtos
});

function setupProductsPage() {
    // Lógica para configurar a página de produtos
    // Ex: carregar e renderizar produtos
}

// ... outras funções relacionadas a produtos (adicionar, editar, etc.)

function deleteProduct(productId) {
    // USA O NOVO MODAL DE CONFIRMAÇÃO
    ui.showConfirm('Tem certeza que deseja excluir este produto?', () => {
        // Esta função (callback) só será executada se o usuário clicar em "Confirmar"
        const success = db.deleteProduct(productId);
        if (success) {
            logger.log('Produto excluído com sucesso');
            ui.showAlert('Produto excluído com sucesso!');
            // Atualiza a UI após a exclusão
            // Ex: ui.renderProductTable(db.getProducts());
        } else {
            logger.error('Falha ao excluir produto');
            ui.showAlert('Falha ao excluir o produto.');
        }
    });
}

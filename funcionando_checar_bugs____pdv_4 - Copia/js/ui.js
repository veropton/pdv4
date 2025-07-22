import { state } from './state.js';
import { Services } from './services.js';

export const UI = {

  // Atualiza o conteúdo de uma tabela ou lista genérica.
  atualizarListaGerenciamento(tbodyId, items, renderRow) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = '';
    if (items.length === 0) {
        const colspan = tbody.previousElementSibling?.firstElementChild?.children.length || 1;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center p-10 text-gray-500">Nenhum item encontrado.</td></tr>`;
    } else {
        items.forEach(item => tbody.appendChild(renderRow(item)));
    }
  },

  // Mostra um modal de mensagem simples com um botão "OK".
  showModal(message) {
      const modal = document.getElementById('modal');
      const modalContent = document.getElementById('modal-content');
      const modalMessage = document.getElementById('modal-message');
      const modalButtons = document.getElementById('modal-buttons');

      modalMessage.innerHTML = `<p>${message}</p>`;
      modalButtons.innerHTML = `<button onclick="App.closeModal()" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold btn-primario">OK</button>`;
      
      modal.classList.remove('hidden');
      setTimeout(() => {
          modalContent.classList.add('scale-100', 'opacity-100');
          modalContent.classList.remove('scale-95', 'opacity-0');
      }, 10);
  },

  // Mostra um modal de confirmação com opções "Sim" e "Não".
  showConfirmation(message, onConfirm) {
      const modal = document.getElementById('modal');
      const modalContent = document.getElementById('modal-content');
      const modalMessage = document.getElementById('modal-message');
      const modalButtons = document.getElementById('modal-buttons');

      modalMessage.innerText = message;
      modalButtons.innerHTML = `<button id="confirm-cancel" class="bg-gray-300 px-6 py-2 rounded-lg font-bold">Não</button><button id="confirm-ok" class="bg-red-500 text-white px-6 py-2 rounded-lg font-bold">Sim</button>`;
      
      modal.classList.remove('hidden');
      setTimeout(() => {
          modalContent.classList.add('scale-100', 'opacity-100');
          modalContent.classList.remove('scale-95', 'opacity-0');
      }, 10);
      
      document.getElementById('confirm-ok').onclick = () => {
          onConfirm();
          this.closeModal();
      };
      document.getElementById('confirm-cancel').onclick = () => this.closeModal();
  },

  // Fecha o modal principal.
  closeModal() {
      const modal = document.getElementById('modal');
      const modalContent = document.getElementById('modal-content');
      modalContent.classList.remove('scale-100', 'opacity-100');
      modalContent.classList.add('scale-95', 'opacity-0');
      setTimeout(() => modal.classList.add('hidden'), 200);
  },

  // Torna uma tela principal visível e oculta as outras.
  mostrarTela(idTela, initFunction) {
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
      }

      // Executa uma função de inicialização específica para a tela, se fornecida.
      if (initFunction) {
          initFunction();
      }
  },

  // Alterna a visibilidade do conteúdo de abas.
  switchTab(containerId, buttonId, contentPrefix) {
      const container = document.getElementById(containerId);
      if (!container) return;

      container.querySelectorAll('.tab-btn').forEach(btn => {
          btn.classList.remove('tab-btn-active');
          btn.classList.add('text-gray-500', 'border-transparent', 'hover:text-gray-700', 'hover:border-gray-300');
      });
      
      container.querySelectorAll(`[id^=${contentPrefix}]`).forEach(content => content.classList.add('hidden'));
      
      const activeBtn = document.getElementById(buttonId);
      if(activeBtn) {
        activeBtn.classList.add('tab-btn-active');
        activeBtn.classList.remove('text-gray-500', 'border-transparent', 'hover:text-gray-700', 'hover:border-gray-300');
      }

      const activeContentId = contentPrefix + buttonId.split('-')[1];
      const activeContent = document.getElementById(activeContentId);
      if (activeContent) {
          activeContent.classList.remove('hidden');
      }
  },

  // Verifica e exibe o alerta de estoque baixo no ícone do menu.
  async verificarAlertaEstoque() {
    const produtos = await Services.listarProdutos();
    const temEstoqueBaixo = produtos.some(p => (p.estoque || 0) <= (p.estoqueMinimo || 0));
    const alerta = document.getElementById('alerta-relatorios');
    if (alerta) {
        alerta.style.display = temEstoqueBaixo ? 'block' : 'none';
    }
  },
};
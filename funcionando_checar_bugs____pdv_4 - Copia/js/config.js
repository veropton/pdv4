import { Services } from './services.js';
import { UI } from './ui.js';

const configModule = {
    async aplicarCustomizacoes() {
        const nomeEmpresa = await Services.getConfig('nomeEmpresa');
        const logoBase64 = await Services.getConfig('logoImage');
        const corTema = await Services.getConfig('themeColor');

        const nomePadrao = "Miro Gás & Água";
        const corPadrao = "#2563eb";

        const nomeFinal = nomeEmpresa ? nomeEmpresa.value : nomePadrao;
        const corFinal = corTema ? corTema.value : corPadrao;

        document.getElementById('titulo-login').textContent = nomeFinal;
        document.getElementById('titulo-header').textContent = `${nomeFinal} PDV`;

        const logoLogin = document.getElementById('logo-login');
        const logoHeader = document.getElementById('logo-header');
        const logoPreview = document.getElementById('logo-preview');

        if (logoBase64 && logoBase64.value) {
            logoLogin.src = logoBase64.value;
            logoHeader.src = logoBase64.value;
            logoLogin.classList.remove('hidden');
            logoHeader.classList.remove('hidden');
            if (logoPreview) {
                logoPreview.innerHTML = `<img src="${logoBase64.value}" class="max-h-full max-w-full">`;
            }
        } else {
            logoLogin.classList.add('hidden');
            logoHeader.classList.add('hidden');
             if (logoPreview) {
                logoPreview.innerHTML = `<span class="text-gray-500">Sem logo</span>`;
            }
        }
        
        const styleSheet = document.getElementById('estilos-customizados');
        if(styleSheet) {
            styleSheet.innerHTML = `
                :root {
                    --cor-primaria: ${corFinal};
                    --cor-primaria-hover: ${this.ajustarBrilhoCor(corFinal, -10)};
                }
                #app-container > header { background-color: var(--cor-primaria) !important; }
                .btn-primario { 
                    background-color: var(--cor-primaria) !important;
                    border-color: var(--cor-primaria) !important;
                    color: white !important;
                }
                .btn-primario:hover { 
                    background-color: var(--cor-primaria-hover) !important;
                    border-color: var(--cor-primaria-hover) !important;
                }
                .nav-btn-active {
                    background-color: var(--cor-primaria) !important;
                    color: white !important;
                }
                .tab-btn-active {
                    color: var(--cor-primaria) !important;
                    border-color: var(--cor-primaria) !important;
                }
                 .forma-pagamento-btn.selected {
                    border-color: var(--cor-primaria) !important;
                    background-color: ${this.ajustarBrilhoCor(corFinal, 80)} !important;
                    color: var(--cor-primaria) !important;
                }
            `;
        }

        const nomeEmpresaInput = document.getElementById('nome-empresa');
        const corTemaInput = document.getElementById('cor-tema');
        if (nomeEmpresaInput) nomeEmpresaInput.value = nomeFinal;
        if (corTemaInput) corTemaInput.value = corFinal;
    },

    async salvarAparencia() {
        const nomeEmpresa = document.getElementById('nome-empresa').value;
        const corTema = document.getElementById('cor-tema').value;
        const logoFile = document.getElementById('imagem-logo').files[0];

        await Services.setConfig('nomeEmpresa', this.sanitizar(nomeEmpresa));
        await Services.setConfig('themeColor', corTema);

        if (logoFile) {
            const logoBase64 = await this.toBase64(logoFile);
            await Services.setConfig('logoImage', logoBase64);
        }

        await this.aplicarCustomizacoes();
        this.showModal("Aparência salva com sucesso!");
    },
    
    redefinirAparencia() {
        this.showConfirmation("Tem certeza que deseja redefinir a aparência para o padrão?", async () => {
            await this.db.configuracoes.bulkDelete(['nomeEmpresa', 'logoImage', 'themeColor']);
            document.getElementById('imagem-logo').value = '';
            await this.aplicarCustomizacoes();
            this.showModal("Aparência redefinida.");
        });
    },

    async previewLogo(event) {
        const file = event.target.files[0];
        if (file) {
            const base64Image = await this.toBase64(file);
            document.getElementById('logo-preview').innerHTML = `<img src="${base64Image}" class="max-h-full max-w-full">`;
        }
    },

    async salvarBandeira(event) {
        event.preventDefault();
        const nome = this.sanitizar(document.getElementById('nome-bandeira').value.trim());
        const taxa = parseFloat(document.getElementById('taxa-bandeira').value);
        const tipo = document.getElementById('tipo-bandeira').value;

        if (!nome || isNaN(taxa) || taxa < 0) { this.showModal('Por favor, preencha os dados corretamente.'); return; }
        const data = { nome, taxa, tipo };
        await Services.salvarBandeira(data, this.edicaoBandeiraId);
        this.showModal(this.edicaoBandeiraId ? 'Bandeira atualizada!' : 'Bandeira cadastrada!');
        this.cancelarEdicaoBandeira();
        await this.atualizarListaGerenciamentoBandeiras();
    },

    async atualizarListaGerenciamentoBandeiras() {
        const bandeiras = await Services.listarBandeiras();
        UI.atualizarListaGerenciamento('lista-bandeiras-gerenciar', bandeiras, (b) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-gray-50';
            tr.innerHTML = `<td class="p-3">${b.nome}</td><td class="p-3">${b.taxa.toFixed(2)}%</td><td class="p-3 capitalize">${b.tipo}</td><td class="p-3 text-right"><button onclick="App.prepararEdicaoBandeira(${b.id})" class="bg-yellow-500 text-white px-3 py-1 rounded-md text-sm font-semibold mr-2">Editar</button><button onclick="App.confirmarExclusaoBandeira(${b.id})" class="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold">Excluir</button></td>`;
            return tr;
        });
    },

    async prepararEdicaoBandeira(id) {
        const bandeira = await Services.buscarBandeiraPorId(id);
        if (!bandeira) return;
        this.edicaoBandeiraId = id;
        document.getElementById('nome-bandeira').value = bandeira.nome;
        document.getElementById('taxa-bandeira').value = bandeira.taxa;
        document.getElementById('tipo-bandeira').value = bandeira.tipo;
        document.getElementById('btn-cancelar-edicao-bandeira').classList.remove('hidden');
    },

    cancelarEdicaoBandeira() {
        this.edicaoBandeiraId = null;
        const form = document.getElementById('form-cadastro-bandeira');
        if (form) {
            form.reset();
            document.getElementById('btn-cancelar-edicao-bandeira').classList.add('hidden');
        }
    },

    async confirmarExclusaoBandeira(id) {
        const bandeira = await Services.buscarBandeiraPorId(id);
        if (!bandeira) return;
        this.showConfirmation(`Excluir a bandeira "${bandeira.nome}"?`, async () => {
            await Services.excluirBandeira(id);
            await this.atualizarListaGerenciamentoBandeiras();
            this.showModal("Bandeira excluída!");
        });
    },

    async salvarUsuario(event) {
        event.preventDefault();
        const usuario = this.sanitizar(document.getElementById('nome-usuario-cadastro').value.trim());
        const senha = document.getElementById('senha-usuario-cadastro').value;

        if (!usuario || !senha) {
            this.showModal('Por favor, preencha todos os campos.');
            return;
        }

        try {
            await Services.salvarUsuario({ usuario, senha });
            this.showModal('Usuário cadastrado com sucesso!');
            document.getElementById('form-cadastro-usuario').reset();
            await this.atualizarListaGerenciamentoUsuarios();
        } catch (error) {
            this.showModal(error.message);
        }
    },

    async atualizarListaGerenciamentoUsuarios() {
        const usuarios = await Services.listarUsuarios();
        UI.atualizarListaGerenciamento('lista-usuarios-gerenciar', usuarios, (user) => {
            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-gray-50';
            const recoveryButton = `<button onclick="App.abrirModalPerguntaSeguranca(${user.id}, '${user.usuario}')" class="bg-green-500 text-white px-3 py-1 rounded-md text-sm font-semibold mr-2 hover:bg-green-600">Recuperação</button>`;
            const changePasswordButton = `<button onclick="App.abrirModalAlterarSenha(${user.id}, '${user.usuario}')" class="bg-yellow-500 text-white px-3 py-1 rounded-md text-sm font-semibold mr-2 hover:bg-yellow-600">Alterar Senha</button>`;
            const deleteButton = `<button onclick="App.confirmarExclusaoUsuario(${user.id})" class="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-red-600">Excluir</button>`;
            tr.innerHTML = `
                <td class="p-3">${user.usuario}</td>
                <td class="p-3 text-right">
                    ${recoveryButton}
                    ${changePasswordButton}
                    ${deleteButton}
                </td>`;
            return tr;
        });
    },

    async confirmarExclusaoUsuario(id) {
        this.showConfirmation(`Tem certeza que deseja excluir este usuário?`, async () => {
            try {
                await Services.excluirUsuario(id);
                await this.atualizarListaGerenciamentoUsuarios();
                this.showModal("Usuário excluído!");
            } catch (error) {
                this.showModal(error.message); 
            }
        });
    },

    abrirModalAlterarSenha(userId, nomeUsuario) {
        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modal-content');
        const modalMessage = document.getElementById('modal-message');
        const modalButtons = document.getElementById('modal-buttons');

        modalMessage.innerHTML = `
            <h3 class="text-xl font-bold mb-4">Alterar Senha para "${nomeUsuario}"</h3>
            <div class="text-left">
                <label for="nova-senha-modal" class="font-semibold text-gray-600 mb-1 block">Nova Senha:</label>
                <input type="password" id="nova-senha-modal" required class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500">
            </div>
        `;
        
        modalButtons.innerHTML = `
            <button onclick="App.closeModal()" class="bg-gray-300 px-6 py-2 rounded-lg font-bold">Cancelar</button>
            <button onclick="App.confirmarAlteracaoSenha(${userId})" class="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold btn-primario">Salvar</button>
        `;

        modal.classList.remove('hidden');
        setTimeout(() => { modalContent.classList.add('scale-100', 'opacity-100'); modalContent.classList.remove('scale-95', 'opacity-0'); }, 10);
    },

    async confirmarAlteracaoSenha(userId) {
        const novaSenha = document.getElementById('nova-senha-modal').value;
        if (!novaSenha) {
            const label = document.querySelector('label[for="nova-senha-modal"]');
            label.textContent = "Nova Senha (obrigatório!):";
            label.classList.add('text-red-500');
            return;
        }

        try {
            await Services.alterarSenha(userId, novaSenha);
            this.closeModal();
            this.showModal("Senha alterada com sucesso!");
        } catch (error) {
            this.closeModal();
            this.showModal(`Erro ao alterar senha: ${error.message}`);
        }
    },

    async salvarPix(event) {
        event.preventDefault();
        const nome = this.sanitizar(document.getElementById('nome-pix').value.trim());
        const imagemInput = document.getElementById('imagem-pix').files[0];

        if (!nome) {
            this.showModal('O nome de identificação é obrigatório.');
            return;
        }

        if (!imagemInput && !this.edicaoPixId) {
            this.showModal('A imagem do QR Code é obrigatória ao criar um novo PIX.');
            return;
        }

        const data = { nome };

        if (imagemInput) {
            try {
                data.imagem = await this.toBase64(imagemInput);
            } catch (error) {
                console.error("Erro ao converter imagem para Base64:", error);
                this.showModal("Ocorreu um erro ao processar a imagem.");
                return;
            }
        } else if (this.edicaoPixId) {
            const pixExistente = await Services.buscarPixPorId(this.edicaoPixId);
            data.imagem = pixExistente.imagem;
        }

        try {
            await Services.salvarPix(data, this.edicaoPixId);
            this.showModal(this.edicaoPixId ? 'PIX atualizado com sucesso!' : 'PIX cadastrado com sucesso!');
            this.cancelarEdicaoPix();
            await this.atualizarListaPix();
        } catch (error) {
            console.error("Erro ao salvar PIX:", error);
            this.showModal("Ocorreu um erro ao salvar o PIX.");
        }
    },

    async atualizarListaPix() {
        const pixQRCodes = await Services.listarPix();
        const container = document.getElementById('lista-pix-gerenciar');
        if (!container) return;
        container.innerHTML = '';
        if (pixQRCodes.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 mt-4">Nenhum QR Code PIX cadastrado.</p>';
            return;
        }
        pixQRCodes.forEach(pix => {
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between bg-gray-100 p-3 rounded-lg mt-2';
            div.innerHTML = `
                <div class="flex items-center gap-4">
                    <img src="${pix.imagem || 'https://placehold.co/40x40/e0e0e0/757575?text=QR'}" alt="QR Code" class="w-10 h-10 rounded-md object-cover">
                    <span class="font-semibold">${this.sanitizar(pix.nome)}</span>
                </div>
                <div>
                    <button onclick="App.prepararEdicaoPix(${pix.id})" class="bg-yellow-500 text-white px-3 py-1 rounded-md text-sm font-semibold mr-2 hover:bg-yellow-600">Editar</button>
                    <button onclick="App.confirmarExclusaoPix(${pix.id})" class="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-semibold hover:bg-red-600">Excluir</button>
                </div>
            `;
            container.appendChild(div);
        });
    },

    async prepararEdicaoPix(id) {
        const pix = await Services.buscarPixPorId(id);
        if (!pix) return;
        this.edicaoPixId = id;
        document.getElementById('pix-id-edicao').value = id;
        document.getElementById('nome-pix').value = pix.nome;
        document.querySelector('#form-cadastro-pix button[type=submit]').textContent = 'Atualizar PIX';
        document.getElementById('btn-cancelar-edicao-pix').classList.remove('hidden');
        document.getElementById('form-cadastro-pix').scrollIntoView({ behavior: 'smooth' });
    },

    cancelarEdicaoPix() {
        this.edicaoPixId = null;
        const form = document.getElementById('form-cadastro-pix');
        if (form) {
            form.reset();
            document.getElementById('pix-id-edicao').value = '';
            document.querySelector('#form-cadastro-pix button[type=submit]').textContent = 'Salvar PIX';
            document.getElementById('btn-cancelar-edicao-pix').classList.add('hidden');
        }
    },

    async confirmarExclusaoPix(id) {
        const pix = await Services.buscarPixPorId(id);
        if (!pix) return;
        this.showConfirmation(`Tem certeza que deseja excluir o PIX "${this.sanitizar(pix.nome)}"?`, async () => {
            await Services.excluirPix(id);
            this.showModal("PIX excluído com sucesso!");
            await this.atualizarListaPix();
        });
    },
};

export { configModule };

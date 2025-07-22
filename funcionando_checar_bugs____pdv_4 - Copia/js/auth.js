import { Services } from './services.js';

const authModule = {
    async fazerLogin(event) {
        event.preventDefault();
        const usuario = document.getElementById('usuario').value;
        const senha = document.getElementById('senha').value;
        const errorMessage = document.getElementById('login-error-message');
        this.usuarioLogado = await Services.autenticarUsuario(usuario, senha);
        if (this.usuarioLogado) {
            sessionStorage.setItem('usuarioLogado', JSON.stringify(this.usuarioLogado));
            this.mostrarApp();
        } else {
            errorMessage.textContent = 'Usuário ou senha inválidos.';
            setTimeout(() => errorMessage.textContent = '', 3000);
        }
    },

    fazerLogout() {
        this.showConfirmation("Deseja realmente sair do sistema?", () => {
            this.usuarioLogado = null;
            sessionStorage.removeItem('usuarioLogado');
            window.location.reload();
        });
    },
    
    mostrarLogin() {
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('tela-recuperar-senha').classList.remove('ativo');
        document.getElementById('tela-recuperar-senha').classList.add('hidden');
        document.getElementById('tela-login').classList.remove('hidden');
        document.getElementById('tela-login').classList.add('ativo');
    },

    mostrarApp() {
        document.getElementById('tela-login').classList.remove('ativo');
        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('flex');
        
        this.mostrarTela('tela-vendas');
        this.verificarAlertaEstoque();
    },
    
    mostrarTelaRecuperacao() {
        document.getElementById('tela-login').classList.remove('ativo');
        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('tela-recuperar-senha').classList.remove('hidden');
        document.getElementById('tela-recuperar-senha').classList.add('ativo');
        document.getElementById('recuperar-passo-1').classList.remove('hidden');
        document.getElementById('recuperar-passo-2').classList.add('hidden');
        document.getElementById('recuperar-passo-3').classList.add('hidden');
        document.getElementById('usuario-recuperar').value = '';
        document.getElementById('resposta-recuperar').value = '';
        document.getElementById('nova-senha-recuperar').value = '';
        document.getElementById('recuperar-error-message').textContent = '';
    },

    async verificarUsuarioParaRecuperacao() {
        const nomeUsuario = document.getElementById('usuario-recuperar').value.trim();
        const errorMsg = document.getElementById('recuperar-error-message');
        errorMsg.textContent = '';

        if (!nomeUsuario) {
            errorMsg.textContent = 'Por favor, insira um nome de usuário.';
            return;
        }

        const user = await Services.buscarUsuarioPorNome(nomeUsuario);
        if (!user || !user.perguntaSeguranca) {
            errorMsg.textContent = 'Usuário não encontrado ou sem pergunta de segurança definida.';
            return;
        }

        this.recuperacao.userId = user.id;
        this.recuperacao.usuario = user.usuario;
        document.getElementById('pergunta-seguranca-texto').textContent = user.perguntaSeguranca;
        document.getElementById('recuperar-passo-1').classList.add('hidden');
        document.getElementById('recuperar-passo-2').classList.remove('hidden');
    },

    async verificarRespostaParaRecuperacao() {
        const resposta = document.getElementById('resposta-recuperar').value;
        const errorMsg = document.getElementById('recuperar-error-message');
        errorMsg.textContent = '';
        
        const isCorrect = await Services.verificarRespostaSeguranca(this.recuperacao.userId, resposta);
        if (isCorrect) {
            document.getElementById('recuperar-passo-2').classList.add('hidden');
            document.getElementById('recuperar-passo-3').classList.remove('hidden');
        } else {
            errorMsg.textContent = 'Resposta incorreta. Tente novamente.';
        }
    },

    async finalizarRecuperacaoSenha() {
        const novaSenha = document.getElementById('nova-senha-recuperar').value;
        const errorMsg = document.getElementById('recuperar-error-message');
        errorMsg.textContent = '';

        try {
            await Services.alterarSenha(this.recuperacao.userId, novaSenha);
            this.showModal("Senha redefinida com sucesso! Você já pode fazer o login.");
            this.mostrarLogin();
        } catch (error) {
            errorMsg.textContent = error.message;
        }
    },
};

export { authModule };

// Helper function to hash text using SHA-256.
async function hash(text) {
    if (!text) return '';
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Objeto principal que contém todos os serviços
const Services = {
    db: null,
    init(dbInstance) { this.db = dbInstance; },
    
    async verificarUsuarioPadrao() {
        const userCount = await this.db.usuarios.count();
        if (userCount === 0) {
            const hashedAdminPassword = await hash('admin');
            await this.db.usuarios.add({ 
                usuario: 'admin', 
                senha: hashedAdminPassword,
                perguntaSeguranca: '',
                respostaSeguranca: ''
            });
        }
    },

    async autenticarUsuario(usuario, senha) {
        const user = await this.db.usuarios.where('usuario').equalsIgnoreCase(usuario).first();
        if (!user) return null;
        const hashedSenha = await hash(senha);
        return (user.senha === hashedSenha) ? user : null;
    },

    // --- User Management ---
    async salvarUsuario(data) {
        const hashedSenha = await hash(data.senha);
        const userData = {
            usuario: data.usuario,
            senha: hashedSenha,
            perguntaSeguranca: '',
            respostaSeguranca: ''
        };
        const existingUser = await this.db.usuarios.get({ usuario: data.usuario });
        if (existingUser) {
            throw new Error("Este nome de usuário já existe.");
        }
        return this.db.usuarios.add(userData);
    },
    listarUsuarios() { return this.db.usuarios.orderBy('usuario').toArray(); },
    async excluirUsuario(id) {
        const totalUsuarios = await this.db.usuarios.count();
        if (totalUsuarios <= 1) {
            throw new Error("Não é possível excluir o único usuário do sistema.");
        }
        return this.db.usuarios.delete(id);
    },
    async alterarSenha(userId, novaSenha) {
        if (!novaSenha) {
            throw new Error("A nova senha não pode estar em branco.");
        }
        const hashedNovaSenha = await hash(novaSenha);
        return this.db.usuarios.update(userId, { senha: hashedNovaSenha });
    },
    
    // --- Password Recovery ---
    async salvarPerguntaSeguranca(userId, pergunta, resposta) {
        if (!pergunta || !resposta) {
            throw new Error("Pergunta e resposta são obrigatórias.");
        }
        const respostaHash = await hash(resposta.toLowerCase().trim());
        return this.db.usuarios.update(userId, {
            perguntaSeguranca: pergunta,
            respostaSeguranca: respostaHash
        });
    },
    buscarUsuarioPorNome(nomeUsuario) {
        return this.db.usuarios.where('usuario').equalsIgnoreCase(nomeUsuario).first();
    },
    async verificarRespostaSeguranca(userId, resposta) {
        const user = await this.db.usuarios.get(userId);
        if (!user) throw new Error("Usuário não encontrado.");
        const respostaHash = await hash(resposta.toLowerCase().trim());
        return user.respostaSeguranca === respostaHash;
    },

    // --- CRUD ---
    salvarProduto(data, id) { return id ? this.db.produtos.update(id, data) : this.db.produtos.add(data); },
    listarProdutos() { return this.db.produtos.orderBy('nome').toArray(); },
    buscarProdutoPorId(id) { return this.db.produtos.get(id); },
    excluirProduto(id) { return this.db.produtos.delete(id); },
    salvarCliente(data, id) { return id ? this.db.clientes.update(id, data) : this.db.clientes.add(data); },
    listarClientes() { return this.db.clientes.orderBy('nome').toArray(); },
    buscarClientePorId(id) { return this.db.clientes.get(id); },
    excluirCliente(id) { return this.db.clientes.delete(id); },
    salvarFornecedor(data, id) { return id ? this.db.fornecedores.update(id, data) : this.db.fornecedores.add(data); },
    listarFornecedores() { return this.db.fornecedores.orderBy('nome').toArray(); },
    buscarFornecedorPorId(id) { return this.db.fornecedores.get(id); },
    excluirFornecedor(id) { return this.db.fornecedores.delete(id); },
    salvarBandeira(data, id) { return id ? this.db.bandeiras.update(id, data) : this.db.bandeiras.add(data); },
    listarBandeiras() { return this.db.bandeiras.orderBy('nome').toArray(); },
    buscarBandeiraPorId(id) { return this.db.bandeiras.get(id); },
    excluirBandeira(id) { return this.db.bandeiras.delete(id); },
    setConfig(key, value) { return this.db.configuracoes.put({ key, value }); },
    getConfig(key) { return this.db.configuracoes.get(key); },
    salvarPix(data, id) { return id ? this.db.pix.update(id, data) : this.db.pix.add(data); },
    listarPix() { return this.db.pix.orderBy('nome').toArray(); },
    buscarPixPorId(id) { return this.db.pix.get(id); },
    excluirPix(id) { return this.db.pix.delete(id); },

    // --- Sales and Reporting ---
    buscarVendaPorId(id) { return this.db.vendas.get(id); }, // <-- FUNÇÃO ADICIONADA
    async finalizarVenda(venda) {
        return this.db.transaction('rw', this.db.vendas, this.db.produtos, async () => {
            await this.db.vendas.add(venda);
            for (const item of venda.itens) {
                const produto = await this.db.produtos.where('nome').equals(item.nome).first();
                if (produto) {
                    await this.db.produtos.update(produto.id, { estoque: produto.estoque - item.quantidade });
                }
            }
        });
    },
    async cancelarVenda(vendaId) {
        return this.db.transaction('rw', this.db.vendas, this.db.produtos, async () => {
            const venda = await this.db.vendas.get(vendaId);
            if (venda && venda.status !== 'cancelada') {
                await this.db.vendas.update(vendaId, { status: 'cancelada' });
                for (const item of venda.itens) {
                    const produto = await this.db.produtos.where('nome').equals(item.nome).first();
                    if (produto) {
                        await this.db.produtos.update(produto.id, { estoque: produto.estoque + item.quantidade });
                    }
                }
            }
        });
    },
    quitarVendasSelecionadas(vendaIds) {
        return this.db.vendas.where('id').anyOf(vendaIds).modify({ status: 'concluida' });
    },
    async getVendasPorPeriodo(filtro) {
        let collection;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (filtro === 'hoje') {
            collection = this.db.vendas.where('dataHora').aboveOrEqual(hoje);
        } else if (filtro === '7dias') {
            const dataInicio = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
            collection = this.db.vendas.where('dataHora').aboveOrEqual(dataInicio);
        } else if (filtro === 'mes') {
            const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            collection = this.db.vendas.where('dataHora').aboveOrEqual(dataInicio);
        } else { // 'todos'
            collection = this.db.vendas;
        }
        
        return collection.toArray();
    },
    getVendasPendentes() { return this.db.vendas.where('status').equals('pendente').toArray(); },
    getVendasPendentesPorCliente(clienteId) { return this.db.vendas.where({clienteId: clienteId, status: 'pendente'}).toArray(); },
    
    // --- Backup and Restore ---
    async getBackupData() {
        const tables = ['usuarios', 'produtos', 'clientes', 'vendas', 'bandeiras', 'fornecedores', 'configuracoes', 'pix'];
        const backupData = {};
        for (const table of tables) {
            if (this.db[table]) {
                backupData[table] = await this.db[table].toArray();
            }
        }
        return backupData;
    },
    async restoreBackupData(data) {
        const tabelasDoBackup = Object.keys(data);
        const tables = tabelasDoBackup.map(t => this.db[t]).filter(t => t);
        return this.db.transaction('rw', tables, async () => {
            for (const tableName of tabelasDoBackup) {
                if (this.db[tableName]) {
                    await this.db[tableName].clear();
                    await this.db[tableName].bulkAdd(data[tableName]);
                }
            }
        });
    },
    limparBancoDeDados() {
        const tables = this.db.tables.map(table => this.db[table]);
        return this.db.transaction('rw', tables, async () => {
            await Promise.all(tables.map(table => table.clear()));
        });
    },
};

export { Services };

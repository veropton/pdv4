import { Services } from './services.js';
import { Logger } from './logger.js';

const dbModule = {
    async initDB() {
        try {
            const db = new Dexie("PDVDatabase");
            // Versão incrementada para 10 e adicionado índice composto
            db.version(10).stores({
                produtos: '++id, nome, nomeNormalizado, estoque',
                clientes: '++id, nome',
                vendas: '++id, dataHora, [clienteId+status], clienteId, bandeiraId, status',
                bandeiras: '++id, nome, tipo',
                fornecedores: '++id, nome',
                configuracoes: 'key',
                usuarios: '++id, &usuario, perguntaSeguranca',
                pix: '++id, nome'
            });
            Services.init(db);
            await Services.verificarUsuarioPadrao();
            Logger.info("Base de dados inicializada com sucesso.");
            return db; // Retorna a instância do DB
        } catch (error) {
            Logger.error("Falha ao inicializar a base de dados.", error);
            throw error; // Lança o erro para ser capturado pelo init principal
        }
    },
};

export { dbModule };

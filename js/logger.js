const Logger = {
  info(message, ...args) {
      console.log(`[INFO] ${new Date().toISOString()}: ${message}`, ...args);
  },
  warn(message, ...args) {
      console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...args);
  },
  error(message, error, ...args) {
      console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error, ...args);
  }
};

// Captura de erros globais não tratados
window.addEventListener('error', (event) => {
  Logger.error('Erro global não capturado:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  Logger.error('Rejeição de Promise não capturada:', event.reason);
});

export { Logger };

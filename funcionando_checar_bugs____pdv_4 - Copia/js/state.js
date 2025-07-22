export const state = {
  db: null,
  usuarioLogado: null,
  vendaAtual: {},
  ultimaVendaConcluida: null,
  formaPagamentoSelecionada: null,
  edicaoProdutoId: null,
  edicaoClienteId: null,
  edicaoFornecedorId: null,
  edicaoBandeiraId: null,
  edicaoPixId: null,
  descontoVenda: { tipo: 'valor', valor: 0 },
  acrescimoVenda: { tipo: 'valor', valor: 0 },
  pagamentosMistos: [],
  recuperacao: {
      userId: null,
      usuario: null,
  },
  graficos: {
      pagamentos: null,
      produtos: null,
      faturamento: null,
  },
  ordenacaoAtual: {
      tabela: '',
      coluna: null,
      direcao: 'asc'
  },
};

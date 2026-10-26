import type { Translation } from './en';

export const ptBR = {
  routes: {
    login: 'Entrar',
    signup: 'Criar conta',
    boards: 'Meus quadros',
    board: 'Quadro',
    card: 'Cartão',
    labels: 'Etiquetas',
    settings: 'Configurações',
  },
  nav: {
    settings: 'Configurações',
  },
  notFound: {
    title: 'Página não encontrada',
    goToBoards: 'Ir para Meus quadros',
  },
  session: {
    expired: 'Sua sessão expirou. Entre novamente.',
  },
  auth: {
    logIn: {
      title: 'Bom te ver de novo',
      subtitle: 'Entre para continuar.',
      submit: 'Entrar',
      submitting: 'Entrando…',
      noAccount: 'Ainda não tem conta?',
      createAccountLink: 'Criar conta',
    },
    signUp: {
      title: 'Crie sua conta',
      subtitle: 'Organize seus quadros em um só lugar.',
      submit: 'Criar conta',
      submitting: 'Criando…',
      haveAccount: 'Já tem conta?',
      haveAccountLink: 'Já tenho conta',
    },
    fields: {
      name: 'Nome',
      email: 'E-mail',
      password: 'Senha',
      passwordHint: 'Use de 8 a 72 caracteres',
      confirmPassword: 'Confirmar senha',
    },
    errors: {
      nameRequired: 'Informe seu nome',
      nameTooLong: 'Use até 100 caracteres',
      emailInvalid: 'Informe um e-mail válido',
      emailTaken: 'Este e-mail já está cadastrado',
      passwordLength: 'Use de 8 a 72 caracteres',
      passwordMismatch: 'As senhas não coincidem',
      invalidCredentials: 'E-mail ou senha inválidos',
      rateLimited: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
    },
    accountCreated: 'Conta criada',
  },
  settings: {
    session: {
      title: 'Sessão',
      connectedAs: 'Conectado como {{name}} · {{email}}',
      signOut: 'Sair',
    },
  },
  errors: {
    network: 'Não foi possível falar com o servidor. Verifique sua conexão.',
    loadTitle: 'Não foi possível carregar',
    loadDetail: 'Verifique sua conexão e tente de novo.',
    retry: 'Tentar novamente',
  },
  boards: {
    card: {
      createdOn: 'Criado em {{date}}',
      archivedOn: 'Arquivado em {{date}}',
      menu: 'Ações do quadro',
      pending: 'Salvando…',
    },
    actions: {
      edit: 'Editar',
      archive: 'Arquivar',
      restore: 'Restaurar',
      deleteForever: 'Excluir definitivamente',
    },
  },
  toast: {
    close: 'Fechar',
  },
  dates: {
    short: '{{day}} {{month}}, {{year}}',
    months: {
      jan: 'jan',
      feb: 'fev',
      mar: 'mar',
      apr: 'abr',
      may: 'mai',
      jun: 'jun',
      jul: 'jul',
      aug: 'ago',
      sep: 'set',
      oct: 'out',
      nov: 'nov',
      dec: 'dez',
    },
  },
} as const satisfies Translation;

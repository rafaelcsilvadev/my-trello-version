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
    fields: {
      email: 'E-mail',
      password: 'Senha',
    },
    errors: {
      invalidCredentials: 'E-mail ou senha inválidos',
      rateLimited: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
    },
  },
  errors: {
    network: 'Não foi possível falar com o servidor. Verifique sua conexão.',
    loadTitle: 'Não foi possível carregar',
    loadDetail: 'Verifique sua conexão e tente de novo.',
    retry: 'Tentar novamente',
  },
  toast: {
    close: 'Fechar',
  },
} as const satisfies Translation;

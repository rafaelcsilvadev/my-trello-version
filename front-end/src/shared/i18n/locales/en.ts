export const en = {
  routes: {
    login: 'Sign in',
    signup: 'Create account',
    boards: 'My boards',
    board: 'Board',
    card: 'Card',
    labels: 'Labels',
    settings: 'Settings',
  },
  nav: {
    settings: 'Settings',
  },
  notFound: {
    title: 'Page not found',
    goToBoards: 'Go to My boards',
  },
  session: {
    expired: 'Your session expired. Log in again.',
  },
  auth: {
    logIn: {
      title: 'Good to see you again',
      subtitle: 'Sign in to continue.',
      submit: 'Sign in',
      submitting: 'Signing in…',
      noAccount: 'Don’t have an account?',
      createAccountLink: 'Create account',
    },
    signUp: {
      title: 'Create your account',
      subtitle: 'Keep all your boards in one place.',
      submit: 'Create account',
      submitting: 'Creating…',
      haveAccount: 'Already have an account?',
      haveAccountLink: 'Sign in',
    },
    fields: {
      name: 'Name',
      email: 'Email',
      password: 'Password',
      passwordHint: 'Use 8 to 72 characters',
      confirmPassword: 'Confirm password',
    },
    errors: {
      nameRequired: 'Enter your name',
      nameTooLong: 'Use up to 100 characters',
      emailInvalid: 'Enter a valid email',
      emailTaken: 'This email is already registered',
      passwordLength: 'Use 8 to 72 characters',
      passwordMismatch: "Passwords don't match",
      invalidCredentials: 'Invalid email or password',
      rateLimited: 'Too many attempts. Wait a minute and try again.',
    },
    accountCreated: 'Account created',
  },
  settings: {
    session: {
      title: 'Session',
      connectedAs: 'Signed in as {{name}} · {{email}}',
      signOut: 'Sign out',
    },
  },
  errors: {
    network: 'Couldn’t reach the server. Check your connection.',
    loadTitle: 'Couldn’t load',
    loadDetail: 'Check your connection and try again.',
    retry: 'Try again',
    saveFail: 'Couldn’t save. Try again.',
    conflict: 'This item was archived. Reload to see the current state.',
    reload: 'Reload',
  },
  boards: {
    create: 'Create board',
    tabs: {
      active: 'Active',
      archived: 'Archived',
    },
    empty: {
      activeTitle: 'Create your first board',
      activeDetail:
        'A board holds the columns and tasks for a project or an area of your life.',
      archived: 'No archived boards',
    },
    card: {
      createdOn: 'Created {{date}}',
      archivedOn: 'Archived {{date}}',
      menu: 'Board actions',
      pending: 'Saving…',
    },
    actions: {
      edit: 'Edit',
      archive: 'Archive',
      restore: 'Restore',
      deleteForever: 'Delete permanently',
    },
    form: {
      newTitle: 'New board',
      editTitle: 'Edit board',
      name: 'Name',
      namePlaceholder: 'e.g. Vacation trip',
      description: 'Description',
      optional: '(optional)',
      descriptionPlaceholder: 'What is this board for?',
      counter: '{{length}} / 1000',
      cancel: 'Cancel',
      create: 'Create',
      creating: 'Creating…',
      save: 'Save',
    },
    delete: {
      title: 'Delete the board {{name}} permanently?',
      text: 'This deletes the board with all its columns, tasks and labels. It can’t be undone.',
      typeToConfirm: 'Type the board name to confirm',
      cancel: 'Cancel',
      confirm: 'Delete permanently',
    },
    errors: {
      nameRequired: 'Give the board a name',
      nameTooLong: 'Use up to 100 characters',
      descriptionTooLong: 'Use up to 1000 characters',
    },
    toast: {
      created: 'Board created',
      saved: 'Board saved',
      archived: 'Board archived',
      restored: 'Board restored',
      deleted: 'Board permanently deleted',
    },
  },
  board: {
    toast: {
      columnCreated: 'Column created',
      columnRenamed: 'Column renamed',
      columnArchived: 'Column archived',
      cardCreated: 'Task created',
    },
  },
  toast: {
    close: 'Close',
  },
  dates: {
    short: '{{month}} {{day}}, {{year}}',
    dayMonth: '{{month}} {{day}}',
    dayMonthYear: '{{month}} {{day}}, {{year}}',
    months: {
      jan: 'Jan',
      feb: 'Feb',
      mar: 'Mar',
      apr: 'Apr',
      may: 'May',
      jun: 'Jun',
      jul: 'Jul',
      aug: 'Aug',
      sep: 'Sep',
      oct: 'Oct',
      nov: 'Nov',
      dec: 'Dec',
    },
  },
} as const;

type DeepStringRecord<T> = {
  readonly [K in keyof T]: T[K] extends string
    ? string
    : DeepStringRecord<T[K]>;
};

// Same keys as `en`, any string values: a missing key in another locale fails tsc.
export type Translation = DeepStringRecord<typeof en>;

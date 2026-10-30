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
    breadcrumb: 'Breadcrumb',
    header: {
      menu: 'Board actions',
      labels: 'Board labels',
      back: 'Back',
    },
    notFound: {
      title: 'Board not found',
      detail: 'It may have been deleted.',
      back: 'Back to My boards',
    },
    archivedBanner: {
      text: 'Board archived · read-only',
      restore: 'Restore',
    },
    toolbar: {
      search: 'Search this board…',
      clearSearch: 'Clear search',
      labels: 'Labels',
      labelsCount: 'Labels · {{count}}',
      due: 'Due date',
      dueAny: 'Any due date',
      dueOverdue: 'Overdue',
      dueToday: 'Due today',
      dueNone: 'No due date',
      dueDone: 'Completed',
      noLabels: 'No labels yet',
      oneCard: '1 task',
      cards: '{{count}} tasks',
      clearFilters: 'Clear filters',
      dragOff: 'Dragging is off while filters are applied',
      noResults: 'No tasks found',
      showArchived: 'Show archived',
    },
    move: {
      cardBanner:
        'Moving “{{title}}”: {{col}}, position {{i}} of {{n}}. Arrows move, Space drops, Esc cancels.',
      cardAnnounce: 'Task {{title}}, column {{col}}, position {{i}} of {{n}}',
      cardDropped: 'Task {{title}} dropped in {{col}}, position {{i}} of {{n}}',
      columnBanner:
        'Moving the column “{{name}}”: position {{i}} of {{n}}. ← → move, Space drops, Esc cancels.',
      columnHandle: 'Column {{name}}. Space to move',
      columnAnnounce: 'Column {{name}}, position {{i}} of {{n}}',
      columnDropped: 'Column {{name}} dropped at position {{i}} of {{n}}',
      cancelled: 'Move cancelled',
      keyboardHelp:
        'Keyboard: Space picks up the focused card, column or item · arrows move · Space drops · Esc cancels',
    },
    moveTo: {
      title: 'Move to…',
      current: 'Current',
      close: 'Close',
    },
    pager: {
      goTo: 'Go to {{title}}',
      position: '{{title}} · {{i}} of {{n}}',
    },
    field: {
      cancel: 'Cancel',
      columnName: 'Column name',
    },
    fieldErrors: {
      columnNameRequired: 'Give the column a name',
      columnNameTooLong: 'Use up to 100 characters',
      cardTitleRequired: 'Give the task a title',
      cardTitleTooLong: 'Use up to 100 characters',
    },
    cardDetail: {
      close: 'Close',
      done: 'Completed',
      doneBadge: 'Completed',
      overdue: 'Overdue',
      title: 'Title',
      due: 'Due date',
      removeDue: 'Remove due date',
      notFound: {
        title: 'This task no longer exists',
        detail: 'It may have been deleted on another device.',
      },
    },
    toast: {
      columnCreated: 'Column created',
      columnRenamed: 'Column renamed',
      columnArchived: 'Column archived',
      columnRestored: 'Column restored',
      columnDeleted: 'Column permanently deleted',
      boardRestored: 'Board restored',
      cardCreated: 'Task created',
      cardMoved: 'Task moved to {{col}}',
      moveFailed: 'Couldn’t move the task',
      cardArchived: 'Task archived',
      cardRestored: 'Task restored',
      cardDeleted: 'Task permanently deleted',
    },
    errors: {
      columnArchived:
        'The original column is archived. Restore the column first.',
    },
    column: {
      menu: 'Column actions',
      rename: 'Rename',
      archive: 'Archive',
      dropHere: 'Drag cards here',
      empty: 'No tasks',
      addCard: 'Add task',
      add: 'Add',
      cardTitle: 'Task title',
    },
    addColumn: {
      label: 'Add column',
      emptyTitle: 'Add the first column',
      emptyText:
        'Columns are the stages of your workflow, like To do, Doing and Done.',
    },
    archivedCards: {
      title: 'Archived',
      empty: 'No archived tasks',
    },
    archivedColumns: {
      title: 'Archived columns',
      empty: 'No archived columns',
      archivedOn: 'Archived {{date}}',
      oneCard: '1 task',
      cards: '{{count}} tasks',
      restore: 'Restore',
      deleteForever: 'Delete permanently',
    },
    deleteColumn: {
      title: 'Delete the column {{name}} permanently?',
      textNoCards:
        'This deletes the column, which has no tasks. It can’t be undone.',
      textOneCard:
        'This deletes the column and its 1 task. It can’t be undone.',
      textCards:
        'This deletes the column and its {{count}} tasks, active and archived. It can’t be undone.',
      cancel: 'Cancel',
      confirm: 'Delete permanently',
    },
    card: {
      done: 'Completed',
      overdue: 'Overdue',
      pending: 'Saving…',
      archived: 'Archived {{date}} · from: {{column}}',
      due: {
        today: 'Today',
        tomorrow: 'Tomorrow',
        yesterday: 'Yesterday',
      },
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

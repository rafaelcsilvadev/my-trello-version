export const boardKeys = {
  all: ['boards'] as const,
  list: (archived: boolean) => ['boards', 'list', { archived }] as const,
};

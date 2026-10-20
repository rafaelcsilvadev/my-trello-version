// The label palette: the single source for the request validation, the entity
// type and the CHK_labels_color database check.
export const LABEL_COLORS = [
  'green',
  'yellow',
  'orange',
  'red',
  'purple',
  'blue',
  'sky',
  'lime',
  'pink',
  'black',
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

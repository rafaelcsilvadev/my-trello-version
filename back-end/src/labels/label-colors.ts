// The label palette, used by the request validation and the entity type.
// CHK_labels_color holds a copy written into the migration; the labels table
// integration test fails if the two drift apart.
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

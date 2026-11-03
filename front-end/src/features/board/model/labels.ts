import type { ApiError } from '@/shared/api/api-error';

import { normalizeText } from './filters';
import type { ItemFieldError, Label } from './types';
import { validateTitle } from './validation';

type LabelColor = Label['color'];

// Doc §8 order; the create form lists the swatches in this order (FCLB-12).
export const LABEL_COLORS: readonly LabelColor[] = [
  'purple',
  'blue',
  'sky',
  'green',
  'lime',
  'yellow',
  'orange',
  'red',
  'pink',
  'black',
];

export const DEFAULT_LABEL_COLOR: LabelColor = 'blue';

const LABEL_NAME_MAX_LENGTH = 50;

const LABEL_NAME_TAKEN_TYPE = '/problems/label-name-taken';

// Same normalization as the board search (FCLB-09); order is kept.
export function searchLabels(labels: Label[], query: string): Label[] {
  const needle = normalizeText(query.trim());
  if (needle === '') return labels;
  return labels.filter((label) => normalizeText(label.name).includes(needle));
}

// Card chips follow board label order; ids no longer on the board keep their order at the end.
export function withLabelId(
  labelIds: string[],
  id: string,
  labels: Label[],
): string[] {
  const ids = labelIds.includes(id) ? labelIds : [...labelIds, id];
  const position = new Map(labels.map((label, index) => [label.id, index]));
  const rank = (labelId: string) => position.get(labelId) ?? labels.length;
  return [...ids].sort((a, b) => rank(a) - rank(b));
}

export function withoutLabelId(labelIds: string[], id: string): string[] {
  return labelIds.filter((labelId) => labelId !== id);
}

export function isLabelNameTaken(err: ApiError): boolean {
  return err.status === 409 && err.type.endsWith(LABEL_NAME_TAKEN_TYPE);
}

// Taken ignores case only, like the API's unique index on lower(name) (FCLB-15).
export function validateLabelName(
  raw: string,
  labels: Label[],
): ItemFieldError | null {
  const error = validateTitle(
    raw,
    'labelNameRequired',
    'labelNameTooLong',
    LABEL_NAME_MAX_LENGTH,
  );
  if (error) return error;
  const name = raw.trim().toLowerCase();
  const taken = labels.some((label) => label.name.toLowerCase() === name);
  return taken ? 'labelNameTaken' : null;
}

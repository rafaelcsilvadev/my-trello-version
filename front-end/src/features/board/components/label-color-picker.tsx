import { Radio, RadioGroup } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { LABEL_COLORS } from '../model/labels';
import type { Label } from '../model/types';
import { LABEL_CLASSES } from './label-chip';

type LabelColorPickerProps = {
  value: Label['color'];
  onChange: (color: Label['color']) => void;
  ariaLabel: string;
};

// The 10-color radio group shared by the label forms (FLP-10, FLP-11).
export function LabelColorPicker({
  value,
  onChange,
  ariaLabel,
}: LabelColorPickerProps) {
  const { t } = useTranslation();

  return (
    <RadioGroup
      value={value}
      onChange={(next) => onChange(next as Label['color'])}
      orientation="horizontal"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-1.5"
    >
      {LABEL_COLORS.map((color) => (
        <Radio
          key={color}
          value={color}
          aria-label={t(`board.labelColors.${color}`)}
          className="cursor-pointer rounded-xs p-0.5 outline-none data-focus-visible:shadow-focus data-selected:ring-2 data-selected:ring-brand"
        >
          <span
            className={`block size-5 rounded-xs ${LABEL_CLASSES[color].dot}`}
          />
        </Radio>
      ))}
    </RadioGroup>
  );
}

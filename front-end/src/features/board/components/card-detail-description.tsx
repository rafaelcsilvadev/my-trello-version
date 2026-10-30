import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { TextAreaField } from '@/shared/ui/text-area-field';

type CardDetailDescriptionProps = {
  description: string | null;
  // `null` shows the saved description.
  draft: string | null;
  error: 'cardDescriptionTooLong' | null;
  isDisabled: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

// Port of the prototype card detail description (design/Task List.dc.html:688-697).
export function CardDetailDescription({
  description,
  draft,
  error,
  isDisabled,
  onChange,
  onSave,
  onCancel,
}: CardDetailDescriptionProps) {
  const { t } = useTranslation();
  const saved = description ?? '';
  const value = draft ?? saved;
  const isDirty = value !== saved;

  return (
    <div className="flex flex-col gap-2">
      <TextAreaField
        label={t('board.cardDetail.description')}
        value={value}
        onChange={onChange}
        placeholder={t('board.cardDetail.descriptionPlaceholder')}
        counter={t('board.cardDetail.counter', { n: value.length })}
        error={error === null ? undefined : t(`board.fieldErrors.${error}`)}
        isDisabled={isDisabled}
      />
      {isDirty ? (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onPress={onCancel}>
            {t('board.cardDetail.cancel')}
          </Button>
          <Button size="sm" onPress={onSave} isDisabled={error !== null}>
            {t('board.cardDetail.save')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

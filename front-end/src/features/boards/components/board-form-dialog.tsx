import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { TextAreaField } from '@/shared/ui/text-area-field';
import { TextField } from '@/shared/ui/text-field';

import type {
  BoardField,
  BoardFieldErrors,
  BoardFormValues,
} from '../model/types';
import { validateBoardForm } from '../model/validation';

const EMPTY_VALUES: BoardFormValues = { name: '', description: '' };

type BoardFormDialogProps = {
  mode: 'create' | 'edit';
  isOpen: boolean;
  initialValues?: BoardFormValues;
  serverErrors?: BoardFieldErrors;
  isPending: boolean;
  onSubmit: (values: BoardFormValues) => void;
  onClose: () => void;
};

// Port of the prototype board dialog (design/Task List.dc.html:743-753).
export function BoardFormDialog({
  mode,
  isOpen,
  onClose,
  ...formProps
}: BoardFormDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={t(
        mode === 'create' ? 'boards.form.newTitle' : 'boards.form.editTitle',
      )}
    >
      <BoardForm mode={mode} onClose={onClose} {...formProps} />
    </Dialog>
  );
}

type BoardFormProps = Omit<BoardFormDialogProps, 'isOpen'>;

// Mounted only while the dialog is open, so each opening starts from `initialValues`.
function BoardForm({
  mode,
  initialValues = EMPTY_VALUES,
  serverErrors,
  isPending,
  onSubmit,
  onClose,
}: BoardFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValues.name);
  const [description, setDescription] = useState(initialValues.description);
  const [fieldErrors, setFieldErrors] = useState<BoardFieldErrors>({});
  const errors = { ...serverErrors, ...fieldErrors };

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }
    const values = { name, description };
    const validation = validateBoardForm(values);
    setFieldErrors(validation);
    if (Object.keys(validation).length === 0) {
      onSubmit(values);
    }
  }

  function errorFor(field: BoardField) {
    const error = errors[field];
    return error && t(`boards.errors.${error}`);
  }

  function submitLabel() {
    if (mode === 'edit') {
      return t('boards.form.save');
    }
    return isPending ? t('boards.form.creating') : t('boards.form.create');
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField
        label={t('boards.form.name')}
        placeholder={t('boards.form.namePlaceholder')}
        value={name}
        onChange={setName}
        error={errorFor('name')}
      />
      <TextAreaField
        label={`${t('boards.form.description')} ${t('boards.form.optional')}`}
        placeholder={t('boards.form.descriptionPlaceholder')}
        value={description}
        onChange={setDescription}
        counter={t('boards.form.counter', { length: description.length })}
        error={errorFor('description')}
      />
      <div className="mt-1 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onPress={onClose}>
          {t('boards.form.cancel')}
        </Button>
        <Button type="submit" isDisabled={isPending}>
          {submitLabel()}
        </Button>
      </div>
    </form>
  );
}

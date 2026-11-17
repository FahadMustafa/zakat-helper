import type { ReactNode } from 'react';
import { useT } from '../i18n/locale';
import { Modal } from './Modal';

export function Confirm({
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  return (
    <Modal title={title} onCancel={onCancel}>
      {children}
      <div className="actions">
        <button className="btn" type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button className="btn quiet" type="button" onClick={onCancel}>
          {t.common.cancel}
        </button>
      </div>
    </Modal>
  );
}

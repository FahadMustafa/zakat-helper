import { useEffect, useRef, type ReactNode } from 'react';

/** Native <dialog> shown modally: focus is trapped and Escape calls onCancel. */
export function Modal({
  title,
  onCancel,
  children,
}: {
  title: string;
  onCancel: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <h2 id="modal-title">{title}</h2>
      {children}
    </dialog>
  );
}

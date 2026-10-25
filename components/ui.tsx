'use client';
import {
  useEffect,
  useRef,
  useId,
  useState,
  Children,
  isValidElement,
  cloneElement,
  type ReactNode,
  type ReactElement,
} from 'react';
import { X, ArrowUpRight, Loader2 } from 'lucide-react';
import { useUI, report } from '@/lib/store';
export function Button({
  children,
  secondary = false,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }) {
  return (
    <button className={`${secondary ? 'button-secondary' : 'button'} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      title={label}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const headingId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLElement>('input:not([type=hidden]),select,textarea')?.focus();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      className={`modal ${wide ? 'wide' : ''}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <header className="modal-header">
        <h2 id={headingId}>{title}</h2>
        <IconButton label="Close dialog" onClick={onClose}>
          <X size={19} />
        </IconButton>
      </header>
      {children}
    </dialog>
  );
}
export function Empty({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      {icon && <span className="empty-icon">{icon}</span>}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
export function TextLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={15} />
    </button>
  );
}
export function Toast() {
  const toast = useUI((s) => s.toast);
  return (
    <div className={`toast ${toast ? 'visible' : ''}`} role="status">
      {toast}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading">
      <Loader2 className="spin" size={24} />
      <span>Opening your workspace…</span>
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const generatedId = useId();
  const controls = Children.toArray(children);
  const control = controls.find(
    (child) =>
      isValidElement(child) &&
      typeof child.type === 'string' &&
      ['input', 'select', 'textarea'].includes(child.type),
  ) as
    | ReactElement<{ id?: string; 'aria-labelledby'?: string; 'aria-describedby'?: string }>
    | undefined;
  const controlId = control?.props.id || generatedId;
  const labelId = `${generatedId}-label`;
  return (
    <div className="field">
      {control ? (
        <label id={labelId} htmlFor={controlId}>
          {label}
        </label>
      ) : (
        <span id={labelId}>{label}</span>
      )}
      {controls.map((child) =>
        child === control
          ? cloneElement(control, {
              id: controlId,
              'aria-labelledby': labelId,
              'aria-describedby': hint ? `${generatedId}-hint` : undefined,
            })
          : child,
      )}
      {hint && <small id={`${generatedId}-hint`}>{hint}</small>}
    </div>
  );
}
export function Confirm({
  title,
  description,
  onConfirm,
  onClose,
  action = 'Delete permanently',
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  action?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <p className="muted modal-description">{description}</p>
      <div className="form-actions">
        <Button secondary onClick={onClose}>
          Cancel
        </Button>
        <Button
          className="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } catch (error) {
              report(error);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Deleting…' : action}
        </Button>
      </div>
    </Modal>
  );
}

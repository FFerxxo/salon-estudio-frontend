import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && !el.closest('[hidden], [aria-hidden="true"]')
  );
}

export interface AppDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  role?: 'dialog' | 'alertdialog';
  descriptionId?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  disableClose?: boolean;
  maxWidthClass?: string;
}

/** Ventana modal reutilizable con trampa de foco, cierre con Escape y retorno de foco al disparador. */
export function AppDialog({
  open,
  title,
  onClose,
  children,
  role = 'dialog',
  descriptionId,
  initialFocusRef,
  disableClose = false,
  maxWidthClass = 'max-w-md',
}: AppDialogProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open) {
      if (!wasOpenRef.current) {
        openerRef.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        wasOpenRef.current = true;
        const target =
          initialFocusRef?.current ?? getFocusableElements(panelRef.current)[0] ?? panelRef.current;
        target?.focus();
      }
      return;
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      const opener = openerRef.current;
      openerRef.current = null;
      if (opener && opener.isConnected) {
        opener.focus();
      }
    }
  }, [open, initialFocusRef]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!disableClose) {
          onClose();
        }
        return;
      }

      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusables = getFocusableElements(panel);
      if (focusables.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, disableClose, onClose]);

  if (!open) {
    return null;
  }

  const dialogOverlay = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/75"
      onClick={(event) => {
        if (event.target === event.currentTarget && !disableClose) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={`relative w-full ${maxWidthClass} rounded-[20px] p-6 shadow-2xl focus:outline-none ${
          isDark
            ? 'bg-[#0f172a] text-[#f8fafc] border border-[#64748b]'
            : 'bg-white text-[#0f172a] border border-[#64748b]'
        }`}
      >
        <div className="relative flex items-center justify-center min-h-[44px] mb-4">
          <h2 id={titleId} className="text-xl font-bold tracking-tight text-balance text-center px-11">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={disableClose}
            aria-label="Cerrar ventana"
            className={`absolute right-0 top-1/2 -translate-y-1/2 size-11 inline-flex items-center justify-center rounded-xl active:scale-[0.96] transition-[transform,background-color] disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? 'text-[#cbd5e1] hover:bg-white/10 hover:text-[#f8fafc]'
                : 'text-[#334155] hover:bg-slate-100 hover:text-[#0f172a]'
            }`}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(dialogOverlay, document.body) : dialogOverlay;
}

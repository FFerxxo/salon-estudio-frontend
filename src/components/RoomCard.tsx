import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { type ThemeMode } from '../context/ThemeContext';
import { type Room } from '../services/roomsApi';
import { copyText } from '../utils/roomHelpers';
import {
  getErrorAlertClasses,
  getPrimaryCtaClasses,
  getSecondaryBtnClasses,
  getSuccessAlertClasses,
} from '../utils/themeStyles';
import { AmbienteChip } from './AmbienteChip';

export interface RoomCardProps {
  room: Room;
  theme: ThemeMode;
  onRename: (room: Room) => void;
  onDelete: (room: Room) => void;
}

/** Tarjeta de sala propia con chip de ambiente, código ID, menú de opciones y acciones rápidas. */
export function RoomCard({ room, theme, onRename, onDelete }: RoomCardProps) {
  const isDark = theme === 'dark';
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuEntered, setMenuEntered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const menuWrapRef = useRef<HTMLDivElement | null>(null);
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      setMenuEntered(false);
      return;
    }

    const frame = requestAnimationFrame(() => {
      setMenuEntered(true);
    });

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !menuWrapRef.current?.contains(target)) {
        setMenuOpen(false);
        const isInteractiveTarget =
          target instanceof Element &&
          Boolean(target.closest('button, a, input, select, textarea, [tabindex]'));
        if (!isInteractiveTarget) {
          moreBtnRef.current?.focus();
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        moreBtnRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleCopyId = async () => {
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }

    const ok = await copyText(room.id);
    if (!ok) {
      setCopied(false);
      setCopyError(`No pudimos copiar el ID. Cópialo a mano: ${room.id}`);
      return;
    }

    setCopyError(null);
    setCopied(true);
    copyTimerRef.current = window.setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  const handleMenuRename = () => {
    setMenuOpen(false);
    moreBtnRef.current?.focus();
    onRename(room);
  };

  const handleMenuDelete = () => {
    setMenuOpen(false);
    moreBtnRef.current?.focus();
    onDelete(room);
  };

  return (
    <article
      className={`w-full rounded-[20px] p-2.5 flex flex-col justify-between gap-2.5 border ${
        isDark
          ? 'bg-[#1f2e4a]/80 border-slate-400/25 shadow-[0_10px_24px_rgba(2,6,23,0.32)]'
          : 'bg-[#eef6fb] border-[#075985]/15 shadow-[0_6px_18px_rgba(15,23,42,0.08)]'
      }`}
    >
      <div
        className={`rounded-[10px] p-4 flex-1 flex flex-col justify-between gap-3 ${
          isDark ? 'bg-[#0f172a]' : 'bg-white'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-bold leading-snug text-balance break-words min-w-0 pt-1">
            {room.nombre}
          </h2>

          <div ref={menuWrapRef} className="relative inline-flex items-center gap-1.5 shrink-0">
            <AmbienteChip
              ambiente={room.ambiente}
              theme={theme}
              className="shrink-0 whitespace-nowrap"
            />
            <button
              ref={moreBtnRef}
              type="button"
              aria-label={`Opciones de ${room.nombre}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((prev) => !prev)}
              className={`size-11 -mr-1.5 -my-1.5 rounded-[10px] inline-flex items-center justify-center active:scale-[0.96] transition-[transform,background-color,color] duration-150 ${
                menuOpen
                  ? isDark
                    ? 'bg-white/15 text-[#f8fafc]'
                    : 'bg-slate-200/80 text-[#0f172a]'
                  : isDark
                    ? 'text-[#cbd5e1] hover:bg-white/10 hover:text-[#f8fafc]'
                    : 'text-[#334155] hover:bg-slate-100 hover:text-[#0f172a]'
              }`}
            >
              <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-label={`Acciones de ${room.nombre}`}
                className={`absolute top-[calc(100%+6px)] right-0 min-w-[180px] p-1.5 rounded-[14px] border z-20 flex flex-col gap-0.5 origin-top-right transition-[transform,opacity] duration-150 ease-out motion-reduce:transition-none ${
                  menuEntered
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-95 -translate-y-1 motion-reduce:opacity-100 motion-reduce:scale-100 motion-reduce:translate-y-0'
                } ${
                  isDark
                    ? 'bg-[#0f172a] border-[#64748b] shadow-[0_16px_36px_rgba(2,6,23,0.5)]'
                    : 'bg-white border-[#64748b] shadow-[0_16px_36px_rgba(15,23,42,0.16)]'
                }`}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleMenuRename}
                  className={`min-h-[40px] px-3 py-2 rounded-[10px] text-[13px] font-medium flex items-center gap-2 text-left transition-colors duration-150 ${
                    isDark
                      ? 'text-[#f8fafc] hover:bg-white/10'
                      : 'text-[#0f172a] hover:bg-slate-100'
                  }`}
                >
                  <Pencil className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Renombrar sala</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleMenuDelete}
                  className={`min-h-[40px] px-3 py-2 rounded-[10px] text-[13px] font-semibold flex items-center gap-2 text-left transition-colors duration-150 ${
                    isDark
                      ? 'text-[#fca5a5] hover:bg-[#450a0a]/70'
                      : 'text-[#b91c1c] hover:bg-[#fef2f2]'
                  }`}
                >
                  <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Eliminar sala</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          className={`flex items-center gap-1.5 text-xs ${
            isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
          }`}
        >
          <span>ID:</span>
          <code className="font-mono font-semibold tabular-nums break-all">{room.id}</code>
        </div>
      </div>

      {copied && !copyError && (
        <div
          role="status"
          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold inline-flex items-center justify-center gap-1.5 ${getSuccessAlertClasses(
            theme
          )}`}
        >
          <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>ID copiado</span>
        </div>
      )}

      {copyError && (
        <div
          role="alert"
          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold inline-flex items-start gap-1.5 ${getErrorAlertClasses(
            theme
          )}`}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="text-pretty break-all">{copyError}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void handleCopyId()}
          aria-label={`Copiar ID de ${room.nombre}`}
          className={`${getSecondaryBtnClasses(theme)} !px-3 ${
            isDark ? '!bg-[#0f172a] !border-[#94a3b8]' : '!bg-white'
          }`}
        >
          <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Copiar ID</span>
        </button>

        <Link
          to={`/salas/${room.id}`}
          state={{ room }}
          aria-label={`Entrar a ${room.nombre}`}
          className={`${getPrimaryCtaClasses(
            theme
          )} !w-full !min-h-[44px] !py-2 text-sm`}
        >
          Entrar
        </Link>
      </div>
    </article>
  );
}

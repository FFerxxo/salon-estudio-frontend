import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { type ThemeMode } from '../context/ThemeContext';
import { type Room } from '../services/roomsApi';
import { copyText } from '../utils/roomHelpers';
import {
  getErrorAlertClasses,
  getPrimaryCtaClasses,
  getSuccessAlertClasses,
} from '../utils/themeStyles';
import { SceneBanner, getSceneCardShellClasses, getSceneInnerClasses } from './SceneBanner';

export interface RoomCardProps {
  room: Room;
  theme: ThemeMode;
  onRename: (room: Room) => void;
  onDelete: (room: Room) => void;
}

/** Tarjeta de sala propia con paisaje difuminado, código ID, menú de opciones y acciones rápidas. */
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
    <article className={getSceneCardShellClasses(isDark)}>
      <div className={getSceneInnerClasses(isDark)}>
        <SceneBanner ambiente={room.ambiente} isDark={isDark} />

        <div ref={menuWrapRef} className="absolute top-1.5 right-1.5 z-20">
          <button
            ref={moreBtnRef}
            type="button"
            aria-label={`Opciones de ${room.nombre}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
            className={`relative size-8 rounded-[8px] inline-flex items-center justify-center text-white backdrop-blur-sm before:absolute before:-inset-1.5 before:content-[''] active:scale-[0.96] transition-[transform,background-color] duration-150 ${
              menuOpen ? 'bg-[#0f172a]/70' : 'bg-[#0f172a]/40 hover:bg-[#0f172a]/60'
            }`}
          >
            <MoreHorizontal className="w-[18px] h-[18px]" aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              aria-label={`Acciones de ${room.nombre}`}
              className={`absolute top-[calc(100%+6px)] right-0 min-w-[180px] p-1.5 rounded-[14px] border z-30 flex flex-col gap-0.5 text-left origin-top-right transition-[transform,opacity] duration-150 ease-out motion-reduce:transition-none ${
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
                  isDark ? 'text-[#f8fafc] hover:bg-white/10' : 'text-[#0f172a] hover:bg-slate-100'
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
                  isDark ? 'text-[#fca5a5] hover:bg-[#450a0a]/70' : 'text-[#b91c1c] hover:bg-[#fef2f2]'
                }`}
              >
                <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Eliminar sala</span>
              </button>
            </div>
          )}
        </div>

        <h2 className="room-card-title-glow relative z-10 text-[15px] font-bold leading-snug text-balance break-words max-w-full">
          {room.nombre}
        </h2>

        <div
          className={`relative z-10 flex items-center justify-center gap-1.5 text-[11px] whitespace-nowrap ${
            isDark ? 'text-[#cbd5e1]' : 'text-[#334155]'
          }`}
        >
          <span>ID:</span>
          <code className={`font-mono font-semibold tabular-nums whitespace-nowrap ${isDark ? 'text-[#f8fafc]' : 'text-[#0f172a]'}`}>
            {room.id}
          </code>
          <button
            type="button"
            onClick={() => void handleCopyId()}
            aria-label={`Copiar ID de ${room.nombre}`}
            className={`relative shrink-0 whitespace-nowrap h-[26px] px-2 rounded-[7px] border inline-flex items-center gap-1 text-[11px] font-semibold before:absolute before:-inset-[9px] before:content-[''] active:scale-[0.96] transition-[transform,background-color] duration-150 ${
              isDark
                ? 'border-slate-400/35 bg-slate-400/10 text-[#f8fafc] hover:bg-slate-400/20'
                : 'border-[#cbd5e1] bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0]'
            }`}
          >
            <Copy className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>Copiar ID</span>
          </button>
        </div>
      </div>

      {copied && !copyError && (
        <div
          role="status"
          className={`rounded-lg px-2 py-1 text-xs font-bold inline-flex items-center justify-center gap-1.5 ${getSuccessAlertClasses(
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
          className={`rounded-lg px-2 py-1 text-xs font-bold inline-flex items-start gap-1.5 ${getErrorAlertClasses(
            theme
          )}`}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="text-pretty break-all">{copyError}</span>
        </div>
      )}

      <Link
        to={`/salas/${room.id}`}
        state={{ room }}
        aria-label={`Entrar a ${room.nombre}`}
        className={`${getPrimaryCtaClasses(theme)} !w-full !min-h-[44px] sm:!min-h-[38px] !py-1.5 !rounded-[10px] text-sm`}
      >
        Entrar
      </Link>
    </article>
  );
}

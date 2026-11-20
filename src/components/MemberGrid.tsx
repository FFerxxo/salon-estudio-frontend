import { User } from 'lucide-react';
import { type StudentProfile } from '../services/authApi';
import { resolveAvatarEmoji } from './AvatarPicker';

export interface MemberGridProps {
  currentUser: StudentProfile | null;
  isHost: boolean;
  visible?: boolean;
}

const EMPTY_SLOTS = [1, 2, 3] as const;

function SelfAvatar({ user }: { user: StudentProfile | null }) {
  const resolvedEmoji = resolveAvatarEmoji(user?.avatar);
  const initial = (user?.nombres || user?.username || 'E').trim().charAt(0).toUpperCase();

  if (!resolvedEmoji && user?.avatarUrl?.startsWith('https://')) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className="size-[72px] rounded-full object-cover outline outline-1 -outline-offset-1 outline-white/15 shadow-[0_8px_20px_rgba(2,6,23,0.4)]"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="size-[72px] rounded-full bg-[#0f766e] border-2 border-white/25 text-[34px] font-bold text-white inline-flex items-center justify-center shadow-[0_8px_20px_rgba(2,6,23,0.4)] select-none"
    >
      {resolvedEmoji ?? initial}
    </span>
  );
}

/** Cuadrícula 2×2 de participantes de la sala con la ficha propia y tres espacios disponibles. */
export function MemberGrid({ currentUser, isHost, visible = true }: MemberGridProps) {
  if (!visible) {
    return null;
  }

  const handle = currentUser?.username || 'estudiante';

  return (
    <div
      id="roomMemberGrid"
      aria-label="Participantes de la sala"
      className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[780px] w-full mx-auto"
    >
      <article
        aria-label="Tu cuadro en la sala"
        className="relative aspect-[16/9] rounded-2xl overflow-hidden flex flex-col items-center justify-center p-4 bg-[#0b1220]/90 border-[1.5px] border-[#7dd3fc] shadow-[0_14px_32px_rgba(2,6,23,0.45)]"
      >
        <SelfAvatar user={currentUser} />

        <div className="absolute inset-x-2.5 bottom-2.5 px-3 py-1.5 rounded-[10px] bg-[#080d18]/90 border border-white/20 flex items-center justify-between gap-2 text-[13px] text-[#f8fafc]">
          <span className="inline-flex items-center gap-2 min-w-0">
            <span className="font-mono font-semibold truncate">@{handle}</span>
            <span className="px-2 py-0.5 rounded-full bg-[#38bdf8]/20 text-[#bae6fd] ring-1 ring-[#38bdf8]/35 text-[11px] font-bold shrink-0">
              Tú
            </span>
          </span>
          {isHost && (
            <span className="text-xs font-semibold text-[#cbd5e1] shrink-0">
              Anfitrión
            </span>
          )}
        </div>
      </article>

      {EMPTY_SLOTS.map((slotNumber) => (
        <div
          key={slotNumber}
          aria-label={`Compañero ${slotNumber}`}
          className="relative aspect-[16/9] rounded-2xl overflow-hidden flex flex-col items-center justify-center p-4 bg-[#0b1220]/85 border-[1.5px] border-dashed border-[#cbd5e1] text-[#f8fafc]"
        >
          <span
            aria-hidden="true"
            className="size-11 rounded-full bg-slate-400/20 text-[#e2e8f0] inline-flex items-center justify-center mb-2.5"
          >
            <User className="w-5 h-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-[#f8fafc]">Compañero {slotNumber}</p>
          <p className="text-xs font-medium text-[#cbd5e1] mt-0.5">Espacio libre</p>
        </div>
      ))}
    </div>
  );
}

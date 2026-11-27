import { MicOff, UserPlus, VideoOff } from 'lucide-react';
import { type StudentProfile } from '../services/authApi';
import { type Participante } from '../services/realtime';
import { resolveAvatarEmoji } from './AvatarPicker';

export interface MemberGridProps {
  currentUser: StudentProfile | null;
  /** UID del anfitrión de la sala, para marcar su cuadro. */
  anfitrionUid?: string;
  /** Participantes reales que envía el servidor (`sala:participantes`). */
  participantes?: Participante[];
  visible?: boolean;
}

interface Ficha {
  clave: string;
  uid: string;
  username: string;
  avatar: string | null | undefined;
  avatarUrl: string | null | undefined;
  inicial: string;
  esYo: boolean;
  microfono: boolean;
  camara: boolean;
}

function Avatar({ ficha }: { ficha: Ficha }) {
  const emoji = resolveAvatarEmoji(ficha.avatar ?? ficha.avatarUrl ?? undefined);

  if (!emoji && ficha.avatarUrl?.startsWith('https://')) {
    return (
      <img
        src={ficha.avatarUrl}
        alt=""
        className="size-[72px] rounded-full object-cover outline outline-1 -outline-offset-1 outline-white/15 shadow-[0_8px_20px_rgba(2,6,23,0.4)]"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`size-[72px] rounded-full border-2 border-white/25 text-[34px] font-bold text-white inline-flex items-center justify-center shadow-[0_8px_20px_rgba(2,6,23,0.4)] select-none ${
        ficha.esYo ? 'bg-[#0f766e]' : 'bg-[#334155]'
      }`}
    >
      {emoji ?? ficha.inicial}
    </span>
  );
}

/** Une los participantes del servidor con el usuario actual: uno por persona y el propio primero. */
export function armarFichas(
  currentUser: StudentProfile | null,
  participantes: Participante[]
): Ficha[] {
  const miUid = currentUser?.uid ?? '';
  const propia: Ficha = {
    clave: `yo-${miUid || 'local'}`,
    uid: miUid,
    username: currentUser?.username || 'estudiante',
    avatar: currentUser?.avatar,
    avatarUrl: currentUser?.avatarUrl,
    inicial: (currentUser?.nombres || currentUser?.username || 'E').trim().charAt(0).toUpperCase(),
    esYo: true,
    microfono: false,
    camara: false,
  };

  const vistos = new Set<string>([miUid]);
  const otras: Ficha[] = [];
  for (const p of participantes) {
    if (p.uid === miUid) {
      propia.microfono = p.microfono;
      propia.camara = p.camara;
      continue;
    }
    if (vistos.has(p.uid)) continue;
    vistos.add(p.uid);
    otras.push({
      clave: p.socketId,
      uid: p.uid,
      username: p.username,
      avatar: null,
      avatarUrl: p.avatarUrl,
      inicial: (p.username || '?').charAt(0).toUpperCase(),
      esYo: false,
      microfono: p.microfono,
      camara: p.camara,
    });
  }
  return [propia, ...otras];
}

/** Cuadrícula de participantes reales de la sala (SDECG6-52). */
export function MemberGrid({
  currentUser,
  anfitrionUid,
  participantes = [],
  visible = true,
}: MemberGridProps) {
  if (!visible) {
    return null;
  }

  const fichas = armarFichas(currentUser, participantes);
  const solo = fichas.length === 1;
  const columnas =
    fichas.length >= 5 ? 'sm:grid-cols-2 lg:grid-cols-3' : solo ? '' : 'sm:grid-cols-2';

  return (
    <div id="roomMemberGrid" className="w-full max-w-[780px] mx-auto space-y-3">
      <ul
        aria-label="Participantes de la sala"
        className={`grid grid-cols-1 ${columnas} gap-3 list-none p-0 m-0 ${
          solo ? 'max-w-[420px] mx-auto' : ''
        }`}
      >
        {fichas.map((ficha) => {
          const esAnfitrion = Boolean(anfitrionUid && ficha.uid === anfitrionUid);
          return (
            <li
              key={ficha.clave}
              aria-label={ficha.esYo ? 'Tu cuadro en la sala' : `@${ficha.username}`}
              className={`relative aspect-video rounded-2xl overflow-hidden flex flex-col items-center justify-center p-4 bg-[#0b1220]/90 border-[1.5px] shadow-[0_14px_32px_rgba(2,6,23,0.45)] ${
                ficha.esYo ? 'border-[#7dd3fc]' : 'border-white/25'
              }`}
            >
              <Avatar ficha={ficha} />

              <div className="absolute inset-x-2.5 bottom-2.5 px-3 py-1.5 rounded-[10px] bg-[#080d18]/90 border border-white/20 flex items-center justify-between gap-2 text-[13px] text-[#f8fafc]">
                <span className="inline-flex items-center gap-2 min-w-0">
                  <span className="font-mono font-semibold truncate">@{ficha.username}</span>
                  {ficha.esYo && (
                    <span className="px-2 py-0.5 rounded-full bg-[#38bdf8]/20 text-[#bae6fd] ring-1 ring-[#38bdf8]/35 text-[11px] font-bold shrink-0">
                      Tú
                    </span>
                  )}
                </span>
                <span className="inline-flex items-center gap-1.5 shrink-0">
                  {esAnfitrion && (
                    <span className="text-xs font-semibold text-[#cbd5e1]">Anfitrión</span>
                  )}
                  {!ficha.microfono && (
                    <MicOff className="w-3.5 h-3.5 text-[#fca5a5]" aria-label="Micrófono apagado" role="img" />
                  )}
                  {!ficha.camara && (
                    <VideoOff className="w-3.5 h-3.5 text-[#fca5a5]" aria-label="Cámara apagada" role="img" />
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {solo && (
        <p className="text-sm font-medium text-center text-[#f8fafc] flex items-center justify-center gap-2 w-full max-w-[420px] mx-auto rounded-xl px-3 py-2 bg-[#0b1220]/80 border border-white/20">
          <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Eres el único en la sala por ahora. Comparte el ID para invitar a alguien.</span>
        </p>
      )}
    </div>
  );
}

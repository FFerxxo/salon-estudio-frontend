import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Loader2, MessageSquare, RotateCcw, Send, UserX } from 'lucide-react';
import {
  formatearHora,
  LARGO_MAXIMO_MENSAJE,
  type EstadoConexion,
  type EstadoHistorial,
} from '../hooks/useRoomRealtime';
import type { AckRespuesta, Mensaje } from '../services/realtime';

export interface RoomChatProps {
  mensajes: Mensaje[];
  miUid: string | null | undefined;
  estado: EstadoConexion;
  historial: EstadoHistorial;
  anuncio: string;
  hayMas: boolean;
  cargandoAnteriores: boolean;
  onCargarAnteriores: () => Promise<number | null>;
  onEnviar: (texto: string) => Promise<AckRespuesta<{ mensaje: Mensaje }>>;
  onReintentarHistorial: () => void;
  /** Personas conectadas en la sala, para el encabezado «Chat de la sala · N personas». */
  personas?: number;
}

/** Distancia en px desde el final para considerar que se está leyendo lo último. */
const MARGEN_FINAL = 48;

function estaAlFinal(el: HTMLElement): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= MARGEN_FINAL;
}

/** Autor de un mensaje cuya cuenta se eliminó: al tocarlo o enfocarlo explica qué pasó (SDECG6-56). */
function AutorEliminado() {
  const tooltipId = useId();
  const [abierto, setAbierto] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setAbierto((prev) => !prev)}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setAbierto(false);
        }}
        aria-describedby={abierto ? tooltipId : undefined}
        className="font-bold italic underline decoration-dotted underline-offset-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
      >
        Cuenta eliminada
      </button>
      {abierto && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 bottom-full mb-1 z-10 whitespace-nowrap font-sans not-italic rounded-md bg-[#0f172a] text-[#f8fafc] px-2 py-1 text-[11px] font-semibold shadow-lg border border-white/20"
        >
          Esta cuenta fue eliminada
        </span>
      )}
    </span>
  );
}

function AvatarMensaje({ mensaje }: { mensaje: Mensaje }) {
  if (mensaje.autorEliminado) {
    return (
      <span
        aria-hidden="true"
        className="size-7 shrink-0 rounded-full bg-[#475569] text-[#e2e8f0] inline-flex items-center justify-center"
      >
        <UserX className="w-4 h-4" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="size-7 shrink-0 rounded-full bg-[#334155] text-white text-xs font-bold inline-flex items-center justify-center"
    >
      {(mensaje.autorUsername || '?').charAt(0).toUpperCase()}
    </span>
  );
}

function MensajeItem({ mensaje, esMio }: { mensaje: Mensaje; esMio: boolean }) {
  const hora = formatearHora(mensaje.creadoEn);
  return (
    <li className={`flex items-end gap-2 ${esMio ? 'justify-end' : 'justify-start'}`}>
      {!esMio && <AvatarMensaje mensaje={mensaje} />}
      <article
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
          esMio
            ? 'bg-[#0f766e] text-white rounded-br-md'
            : 'bg-white/95 text-[#0f172a] rounded-bl-md'
        }`}
      >
        <p className="flex items-baseline gap-2 text-xs">
          <span className="font-bold font-mono">
            {mensaje.autorEliminado ? (
              <AutorEliminado />
            ) : esMio ? (
              <>
                <span className="sr-only">@{mensaje.autorUsername} </span>
                <span aria-hidden="true">Tú</span>
              </>
            ) : (
              `@${mensaje.autorUsername}`
            )}
          </span>
          <time
            dateTime={mensaje.creadoEn}
            className={esMio ? 'text-[#ccfbf1]' : 'text-[#475569]'}
          >
            {hora}
          </time>
        </p>
        <p className="mt-0.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {mensaje.texto}
        </p>
      </article>
    </li>
  );
}

/** Chat en tiempo real de la sala (US-10, SDECG6-53). */
export function RoomChat({
  mensajes,
  miUid,
  estado,
  historial,
  anuncio,
  hayMas,
  cargandoAnteriores,
  onCargarAnteriores,
  onEnviar,
  onReintentarHistorial,
  personas,
}: RoomChatProps) {
  const headingId = useId();
  const ayudaId = useId();
  const textareaId = useId();
  const contadorId = useId();
  const errorId = useId();

  const listaRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const alFinalRef = useRef(true);
  const ultimoIdRef = useRef<string | null>(null);
  const primerIdRef = useRef<string | null>(null);
  /** Distancia al final antes de cargar los anteriores, para no perder la posición de lectura. */
  const anclaRef = useRef<number | null>(null);

  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [hayNuevos, setHayNuevos] = useState(false);
  const [yaCargoAnteriores, setYaCargoAnteriores] = useState(false);
  const [errorAnteriores, setErrorAnteriores] = useState(false);
  const [anuncioHistorial, setAnuncioHistorial] = useState('');

  const conectado = estado === 'conectado';
  const vacio = texto.trim().length === 0;

  const bajarAlFinal = useCallback(() => {
    const el = listaRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    alFinalRef.current = true;
    setHayNuevos(false);
  }, []);

  // Al agregar mensajes anteriores arriba, se mantiene lo que se estaba leyendo en su lugar.
  useLayoutEffect(() => {
    const primero = mensajes[0]?.id ?? null;
    const cambioArriba = primero !== primerIdRef.current;
    primerIdRef.current = primero;
    const el = listaRef.current;
    if (!cambioArriba || anclaRef.current === null || !el) return;
    el.scrollTop = el.scrollHeight - anclaRef.current;
    anclaRef.current = null;
  }, [mensajes]);

  const cargarAnteriores = async () => {
    const el = listaRef.current;
    anclaRef.current = el ? el.scrollHeight - el.scrollTop : null;
    setErrorAnteriores(false);
    const cantidad = await onCargarAnteriores();
    setYaCargoAnteriores(true);
    if (cantidad === null) {
      anclaRef.current = null;
      setErrorAnteriores(true);
      return;
    }
    setAnuncioHistorial(
      cantidad === 1 ? 'Se cargó 1 mensaje anterior' : `Se cargaron ${cantidad} mensajes anteriores`
    );
  };

  // Al llegar un mensaje nuevo al final: baja solo si estabas abajo o si es tuyo.
  useLayoutEffect(() => {
    const ultimo = mensajes[mensajes.length - 1];
    if (!ultimo) {
      ultimoIdRef.current = null;
      return;
    }
    if (ultimo.id === ultimoIdRef.current) return;
    const primeraCarga = ultimoIdRef.current === null;
    ultimoIdRef.current = ultimo.id;

    if (primeraCarga || alFinalRef.current || ultimo.autorUid === miUid) {
      bajarAlFinal();
    } else {
      setHayNuevos(true);
    }
  }, [mensajes, miUid, bajarAlFinal]);

  const alDesplazar = () => {
    const el = listaRef.current;
    if (!el) return;
    alFinalRef.current = estaAlFinal(el);
    if (alFinalRef.current) setHayNuevos(false);
  };

  const enviar = async () => {
    if (enviando || vacio || !conectado) return;
    setEnviando(true);
    setErrorEnvio(null);
    const res = await onEnviar(texto);
    setEnviando(false);
    if (res.ok) {
      setTexto('');
      textareaRef.current?.focus();
    } else {
      setErrorEnvio(res.error || 'No se pudo enviar el mensaje.');
    }
  };

  const alEnviarFormulario = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void enviar();
  };

  const alPresionarTecla = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void enviar();
    }
  };

  useEffect(() => {
    if (!conectado) setEnviando(false);
  }, [conectado]);

  const describedBy = [ayudaId, contadorId, errorEnvio ? errorId : null].filter(Boolean).join(' ');

  return (
    <section
      aria-labelledby={headingId}
      className="relative flex flex-col h-full min-h-[360px] rounded-2xl border border-white/20 bg-[#0b1220]/85 text-[#f8fafc] backdrop-blur-[12px] overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-white/15 flex items-center justify-between gap-2">
        <h2 id={headingId} className="text-[15px] font-bold inline-flex items-center gap-2">
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          Chat de la sala
        </h2>
        {typeof personas === 'number' && personas > 0 && (
          <span className="text-xs font-semibold text-[#cbd5e1] tabular-nums">
            {personas === 1 ? '1 persona' : `${personas} personas`}
          </span>
        )}
      </div>

      {/* Mensajes nuevos de otros: autor, hora y texto, sin mover el foco */}
      <div role="status" aria-live="polite" className="sr-only" data-testid="anuncio-chat">
        {anuncio}
      </div>

      <div
        ref={listaRef}
        onScroll={alDesplazar}
        data-testid="lista-chat"
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
      >
        {historial === 'cargando' && mensajes.length === 0 && (
          <div role="status" aria-busy="true" className="space-y-3">
            <p className="text-sm font-semibold text-[#cbd5e1] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Cargando historial…
            </p>
            {/* Esqueleto con la forma de los mensajes: avatar + burbuja, y uno propio a la derecha */}
            <div aria-hidden="true" className="space-y-3">
              {(['otro', 'mio', 'otro'] as const).map((tipo, i) => (
                <div key={i} className={`flex items-start gap-2 ${tipo === 'mio' ? 'justify-end' : ''}`}>
                  {tipo === 'otro' && <span className="size-8 shrink-0 rounded-full bg-white/10" />}
                  <span
                    className={`block rounded-xl border border-white/10 bg-white/[0.06] p-3 space-y-2 animate-pulse motion-reduce:animate-none ${
                      tipo === 'mio' ? 'w-[72%]' : 'w-[66%]'
                    }`}
                  >
                    <span className="block h-2 w-1/3 rounded bg-white/15" />
                    <span className="block h-2 w-5/6 rounded bg-white/15" />
                    {tipo === 'otro' && <span className="block h-2 w-1/2 rounded bg-white/15" />}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {historial === 'error' && mensajes.length === 0 && (
          <div role="alert" className="text-sm rounded-xl p-3 bg-[#450a0a]/90 border border-[#fca5a5]/60 text-[#fee2e2] space-y-2">
            <p className="inline-flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              No pudimos cargar los mensajes.
            </p>
            <button
              type="button"
              onClick={onReintentarHistorial}
              className="min-h-[40px] px-3 rounded-lg border border-white/30 bg-white/10 hover:bg-white/20 text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Reintentar
            </button>
          </div>
        )}

        {historial === 'listo' && mensajes.length === 0 && (
          <p className="text-sm text-[#cbd5e1] text-center py-6">
            Aún no hay mensajes. Escribe el primero.
          </p>
        )}

        <div role="status" aria-live="polite" className="sr-only">
          {anuncioHistorial}
        </div>

        {mensajes.length > 0 && hayMas && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void cargarAnteriores()}
              disabled={cargandoAnteriores}
              aria-busy={cargandoAnteriores}
              className="min-h-[40px] px-3 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-70"
            >
              {cargandoAnteriores ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {cargandoAnteriores ? 'Cargando…' : 'Cargar mensajes anteriores'}
            </button>
          </div>
        )}

        {errorAnteriores && (
          <p role="alert" className="text-xs text-center text-[#fca5a5] font-semibold">
            No pudimos cargar los mensajes anteriores. Intenta de nuevo.
          </p>
        )}

        {mensajes.length > 0 && !hayMas && yaCargoAnteriores && (
          <p className="text-xs text-center text-[#94a3b8]">No hay más mensajes</p>
        )}

        {mensajes.length > 0 && (
          <ol aria-label="Mensajes del chat" className="list-none p-0 m-0 space-y-2">
            {mensajes.map((m) => (
              <MensajeItem key={m.id} mensaje={m} esMio={Boolean(miUid) && m.autorUid === miUid} />
            ))}
          </ol>
        )}
      </div>

      {hayNuevos && (
        <button
          type="button"
          onClick={bajarAlFinal}
          className="absolute left-1/2 -translate-x-1/2 bottom-[132px] min-h-[40px] px-4 whitespace-nowrap rounded-full bg-[#38bdf8] text-[#0b1220] text-sm font-bold shadow-lg inline-flex items-center gap-1.5"
        >
          <ArrowDown className="w-4 h-4" aria-hidden="true" />
          Mensajes nuevos
        </button>
      )}

      <form
        noValidate
        onSubmit={alEnviarFormulario}
        className="border-t border-white/15 p-3 space-y-1.5"
      >
        {errorEnvio && (
          <div
            id={errorId}
            role="alert"
            className="text-xs rounded-lg px-2.5 py-2 bg-[#450a0a]/90 border border-[#fca5a5]/60 text-[#fee2e2] flex items-center justify-between gap-2"
          >
            <span className="inline-flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>No se envió tu mensaje. {errorEnvio}</span>
            </span>
            <button
              type="submit"
              disabled={!conectado || enviando}
              className="min-h-[36px] px-2.5 rounded-md border border-white/30 bg-white/10 hover:bg-white/20 font-semibold inline-flex items-center gap-1 disabled:opacity-60"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reintentar
            </button>
          </div>
        )}

        <label htmlFor={textareaId} className="sr-only">
          Escribe un mensaje
        </label>
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            id={textareaId}
            rows={2}
            value={texto}
            maxLength={LARGO_MAXIMO_MENSAJE}
            onChange={(e) => {
              setTexto(e.target.value);
              if (errorEnvio) setErrorEnvio(null);
            }}
            onKeyDown={alPresionarTecla}
            placeholder={
              estado === 'sin-servidor'
                ? 'El chat no está disponible en este momento'
                : 'Escribe un mensaje…'
            }
            disabled={estado === 'sin-servidor'}
            aria-describedby={describedBy}
            className="flex-1 resize-none rounded-xl border border-white/25 bg-[#0f172a] text-[#f8fafc] placeholder:text-[#94a3b8] px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={vacio || enviando || !conectado}
            aria-label={enviando ? 'Enviando mensaje' : 'Enviar mensaje'}
            className="min-h-[44px] px-3.5 shrink-0 rounded-xl bg-[#38bdf8] text-[#0b1220] text-sm font-bold inline-flex items-center justify-center gap-1.5 hover:bg-[#7dd3fc] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? (
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Send className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{enviando ? 'Enviando…' : 'Enviar'}</span>
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
          <p id={ayudaId} className="text-[#cbd5e1]">
            Enter para enviar
            <span className="hidden sm:inline"> · Shift+Enter, nueva línea</span>
          </p>
          <p
            id={contadorId}
            className={`tabular-nums ${
              texto.length >= LARGO_MAXIMO_MENSAJE ? 'text-[#fca5a5]' : 'text-[#cbd5e1]'
            }`}
          >
            {texto.length}/{LARGO_MAXIMO_MENSAJE}
            <span className="sr-only"> caracteres</span>
          </p>
        </div>
      </form>
    </section>
  );
}

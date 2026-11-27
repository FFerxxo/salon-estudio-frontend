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
import { AlertCircle, ArrowDown, ArrowUp, Info, Loader2, MessageSquare, RotateCcw, Send, User } from 'lucide-react';
import {
  formatearHora,
  LARGO_MAXIMO_MENSAJE,
  type EstadoConexion,
  type EstadoHistorial,
} from '../hooks/useRoomRealtime';
import { useLiveAnnouncement } from '../hooks/useLiveAnnouncement';
import type { AckRespuesta, Mensaje } from '../services/realtime';

export interface RoomChatProps {
  mensajes: Mensaje[];
  miUid: string | null | undefined;
  estado: EstadoConexion;
  historial: EstadoHistorial;
  anuncio: string;
  hayMas: boolean;
  cargandoAnteriores: boolean;
  visible?: boolean;
  onCargarAnteriores: () => Promise<number | null>;
  onEnviar: (texto: string) => Promise<AckRespuesta<{ mensaje: Mensaje }>>;
  onReintentarHistorial: () => void;
}

/** Distancia en px desde el final para considerar que se está leyendo lo último. */
const MARGEN_FINAL = 48;

function estaAlFinal(el: HTMLElement): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= MARGEN_FINAL;
}

function MensajeItem({ mensaje, esMio }: { mensaje: Mensaje; esMio: boolean }) {
  const hora = formatearHora(mensaje.creadoEn);
  const esEliminado = Boolean(mensaje.autorEliminado);
  const esMioReal = esMio && !esEliminado;
  const tooltipId = useId();
  const filaRef = useRef<HTMLLIElement | null>(null);
  const pointerDownRef = useRef(false);
  const [avisoAbierto, setAvisoAbierto] = useState(false);

  useEffect(() => {
    if (!esEliminado || !avisoAbierto) return;

    const alPresionarFuera = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !filaRef.current?.contains(target)) {
        setAvisoAbierto(false);
      }
    };

    const alPresionarEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAvisoAbierto(false);
      }
    };

    document.addEventListener('pointerdown', alPresionarFuera);
    document.addEventListener('keydown', alPresionarEscape);
    return () => {
      document.removeEventListener('pointerdown', alPresionarFuera);
      document.removeEventListener('keydown', alPresionarEscape);
    };
  }, [esEliminado, avisoAbierto]);

  return (
    <li
      ref={filaRef}
      onBlur={(e) => {
        if (esEliminado && !e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setAvisoAbierto(false);
        }
      }}
      className={`flex flex-col ${esMioReal ? 'items-end' : 'items-start'} gap-1.5`}
    >
      <div className={`flex w-full items-end gap-2 ${esMioReal ? 'justify-end' : 'justify-start'}`}>
        {esEliminado && (
          <span
            aria-hidden="true"
            data-testid="avatar-cuenta-eliminada"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setAvisoAbierto((v) => !v)}
            className="size-8 shrink-0 rounded-full bg-[#334155] text-[#f8fafc] border border-[#94a3b8] inline-flex items-center justify-center shadow-sm cursor-pointer transition-transform duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <User className="size-4" aria-hidden="true" />
          </span>
        )}
        <article
          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
            esMioReal
              ? 'bg-[#0f766e] text-white rounded-br-md'
              : esEliminado
                ? 'bg-[#f1f5f9] text-[#0f172a] border border-dashed border-[#64748b] rounded-bl-md'
                : 'bg-white/95 text-[#0f172a] rounded-bl-md'
          }`}
        >
          <div className="flex items-baseline gap-2 text-xs">
            {esMioReal ? (
              <span className="font-bold font-mono">
                <span className="sr-only">@{mensaje.autorUsername} </span>
                <span aria-hidden="true">Tú</span>
              </span>
            ) : esEliminado ? (
              <button
                type="button"
                onPointerDown={() => {
                  pointerDownRef.current = true;
                }}
                onFocus={() => {
                  if (pointerDownRef.current) {
                    pointerDownRef.current = false;
                    return;
                  }
                  setAvisoAbierto(true);
                }}
                onClick={() => {
                  pointerDownRef.current = false;
                  setAvisoAbierto((v) => !v);
                }}
                aria-expanded={avisoAbierto}
                aria-describedby={avisoAbierto ? tooltipId : undefined}
                className="relative inline-flex items-center gap-1 min-h-[28px] px-1.5 -mx-1.5 rounded-lg font-semibold text-[#334155] underline decoration-dotted underline-offset-4 hover:text-[#0f172a] hover:bg-[#0f172a]/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0369a1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f1f5f9] transition-[color,background-color,transform] duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100 cursor-pointer after:content-[''] after:absolute after:-inset-x-1.5 after:-top-2.5 after:-bottom-1.5"
              >
                <span>Cuenta eliminada</span>
                <Info className="size-3.5 shrink-0" aria-hidden="true" />
              </button>
            ) : (
              <span className="font-bold font-mono">@{mensaje.autorUsername}</span>
            )}
            <time
              dateTime={mensaje.creadoEn}
              className={`tabular-nums ${esMioReal ? 'text-[#ccfbf1]' : 'text-[#475569]'}`}
            >
              {hora}
            </time>
          </div>
          <p className="mt-0.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-pretty">
            {mensaje.texto}
          </p>
        </article>
      </div>
      {esEliminado && avisoAbierto && (
        <div
          id={tooltipId}
          role="tooltip"
          className="ml-10 max-w-[85%] rounded-xl border border-[#94a3b8] bg-[#16233b] px-3 py-2 text-xs font-medium text-[#f8fafc] shadow-md inline-flex items-center gap-2 text-pretty"
        >
          <Info className="size-3.5 shrink-0 text-[#7dd3fc]" aria-hidden="true" />
          <span>Esta cuenta fue eliminada</span>
        </div>
      )}
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
  visible = true,
  onCargarAnteriores,
  onEnviar,
  onReintentarHistorial,
}: RoomChatProps) {
  const headingId = useId();
  const textareaId = useId();
  const contadorId = useId();
  const errorId = useId();

  const listaRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const alFinalRef = useRef(false);
  const pendienteBajarRef = useRef(true);
  const prevVisibleRef = useRef(visible);
  const ultimoIdRef = useRef<string | null>(null);
  const primerIdRef = useRef<string | null>(null);
  /** Distancia al final antes de cargar los anteriores, para no perder la posición de lectura. */
  const anclaRef = useRef<number | null>(null);

  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [hayNuevos, setHayNuevos] = useState(false);
  const [errorAnteriores, setErrorAnteriores] = useState(false);
  const [anuncioHistorial, anunciarHistorial] = useLiveAnnouncement();

  const conectado = estado === 'conectado';
  const vacio = texto.trim().length === 0;

  const bajarAlFinal = useCallback((): boolean => {
    const el = listaRef.current;
    if (!visible || !el || el.scrollHeight === 0) {
      alFinalRef.current = false;
      return false;
    }
    el.scrollTop = el.scrollHeight;
    alFinalRef.current = true;
    pendienteBajarRef.current = false;
    setHayNuevos(false);
    return true;
  }, [visible]);

  // Al mostrar el panel en celular, baja al último mensaje si había quedado pendiente.
  useLayoutEffect(() => {
    const seMostro = !prevVisibleRef.current && visible;
    prevVisibleRef.current = visible;
    if (seMostro && mensajes.length > 0 && (pendienteBajarRef.current || alFinalRef.current)) {
      bajarAlFinal();
    }
  }, [visible, mensajes.length, bajarAlFinal]);

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
    if (cantidad === null) {
      anclaRef.current = null;
      setErrorAnteriores(true);
      return;
    }
    anunciarHistorial(
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

    if (!visible) {
      if (primeraCarga || alFinalRef.current || ultimo.autorUid === miUid) {
        pendienteBajarRef.current = true;
      } else if (!pendienteBajarRef.current) {
        setHayNuevos(true);
      }
      alFinalRef.current = false;
      return;
    }

    if (primeraCarga || alFinalRef.current || pendienteBajarRef.current || ultimo.autorUid === miUid) {
      if (!bajarAlFinal()) {
        pendienteBajarRef.current = true;
      }
    } else {
      setHayNuevos(true);
    }
  }, [mensajes, miUid, visible, bajarAlFinal]);

  const alDesplazar = () => {
    const el = listaRef.current;
    if (!el) return;
    pendienteBajarRef.current = false;
    alFinalRef.current = el.scrollHeight > 0 && estaAlFinal(el);
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

  const describedBy = [contadorId, errorEnvio ? errorId : null].filter(Boolean).join(' ');

  return (
    <section
      aria-labelledby={headingId}
      className="relative flex flex-col h-full min-h-[360px] rounded-[20px] border border-white/20 bg-[#0b1220]/85 text-[#f8fafc] backdrop-blur-[12px] overflow-hidden"
    >
      <h2
        id={headingId}
        className="px-4 py-3 text-base font-bold border-b border-white/15 inline-flex items-center gap-2"
      >
        <MessageSquare className="size-4" aria-hidden="true" />
        Chat
      </h2>

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
          <p role="status" className="text-sm text-[#cbd5e1] inline-flex items-center gap-2 px-1">
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Cargando mensajes…
          </p>
        )}

        {historial === 'error' && mensajes.length === 0 && (
          <div role="alert" className="text-sm rounded-xl p-3 bg-[#450a0a]/90 border border-[#fca5a5]/60 text-[#fee2e2] space-y-2">
            <p className="inline-flex items-center gap-2 font-semibold text-pretty">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              No pudimos cargar los mensajes.
            </p>
            <button
              type="button"
              onClick={onReintentarHistorial}
              className="min-h-[44px] px-3 rounded-lg border border-white/45 bg-white/10 hover:bg-white/20 text-sm font-semibold inline-flex items-center gap-1.5 transition-[background-color,transform] duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reintentar
            </button>
          </div>
        )}

        {historial === 'listo' && mensajes.length === 0 && (
          <p className="text-sm text-[#cbd5e1] text-center py-6 text-pretty">
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
              className="min-h-[44px] px-3.5 rounded-full border border-white/45 bg-white/10 hover:bg-white/20 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-70 transition-[background-color,transform] duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {cargandoAnteriores ? (
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <ArrowUp className="size-3.5" aria-hidden="true" />
              )}
              {cargandoAnteriores ? 'Cargando…' : 'Cargar mensajes anteriores'}
            </button>
          </div>
        )}

        {errorAnteriores && (
          <p role="alert" className="text-xs text-center text-[#fca5a5] font-semibold text-pretty">
            No pudimos cargar los mensajes anteriores. Intenta de nuevo.
          </p>
        )}

        {mensajes.length > 0 && !hayMas && (
          <p className="text-xs text-center text-[#94a3b8] text-pretty">No hay más mensajes</p>
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
          onClick={() => void bajarAlFinal()}
          className="absolute left-1/2 -translate-x-1/2 bottom-[132px] min-h-[44px] px-4 whitespace-nowrap rounded-full bg-[#38bdf8] text-[#0b1220] text-sm font-bold shadow-lg inline-flex items-center gap-1.5 hover:bg-[#7dd3fc] transition-[background-color,transform] duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          <ArrowDown className="size-4" aria-hidden="true" />
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
              <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="text-pretty">No se envió tu mensaje. {errorEnvio}</span>
            </span>
            <button
              type="submit"
              disabled={!conectado || enviando}
              className="min-h-[44px] px-3 rounded-md border border-white/45 bg-white/10 hover:bg-white/20 font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 transition-[background-color,transform] duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
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
                : 'Escribe un mensaje… (Enter envía, Shift+Enter salto de línea)'
            }
            disabled={estado === 'sin-servidor'}
            aria-describedby={describedBy}
            className="flex-1 resize-none rounded-lg border border-white/45 bg-[#0f172a] text-[#f8fafc] placeholder:text-[#94a3b8] px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f172a] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={vacio || enviando || !conectado}
            aria-label={enviando ? 'Enviando mensaje' : 'Enviar mensaje'}
            className="size-11 shrink-0 rounded-lg bg-[#38bdf8] text-[#0b1220] inline-flex items-center justify-center hover:bg-[#7dd3fc] disabled:opacity-50 disabled:cursor-not-allowed transition-[background-color,transform] duration-150 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            {enviando ? (
              <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Send className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
        <p
          id={contadorId}
          className={`text-[11px] text-right tabular-nums ${
            texto.length >= LARGO_MAXIMO_MENSAJE ? 'text-[#fca5a5] font-semibold' : 'text-[#94a3b8]'
          }`}
        >
          {texto.length}/{LARGO_MAXIMO_MENSAJE} caracteres
        </p>
      </form>
    </section>
  );
}

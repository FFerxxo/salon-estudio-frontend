import { useEffect, useRef, type RefObject } from 'react';
import { TUGA_ENTER_STATUS, type TugaPhrase } from '../content/vozTuga';

/*
 * Tuga v7: Tuga vive en el agua del video.
 * Una línea de agua fija corta su cuerpo: la copia nítida (tuga-sobre) se ve solo por
 * encima y la copia tenue (tuga-bajo) solo por debajo. Las dos reciben los mismos
 * movimientos, así que al subir y bajar atraviesa la superficie.
 */

const ENTRADA_S = 1.4; // cuándo se considera que ya salió del agua
const LINEA = 196; // línea de agua dentro de la caja de Tuga (px a escala 1, caja de 620 x 400)
const CENTRO_X = 345; // centro del cuerpo, donde nacen las ondas
const FONDO = 230; // cuánto baja para quedar toda bajo el agua
const ZAMBULLE_S = 0.21; // pausa entre el gesto de silencio y la zambullida
const MAX_ONDAS = 7; // 3 suaves + 1 de contacto + 3 de golpe
const MAX_GOTAS = 8;
const POSE_SHH = { r: 181, sx: 0.62, sy: 0.82 };

const KEYFRAMES = {
  aletaS: [
    [0, 100, 100],
    [18, 60.7, 113],
    [51, -111, 114],
    [85, 48.4, 106.3],
    [115, 100, 100],
  ],
  aletaR: [
    [0, 42.914],
    [51, 109.914],
    [85, 85.3],
    [115, 42.914],
  ],
  capR: [
    [1, 9.71],
    [68, -1.828],
    [94, 9.71],
    [118, 9.71],
  ],
  cabP: [
    [0, 43.91, 126.085],
    [62, 76.171, 136.365],
    [88, 41.1, 121.4],
    [115, 43.91, 126.085],
  ],
  cabR: [
    [0, -17.2],
    [88, -35.145],
    [115, -17.2],
  ],
  pataR: [
    [0, 33.966],
    [27, 9.455],
    [63, 20],
    [89, 6.6],
    [117, 33.966],
  ],
  pata2R: [
    [0, 25.083],
    [24, 7.083],
    [47, 25.083],
    [71, 7.083],
    [94, 25.083],
  ],
  aleta2S: [
    [0, 67, 100],
    [50, -84, 100],
    [113, 67, 100],
  ],
  aleta2R: [
    [0, 59.793],
    [50, 78.793],
    [113, 59.793],
  ],
};

function sampleTrack(track: number[][], frame: number): number[] {
  if (frame <= track[0][0]) return track[0].slice(1);
  for (let i = 0; i < track.length - 1; i += 1) {
    const a = track[i];
    const b = track[i + 1];
    if (frame < b[0]) {
      let u = (frame - a[0]) / (b[0] - a[0]);
      u = u * u * (3 - 2 * u);
      return a.slice(1).map((val, j) => val + (b[j + 1] - val) * u);
    }
  }
  return track[track.length - 1].slice(1);
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const fmt = (v: number) => v.toFixed(2);
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function applyTransform(
  els: HTMLElement[],
  px: number,
  py: number,
  ax: number,
  ay: number,
  deg: number,
  sx = 1,
  sy = 1
) {
  const value = `translate(${fmt(px - ax)}px,${fmt(py - ay)}px) rotate(${fmt(deg)}deg) scale(${fmt(
    sx
  )},${fmt(sy)})`;
  for (const el of els) el.style.transform = value;
}

function setTransformAttr(els: SVGElement[], value: string) {
  for (const el of els) el.setAttribute('transform', value);
}

class Spring {
  x: number;
  o: number;
  v = 0;
  k: number;
  c: number;

  constructor(initial: number, k: number, c: number) {
    this.x = initial;
    this.o = initial;
    this.k = k;
    this.c = c;
  }

  step(dt: number): number {
    this.v += (-this.k * (this.x - this.o) - this.c * this.v) * dt;
    this.x += this.v * dt;
    return this.x;
  }

  setImmediate(val: number) {
    this.x = val;
    this.o = val;
    this.v = 0;
  }
}

/* Las piezas de Tuga. Se dibujan dos veces: sobre el agua y bajo el agua. */
function TugaRig() {
  return (
    <div className="tuga-mov" data-p="mov">
      <div className="tuga-grupo" data-p="grupo">
        <img
          className="tuga-parte tuga-aleta-2"
          data-p="aleta2"
          src="/assets/tuga/aleta.png"
          width={268}
          height={129}
          alt=""
          draggable={false}
        />
        <img
          className="tuga-parte tuga-pata-2"
          data-p="pata2"
          src="/assets/tuga/pata.png"
          width={135}
          height={47}
          alt=""
          draggable={false}
        />
        <img
          className="tuga-parte tuga-pata"
          data-p="pata"
          src="/assets/tuga/pata.png"
          width={135}
          height={47}
          alt=""
          draggable={false}
        />
        <div className="tuga-parte tuga-cabeza" data-p="cabeza">
          <img src="/assets/tuga/cabeza.png" width={161} height={135} alt="" draggable={false} />
          <svg width="161" height="135" viewBox="0 0 161 135" focusable="false">
            <g data-p="ojo" transform="translate(52.375 41) rotate(2.367) scale(.86 .8996)">
              <path
                d="M32.5-6.2C-12.5-17.7-11.5 16.3-13 17.8C-14.5 19.3 40 30.8 32.5-6.2Z"
                fill="#000"
              />
              <g data-p="brillo">
                <ellipse cx="10.2" cy="1.39" rx="9.17" ry="4.49" fill="#f2f3f3" />
                <ellipse cx="24.7" cy="1.86" rx="3.08" ry="1.41" fill="#f2f3f3" />
              </g>
            </g>
            <g data-p="parpado" transform="translate(54.803 32.906) rotate(-23.633) scale(.66 .14)">
              <path
                d="M28.466-1.26C-16.534-12.76-15.534 21.24-17.034 22.74C-18.534 24.24 35.966 35.74 28.466-1.26Z"
                fill="#f2f3f3"
                fillOpacity=".976"
              />
            </g>
          </svg>
          <span className="tuga-boca" data-p="boca" />
        </div>
        <img
          className="tuga-parte"
          data-p="caparazon"
          src="/assets/tuga/caparazon.png"
          width={371}
          height={192}
          alt=""
          draggable={false}
        />
        <img
          className="tuga-parte tuga-aleta"
          data-p="aleta"
          src="/assets/tuga/aleta.png"
          width={268}
          height={129}
          alt=""
          draggable={false}
        />
      </div>
    </div>
  );
}

interface TugaStageProps {
  phrase: TugaPhrase;
  theme: 'dark' | 'light';
  motionPaused: boolean;
  prefersReducedMotion: boolean;
  isButtonHovered: boolean;
  isLeaving: boolean;
  ctaRef: RefObject<HTMLAnchorElement | null>;
}

export function TugaStage({
  phrase,
  theme,
  motionPaused,
  prefersReducedMotion,
  isButtonHovered,
  isLeaving,
  ctaRef,
}: TugaStageProps) {
  const escenaRef = useRef<HTMLDivElement | null>(null);
  const globoRef = useRef<HTMLDivElement | null>(null);
  const colaRef = useRef<SVGPathElement | null>(null);
  const cajaRef = useRef<HTMLDivElement | null>(null);
  const tugaRef = useRef<HTMLDivElement | null>(null);
  const sobreRef = useRef<HTMLDivElement | null>(null);
  const bajoRef = useRef<HTMLDivElement | null>(null);
  const sombraRef = useRef<HTMLDivElement | null>(null);
  const ondasRef = useRef<SVGSVGElement | null>(null);
  const gotasRef = useRef<SVGSVGElement | null>(null);

  const isPaused = motionPaused || prefersReducedMotion;
  const pausedRef = useRef(isPaused);
  const hoverRef = useRef(isButtonHovered);
  const leavingRef = useRef(isLeaving);

  const simRef = useRef<{
    triggerHoverChange?: (hovered: boolean) => void;
    triggerLeave?: () => void;
    syncPause?: (paused: boolean) => void;
  }>({});

  pausedRef.current = isPaused;
  hoverRef.current = isButtonHovered;
  leavingRef.current = isLeaving;

  useEffect(() => {
    const root = tugaRef.current;
    if (!root) return undefined;

    // Las dos copias comparten data-p: cada lista trae la pieza de arriba y la de abajo.
    const pick = <T extends Element>(name: string): T[] =>
      Array.from(root.querySelectorAll<T>(`[data-p="${name}"]`));
    const P = {
      mov: pick<HTMLElement>('mov'),
      grupo: pick<HTMLElement>('grupo'),
      cabeza: pick<HTMLElement>('cabeza'),
      aleta: pick<HTMLElement>('aleta'),
      aleta2: pick<HTMLElement>('aleta2'),
      pata: pick<HTMLElement>('pata'),
      pata2: pick<HTMLElement>('pata2'),
      ojo: pick<SVGElement>('ojo'),
      brillo: pick<SVGElement>('brillo'),
      parpado: pick<SVGElement>('parpado'),
    };
    const bocaEl = sobreRef.current?.querySelector<HTMLElement>('[data-p="boca"]') ?? null;
    const ondaEls = Array.from(ondasRef.current?.children ?? []) as SVGElement[];
    const gotaEls = Array.from(gotasRef.current?.children ?? []) as SVGElement[];
    const wrapEl = escenaRef.current?.parentElement ?? null;

    const miraX = new Spring(0, 70, 15);
    const miraY = new Spring(0, 70, 15);
    const animo = new Spring(0, 90, 17);
    const salto = new Spring(0, 170, 13);
    const shh = new Spring(0, 150, 21);
    const emerge = new Spring(FONDO, 14, 4.4); // FONDO = bajo el agua · 0 = flotando
    emerge.o = 0;
    const hunde = new Spring(0, 170, 26); // zambullida de salida
    const pop = new Spring(0, 210, 17);
    const flotaX = new Spring(0, 16, 6);
    const flotaY = new Spring(0, 16, 6);

    let t = 0;
    let fase = 0;
    let tEntrada = 0;
    let habla = 0;
    let parpT = -1;
    let parpProx = 2.2;
    let parpDoble = false;
    let parpado = 0;
    let pointer: { x: number; y: number } | null = null;
    let lastMove = -99;
    let globoFuera = false;
    let afuera = false;
    let tZambulle = 0;
    let rafId = 0;
    let prevTime = 0;
    let frames = 0;
    let scale = 0.51;
    let anclaPx = 0;
    const bocaClient = { x: 0, y: 0 };
    const inclina = { x: 0, y: 1 };
    const rafagas: { t0: number; fuerza: number }[] = [];
    const gotas: { x: number; y: number; vx: number; vy: number; r: number }[] = [];

    const measureScale = () => {
      if (!escenaRef.current) return;
      const computed = window.getComputedStyle(escenaRef.current).getPropertyValue('--k');
      const parsed = Number.parseFloat(computed);
      if (Number.isFinite(parsed) && parsed > 0) scale = parsed;
    };

    // Ancla: ubica la línea de agua en la franja calma justo debajo del horizonte (perspectiva).
    const anchor = () => {
      const caja = cajaRef.current;
      const alto = window.innerHeight;
      if (!caja || !wrapEl || !alto) return;
      const horizonte = alto / 2;
      const bajoHorizonte = clamp(alto * 0.035, 18, 40);
      const linea = caja.getBoundingClientRect().top - anclaPx + LINEA * scale;
      const fondo = wrapEl.getBoundingClientRect().bottom - anclaPx;
      let d = horizonte + bajoHorizonte - linea;
      d = Math.min(d, alto - 16 - fondo); // que la tarjeta no se salga por abajo…
      d = Math.max(d, horizonte + 12 - linea); // …ni quede por encima del horizonte en agua calma
      d = Math.round(d);
      if (d !== anclaPx) {
        anclaPx = d;
        wrapEl.style.setProperty('--tuga-ancla', `${d}px`);
      }
    };

    const syncStateAttr = () => {
      const next = leavingRef.current
        ? 'shh'
        : tEntrada < ENTRADA_S
          ? 'entrada'
          : hoverRef.current
            ? 'atenta'
            : 'espera';
      if (root.dataset.estado !== next) root.dataset.estado = next;
    };

    const splash = (fuerza: number, cuantasGotas: number) => {
      rafagas.push({ t0: t, fuerza });
      if (rafagas.length > 3) rafagas.shift();
      for (let i = 0; i < cuantasGotas && gotas.length < MAX_GOTAS; i += 1) {
        gotas.push({
          x: CENTRO_X + rand(-150, 110),
          y: LINEA - 2,
          vx: rand(-130, 130),
          vy: -rand(170, 330) * fuerza,
          r: rand(2.6, 5),
        });
      }
    };

    const stepDrops = (dt: number) => {
      for (let i = gotas.length - 1; i >= 0; i -= 1) {
        const g = gotas[i];
        g.vy += 900 * dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        if (g.y > LINEA) gotas.splice(i, 1);
      }
    };

    const drawRing = (el: SVGElement, cx: number, rx: number, opacity: number, width: number) => {
      el.setAttribute('cx', fmt(cx));
      el.setAttribute('cy', String(LINEA));
      el.setAttribute('rx', fmt(rx));
      el.setAttribute('ry', fmt(rx * 0.16));
      el.setAttribute('stroke-width', fmt(width));
      el.style.opacity = fmt(opacity);
    };

    const drawWater = (x: number, profundidad: number) => {
      // presencia: 1 cuando su cuerpo toca la superficie, 0 cuando está bajo el agua
      const presencia = clamp(1 - (profundidad - 30) / 110, 0, 1);
      const cx = CENTRO_X + x;
      if (sombraRef.current) {
        sombraRef.current.style.opacity = fmt(presencia);
        sombraRef.current.style.transform = `translateX(${fmt(x)}px)`;
      }
      if (ondaEls.length < MAX_ONDAS) return;
      for (let i = 0; i < 3; i += 1) {
        const u = (t / 3.6 + i / 3) % 1;
        drawRing(
          ondaEls[i],
          cx,
          165 + 175 * u,
          0.46 * Math.sin(Math.PI * u) * (1 - u * 0.4) * presencia,
          2.4 - 1.4 * u
        );
      }
      drawRing(ondaEls[3], cx, 178 + 3 * Math.sin(t * 1.9), 0.5 * presencia, 2.2);
      for (let i = 0; i < 3; i += 1) {
        const r = rafagas[i];
        const el = ondaEls[4 + i];
        const u = r ? (t - r.t0) / 1.25 : 1;
        if (!r || u >= 1) {
          el.style.opacity = '0';
        } else {
          const sale = 1 - Math.pow(1 - u, 3);
          drawRing(el, cx, 120 + 300 * sale, 0.8 * (1 - u) * r.fuerza, 3.2 - 2.2 * u);
        }
      }
      gotaEls.forEach((el, i) => {
        const g = gotas[i];
        if (!g) {
          el.setAttribute('r', '0');
          return;
        }
        el.setAttribute('cx', fmt(g.x));
        el.setAttribute('cy', fmt(g.y));
        el.setAttribute('r', fmt(g.r));
      });
    };

    const updateTarget = () => {
      const cab = { x: bocaClient.x + 48 * scale, y: bocaClient.y - 40 * scale };
      const ctaEl = ctaRef.current;
      if (ctaEl) {
        const b = ctaEl.getBoundingClientRect();
        const bc = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
        const d = Math.hypot(bc.x - cab.x, bc.y - cab.y) || 1;
        inclina.x = (bc.x - cab.x) / d;
        inclina.y = (bc.y - cab.y) / d;

        let target: { x: number; y: number } | null = null;
        if (leavingRef.current || hoverRef.current) target = bc;
        else if (pointer && t - lastMove < 3.5) target = pointer;

        if (target) {
          miraX.o = clamp((target.x - cab.x) / 260, -1, 1);
          miraY.o = clamp((target.y - cab.y) / 210, -1, 1);
          return;
        }
      }

      miraX.o = -0.15 + 0.3 * Math.sin(t * 0.43);
      miraY.o = -0.05 + 0.3 * Math.sin(t * 0.29 + 1.3);
    };

    const stepBlink = (dt: number) => {
      if (parpT < 0 && t >= parpProx) parpT = 0;
      if (parpT >= 0) {
        parpT += dt;
        const u = parpT / 0.17;
        parpado = u < 0.4 ? u / 0.4 : 1 - (u - 0.4) / 0.6;
        if (u >= 1) {
          parpado = 0;
          parpT = -1;
          if (!parpDoble && Math.random() < 0.22) {
            parpDoble = true;
            parpProx = t + 0.09;
          } else {
            parpDoble = false;
            parpProx = t + 2.4 + Math.random() * 3.4;
          }
        }
      }
    };

    const drawTurtle = () => {
      const a = clamp(animo.x, -0.1, 1.2);
      const s = clamp(shh.x, 0, 1.08);
      const mx = miraX.x;
      const my = miraY.x;
      const sube = clamp(emerge.x / FONDO, 0, 1); // 1 = aún viene subiendo
      const baja = clamp(hunde.x / FONDO, 0, 1.1); // 1 = ya se zambulló

      // oleaje suave en agua calma (±4 px)
      const olaX = 4 * Math.sin(t * 0.885);
      const olaY = 2.8 * Math.sin(t * 1.186 + 0.6) + 1.2 * Math.sin(t * 2.17 + 1);
      flotaX.o = olaX * scale * 0.6;
      flotaY.o = olaY * scale * 0.6;

      const profundidad = emerge.x + hunde.x; // px bajo su posición de flotar
      const x = olaX + sube * 46 + inclina.x * a * 14 - baja * 30;
      const y = olaY + profundidad + salto.x - a * 12;
      const mov = `translate(${fmt(x)}px,${fmt(y)}px)`;
      for (const el of P.mov) el.style.transform = mov;

      // bajo el agua: más tenue cuanto más hondo, y con un vaivén de refracción
      if (bajoRef.current) {
        bajoRef.current.style.opacity = fmt(0.5 * clamp(1.12 - profundidad / FONDO, 0, 1));
        bajoRef.current.style.transform = `translateX(${fmt(1.6 * Math.sin(t * 2.7))}px) skewX(${fmt(
          2.2 * Math.sin(t * 1.9)
        )}deg)`;
      }

      const capR =
        sampleTrack(KEYFRAMES.capR, fase)[0] * 0.7 - my * 3 - a * 3 + sube * 12 - baja * 10;
      const giro = `rotate(${fmt(capR)}deg)`;
      for (const el of P.grupo) el.style.transform = giro;

      // cabeza más alta que en v6: ojo y boca quedan fuera del agua
      let [cx, cy] = sampleTrack(KEYFRAMES.cabP, fase);
      let cr = sampleTrack(KEYFRAMES.cabR, fase)[0];
      cx = 43.91 + (cx - 43.91) * 0.5 + (mx < 0 ? mx * 8 : mx * 10) - a * 6;
      cy = 126.085 + (cy - 126.085) * 0.5;
      cr = -5 + (cr + 17.2) * 0.35 + (my < 0 ? -my * 18 : -my * 7);
      if (habla > 0) cr += 3.4 * Math.sin(t * 34) * Math.min(1, habla / 0.5);
      cr = lerp(cr, -3, s * 0.8);
      applyTransform(P.cabeza, cx, cy, 153.234, 103.901, cr);

      // aletas: reman bajo el agua (sin voltearse hacia arriba)
      let [ax, ay] = sampleTrack(KEYFRAMES.aletaS, fase);
      let ar = sampleTrack(KEYFRAMES.aletaR, fase)[0];
      ax /= 100;
      if (ax < 0.3) ax = 0.3 + (0.3 - ax) * 0.15;
      ar = lerp(ar, POSE_SHH.r, s);
      ax = lerp(ax, POSE_SHH.sx, s);
      ay = lerp(ay / 100, POSE_SHH.sy, s);
      applyTransform(P.aleta, 67.443, 154.422, 2.567, 31.892, ar, ax, ay);

      let a2x = sampleTrack(KEYFRAMES.aleta2S, fase)[0] / 100;
      if (a2x < 0.25) a2x = 0.25 + (0.25 - a2x) * 0.15;
      applyTransform(
        P.aleta2,
        93.349,
        92.018,
        3.21,
        -0.362,
        sampleTrack(KEYFRAMES.aleta2R, fase)[0],
        a2x,
        1
      );
      applyTransform(
        P.pata,
        313.437,
        160.671,
        4.207,
        38.025,
        sampleTrack(KEYFRAMES.pataR, fase)[0]
      );
      applyTransform(
        P.pata2,
        302.061,
        145.213,
        10.919,
        32.645,
        sampleTrack(KEYFRAMES.pata2R, fase)[0]
      );

      const blink = Math.max(parpado, s * 0.5);
      const openScale = 0.14 * (1 - 0.65 * clamp(a, 0, 1));
      setTransformAttr(
        P.parpado,
        `translate(54.803 32.906) rotate(${fmt(lerp(-23.633, 6.367, blink))}) scale(${fmt(
          lerp(0.66, 1.2, blink)
        )} ${fmt(lerp(openScale, 1.2, blink))})`
      );
      const ojoScale = 1 + 0.09 * clamp(a, 0, 1);
      setTransformAttr(
        P.ojo,
        `translate(52.375 41) rotate(2.367) scale(${fmt(0.86 * ojoScale)} ${fmt(0.8996 * ojoScale)})`
      );
      setTransformAttr(P.brillo, `translate(${fmt(mx * 3.2)} ${fmt(my * 2.4)})`);

      drawWater(x, profundidad);
    };

    const drawBubble = () => {
      const escena = escenaRef.current;
      const caja = cajaRef.current;
      const g = globoRef.current;
      if (!escena || !caja || !bocaEl || !g) return;
      const E = escena.getBoundingClientRect();
      const M = bocaEl.getBoundingClientRect();

      bocaClient.x = M.left;
      bocaClient.y = M.top;

      const gw = g.offsetWidth || 240;
      const gh = g.offsetHeight || 56;
      const fx = flotaX.x;
      const fy = flotaY.x;
      // si la boca queda bajo el agua (al zambullirse), la cola termina en la superficie
      const superficie = E.top + caja.offsetTop + LINEA * scale - 5;
      const bx = M.left - E.left - g.offsetLeft - fx;
      const by = Math.min(M.top, superficie) - E.top - g.offsetTop - fy;

      const baseX = clamp(bx - 34, 30, Math.max(30, gw - 30));
      const baseY = gh - 1;
      const dx = bx - baseX;
      const dy = by - baseY;
      const d = Math.hypot(dx, dy) || 1;
      const hueco = Math.min(12, d * 0.3);
      const tx = bx - (dx / d) * hueco;
      const ty = by - (dy / d) * hueco;
      const qx = baseX + (tx - baseX) * 0.2;
      const qy = baseY + (ty - baseY) * 0.8;

      if (colaRef.current) {
        colaRef.current.setAttribute(
          'd',
          `M${fmt(baseX - 10)} ${fmt(baseY)}Q${fmt(qx - 3)} ${fmt(qy)} ${fmt(tx)} ${fmt(
            ty
          )}Q${fmt(qx + 10)} ${fmt(qy - (ty - baseY) * 0.15)} ${fmt(baseX + 10)} ${fmt(baseY)}Z`
        );
      }

      const s = Math.max(0, pop.x);
      g.style.transformOrigin = `${fmt(tx)}px ${fmt(ty)}px`;
      g.style.transform = `translate(${fmt(fx)}px,${fmt(fy)}px) scale(${fmt(s)})`;
      g.style.opacity = fmt(clamp(s * 3, 0, 1));
    };

    // Pose quieta: ya flota, globo abierto, sin bucle. Para pausa y movimiento reducido.
    const setStaticPose = () => {
      tEntrada = Math.max(tEntrada, ENTRADA_S);
      afuera = true;
      emerge.setImmediate(0);
      if (!leavingRef.current) hunde.setImmediate(0);
      globoFuera = true;
      pop.setImmediate(1);
      flotaX.setImmediate(0);
      flotaY.setImmediate(0);
      rafagas.length = 0;
      gotas.length = 0;
      anchor();
      syncStateAttr();
      drawTurtle();
      drawBubble();
      drawBubble();
    };

    const stopLoop = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const tick = (now: number) => {
      const dt = Math.min((now - prevTime) / 1000, 1 / 30);
      prevTime = now;
      t += dt;
      tEntrada += dt;
      frames += 1;
      if (habla > 0) habla -= dt;

      updateTarget();
      miraX.step(dt);
      miraY.step(dt);
      animo.step(dt);
      salto.step(dt);
      shh.step(dt);
      pop.step(dt);
      emerge.step(dt);
      hunde.step(dt);
      flotaX.step(dt);
      flotaY.step(dt);
      stepDrops(dt);

      // rompe la superficie al salir
      if (!afuera && emerge.x < 95) {
        afuera = true;
        splash(1, 5);
      }
      // se zambulle un instante después del gesto de silencio
      if (leavingRef.current && tZambulle > 0 && t >= tZambulle) {
        tZambulle = 0;
        hunde.o = FONDO + 40;
        splash(1, 7);
      }

      const ritmo =
        1 +
        1.3 * clamp(animo.x, 0, 1) +
        1.8 * clamp(emerge.x / FONDO, 0, 1) -
        0.5 * clamp(shh.x, 0, 1);
      fase = (fase + dt * 24 * ritmo) % 120;
      stepBlink(dt);

      if (!globoFuera && tEntrada >= ENTRADA_S * 0.8) {
        globoFuera = true;
        pop.o = 1;
        habla = 0.9;
      }
      if (frames % 30 === 1) anchor();

      syncStateAttr();
      drawTurtle();
      drawBubble();
      rafId = window.requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (rafId || pausedRef.current) return;
      prevTime = performance.now();
      rafId = window.requestAnimationFrame(tick);
    };

    simRef.current.triggerHoverChange = (hovered: boolean) => {
      if (hovered && animo.o === 0 && !leavingRef.current) {
        salto.v -= 400;
        parpProx = t + 0.45;
        if (afuera && !pausedRef.current) splash(0.7, 3);
      }
      animo.o = hovered ? 1 : 0;
      if (pausedRef.current) {
        animo.setImmediate(animo.o);
        setStaticPose();
      }
    };

    simRef.current.triggerLeave = () => {
      if (pausedRef.current) {
        shh.setImmediate(1);
        setStaticPose();
      } else {
        shh.o = 1;
        habla = 0.4;
        pop.v += 2.4;
        tZambulle = t + ZAMBULLE_S;
      }
    };

    simRef.current.syncPause = (paused: boolean) => {
      if (paused) {
        stopLoop();
        setStaticPose();
      } else {
        startLoop();
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      lastMove = t;
    };

    const handleResize = () => {
      measureScale();
      anchor();
      if (!rafId) {
        drawTurtle();
        drawBubble();
        drawBubble();
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('resize', handleResize);

    measureScale();
    anchor();
    drawTurtle();
    drawBubble();

    if (pausedRef.current) {
      setStaticPose();
    } else {
      startLoop();
    }

    return () => {
      stopLoop();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      wrapEl?.style.removeProperty('--tuga-ancla');
    };
  }, [ctaRef]);

  useEffect(() => {
    simRef.current.triggerHoverChange?.(isButtonHovered);
  }, [isButtonHovered]);

  useEffect(() => {
    if (isLeaving) {
      simRef.current.triggerLeave?.();
    }
  }, [isLeaving]);

  useEffect(() => {
    simRef.current.syncPause?.(isPaused);
  }, [isPaused]);

  const isDark = theme === 'dark';

  return (
    <div className="tuga-escena" ref={escenaRef}>
      <div className="tuga-globo" ref={globoRef}>
        <div
          className={`tuga-globo-cuerpo border ${
            isDark ? 'border-slate-400/30' : 'border-slate-300/80'
          }`}
        >
          <p
            className="m-0 text-base sm:text-[17px] leading-snug font-medium text-pretty"
            role="status"
            aria-live="polite"
          >
            {isLeaving
              ? TUGA_ENTER_STATUS
              : phrase.segments.map((segment, index) =>
                  segment.lang ? (
                    <span key={index} lang={segment.lang}>
                      {segment.text}
                    </span>
                  ) : (
                    <span key={index}>{segment.text}</span>
                  )
                )}
          </p>
        </div>
        <svg className="tuga-globo-cola" aria-hidden="true" focusable="false">
          <path ref={colaRef} d="" />
        </svg>
      </div>

      <div className="tuga-caja" ref={cajaRef} aria-hidden="true">
        <div className="tuga-v6" ref={tugaRef} data-estado="entrada">
          <div className="tuga-sombra" ref={sombraRef} />
          <div className="tuga-capa tuga-bajo" ref={bajoRef}>
            <TugaRig />
          </div>
          <svg className="tuga-ondas" ref={ondasRef} viewBox="0 0 620 400" focusable="false">
            {Array.from({ length: MAX_ONDAS }, (_, i) => (
              <ellipse key={i} />
            ))}
          </svg>
          <div className="tuga-capa tuga-sobre" ref={sobreRef}>
            <TugaRig />
          </div>
          <svg className="tuga-gotas" ref={gotasRef} viewBox="0 0 620 400" focusable="false">
            {Array.from({ length: MAX_GOTAS }, (_, i) => (
              <circle key={i} r={0} />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

import { EYE_FRAMES } from "./gnom-eye-frames";

const NUM = /-?\d*\.?\d+(?:e-?\d+)?/g;

/** LogoGnom's paint0. */
export const SWOOSH_D =
  "M192.001 15.0898C192.001 22.2258 168.744 57.621 162.292 71.8791C166.61 68.3839 176.776 87.2105 171.904 93.7238C158.412 111.761 117.187 126.928 97.6318 126.928C60.7145 126.928 30.7871 106.194 30.7871 80.6169C30.7871 55.0402 60.7145 34.3062 97.6318 34.3062C134.549 34.3062 192.001 -10.4869 192.001 15.0898Z";

/** t=0 is open (frame 1), t=1 is shut (frame 5). */
function makeMorph(frames: string[]): (t: number) => string {
  const tpl = frames[0].replace(NUM, "#");
  const nums = frames.map((f) => f.match(NUM)!.map(Number));
  return (t: number) => {
    const clamped = Math.max(0, Math.min(1, t));
    const seg = clamped * (frames.length - 1);
    const i = Math.min(Math.floor(seg), frames.length - 2);
    const f = seg - i;
    const a = nums[i];
    const b = nums[i + 1];
    let k = 0;
    return tpl.replace(/#/g, () => {
      const v = a[k] + (b[k] - a[k]) * f;
      k++;
      return String(Math.round(v * 100) / 100);
    });
  };
}

export const eyeMorph = makeMorph(EYE_FRAMES);

/* A real eye shuts faster than it opens; a symmetric curve reads as a shutter. */
const SHUT_IN = 0.36;
const SHUT_HOLD = 0.08;

/** Repeating blink. The single closing blink uses --gi-blink instead. */
export const BLINK_MS = 300;
/** Second blink of a double - shorter, so the pair reads as one beat. */
export const BLINK_PAIR_MS = 270;

/** Blink progress (0-1) to lid position (0 open, 1 shut). */
export function blinkT(p: number): number {
  if (p < SHUT_IN) {
    const u = p / SHUT_IN;
    return u * u * (3 - 2 * u);
  }
  if (p < SHUT_IN + SHUT_HOLD) return 1;
  const u = (p - SHUT_IN - SHUT_HOLD) / (1 - SHUT_IN - SHUT_HOLD);
  return 1 - Math.sin((u * Math.PI) / 2);
}

/* The iris path draws the upper lid first, right to left, so its leading
   segment is the lid curve. */
const LID_CUT = (() => {
  const c = EYE_FRAMES[0].match(/[A-Z][^A-Z]*/g)!;
  const endX = (v: string) => Number(v.slice(1).trim().split(/[\s,]+/).slice(-2)[0]);
  let i = 1;
  while (i + 1 < c.length && endX(c[i + 1]) < endX(c[i])) i++;
  return i + 1;
})();

/**
 * Keeps everything below the lid, extended sideways at each end point.
 * A horizontal cut instead leaves a flat-topped slab of white floating above
 * the curved lid edge.
 */
export function lidClipD(d: string): string {
  const c = d.match(/[A-Z][^A-Z]*/g)!;
  const yR = c[0].slice(1).trim().split(/[\s,]+/)[1];
  const yL = c[LID_CUT - 1].trim().split(/[\s,]+/).slice(-1)[0];
  return c.slice(0, LID_CUT).join("") + `L-600 ${yL}L-600 1600L1600 1600L1600 ${yR}Z`;
}

/**
 * Clears the sliver of white the lid cannot cover, only right at the end.
 * Over a longer stretch the white dims independently of the lid.
 */
export function swooshOpacity(t: number): number {
  return t < 0.88 ? 1 : (1 - t) / 0.12;
}

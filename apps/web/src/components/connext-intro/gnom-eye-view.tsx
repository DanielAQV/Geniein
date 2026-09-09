"use client";

import { useEffect, useImperativeHandle, useId, useRef, type Ref } from "react";
import { EYE_TRANSFORM, STUDIO_MARK_D } from "./gnom-eye-frames";
import {
  BLINK_MS,
  BLINK_PAIR_MS,
  SWOOSH_D,
  blinkT,
  eyeMorph,
  lidClipD,
  swooshOpacity,
} from "./gnom-eye";

export type GnomEyeHandle = {
  /** Blink once and settle open. */
  blink: (dur?: number) => Promise<void>;
  /** Start or stop blinking at irregular intervals. */
  think: (on: boolean) => void;
  /** Stop the loop but let the blink in flight finish. */
  rest: () => void;
  /** Stop immediately and settle open. */
  stop: () => void;
};

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** The GNOM eye - LogoGnom with a moving lid. */
export function GnomEye({
  ref,
  className,
  style,
  title,
}: {
  ref?: Ref<GnomEyeHandle>;
  className?: string;
  style?: React.CSSProperties;
  /** Omit to mark the graphic decorative. */
  title?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const pathRef = useRef<SVGPathElement>(null);
  const lidRef = useRef<SVGPathElement>(null);
  const swooshRef = useRef<SVGPathElement>(null);

  /* Kept in a ref so a blink does not re-render on every frame. */
  const ctl = useRef<{
    raf: number;
    loop: boolean;
    endPrev: (() => void) | null;
  }>({ raf: 0, loop: false, endPrev: null });

  useImperativeHandle(ref, () => {
    const set = (t: number) => {
      const d = eyeMorph(t);
      pathRef.current?.setAttribute("d", d);
      lidRef.current?.setAttribute("d", lidClipD(d));
      if (swooshRef.current) {
        swooshRef.current.style.opacity = String(swooshOpacity(t));
      }
    };

    const blink = (dur = BLINK_MS) =>
      new Promise<void>((res) => {
        const c = ctl.current;
        const t0 = performance.now();
        let done = false;
        cancelAnimationFrame(c.raf);
        /* Settle the previous blink now, or its timeout reopens the eye mid-blink. */
        c.endPrev?.();
        const fin = () => {
          if (done) return;
          done = true;
          clearTimeout(tm);
          if (c.endPrev === fin) c.endPrev = null;
          set(0);
          res();
        };
        /* Hidden tabs never fire rAF, which would leave this promise pending. */
        const tm = setTimeout(fin, dur + 400);
        c.endPrev = fin;
        const step = (now: number) => {
          if (done) return;
          const p = Math.max(0, Math.min(1, (now - t0) / dur));
          set(blinkT(p));
          if (p < 1) c.raf = requestAnimationFrame(step);
          else fin();
        };
        c.raf = requestAnimationFrame(step);
      });

    const DOUBLE_CHANCE = 0.28;
    const PAIR_GAP = 150;
    const think = async (on: boolean) => {
      const c = ctl.current;
      c.loop = on;
      let first = true;
      while (c.loop) {
        await blink(BLINK_MS);
        if (c.loop && !first && Math.random() < DOUBLE_CHANCE) {
          await wait(PAIR_GAP);
          if (c.loop) await blink(BLINK_PAIR_MS);
        }
        first = false;
        await wait(900 + Math.random() * 1500);
      }
    };

    return {
      blink,
      think: (on: boolean) => void think(on),
      rest: () => {
        ctl.current.loop = false;
      },
      stop: () => {
        const c = ctl.current;
        c.loop = false;
        cancelAnimationFrame(c.raf);
        c.endPrev?.();
        set(0);
      },
    };
  }, []);

  /* The paths render empty on the server. */
  useEffect(() => {
    const d = eyeMorph(0);
    pathRef.current?.setAttribute("d", d);
    lidRef.current?.setAttribute("d", lidClipD(d));
    const c = ctl.current;
    return () => {
      c.loop = false;
      cancelAnimationFrame(c.raf);
      c.endPrev?.();
    };
  }, []);

  return (
    <svg
      viewBox="0 0 204 154"
      className={className}
      style={style}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      /* The lid clip runs past the viewBox and must not be cropped. */
      overflow="visible"
    >
      <defs>
        {/* Must match LogoGnom paint1 - the eye lands in the logo slot. */}
        <linearGradient
          id={`ge${uid}`}
          x1="439.077"
          y1="0"
          x2="439.077"
          y2="630.745"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0DD1FB" />
          <stop offset="1" stopColor="#0A38F0" />
        </linearGradient>
        <linearGradient
          id={`gw${uid}`}
          x1="173.214"
          y1="18.5848"
          x2="77.9716"
          y2="136.546"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D4D4D4" stopOpacity="0" />
          <stop offset="0.436085" stopColor="white" />
        </linearGradient>
        <clipPath id={`gl${uid}`}>
          <path ref={lidRef} transform={EYE_TRANSFORM} d="" />
        </clipPath>
      </defs>
      <path
        ref={swooshRef}
        d={SWOOSH_D}
        fill={`url(#gw${uid})`}
        clipPath={`url(#gl${uid})`}
      />
      <g transform={EYE_TRANSFORM}>
        <path ref={pathRef} d="" fill={`url(#ge${uid})`} />
      </g>
    </svg>
  );
}

/** Static GNOM Studio mark for the intro tag. */
export function GnomStudioMark({ className }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="0 0 30 22" className={className} aria-hidden="true">
      <defs>
        <linearGradient
          id={`gs${uid}`}
          x1="20.4262"
          y1="0"
          x2="20.4262"
          y2="21.6277"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0DD0FB" />
          <stop offset="1" stopColor="#0A3EF1" />
        </linearGradient>
      </defs>
      <path d={STUDIO_MARK_D} fill={`url(#gs${uid})`} />
    </svg>
  );
}

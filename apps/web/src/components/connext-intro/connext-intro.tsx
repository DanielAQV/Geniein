"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GnomEye, GnomStudioMark, type GnomEyeHandle } from "./gnom-eye-view";
import { useLanguage } from "@/lib/i18n/language-context";
import { INTRO_SEEN_KEY, INTRO_SLOT_ATTR } from "./intro-boot";
import "./intro.css";
const STUDIO_SHOTS = [
  "/images/intro/studio-1.jpg",
  "/images/intro/studio-2.jpg",
  "/images/intro/studio-3.jpg",
];

/** Eye size during the intro, relative to the logo. */
const EYE_BIG = 2.1;
/** Centre of the 204x154 .gi-eye box; target minus this gives the transform. */
const EYE_CX = 102;
const EYE_CY = 77;
const ABORT = Symbol("intro-abort");

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Intro rhythm in ms. --gi-up is read from CSS instead, since a rule uses it too. */
const T = {
  lead: 620 /* eye appears */,
  tag: 380 /* product label */,
  set: 620 /* setup line to result line */,
  hold: 1300 /* result line holds */,
  swap: 380 /* swap lines */,
  pull: 460 /* clear the copy */,
  beat: 300 /* a beat on the eye alone */,
  blink: 380 /* the single closing blink */,
  hold2: 420 /* pause after that blink */,
};

function readUpMs() {
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--gi-up"),
  );
  return Number.isFinite(v) ? v : 860;
}

type Beat = { kind: "est" | "studio"; name: string; set: string; hit: string };

/**
 * Intro overlay for the landing page. INTRO_BOOT_SCRIPT decides whether it
 * plays; the hero marks `data-intro-eye-slot` on the logo wrapper and
 * `data-intro-rise="1"`..`"3"` on whatever rises with it.
 */
export function ConnextIntro({ force = false }: { force?: boolean }) {
  /* next-intl 의 useTranslations 자리. 지니인 사전은 전체 경로를 받으므로
     원본의 키를 그대로 쓰도록 접두사만 붙여 감싼다. */
  const { t: translate } = useLanguage();
  const t = (key: string) => translate(`connext.intro.${key}`);
  const [active, setActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const eyeBoxRef = useRef<HTMLDivElement>(null);
  const eyeRef = useRef<GnomEyeHandle>(null);
  const sayRef = useRef<HTMLDivElement>(null);
  const tagNameRef = useRef<HTMLSpanElement>(null);
  const setRef = useRef<HTMLDivElement>(null);
  const hitRef = useRef<HTMLDivElement>(null);
  const estIcoRef = useRef<HTMLSpanElement>(null);
  const studioIcoRef = useRef<HTMLSpanElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const landRef = useRef<() => void>(() => {});

const beats = useMemo<Beat[]>(
    () => [
      {
        kind: "est",
        name: t("estimator.name"),
        set: t("estimator.set"),
        hit: t("estimator.hit"),
      },
      {
        kind: "studio",
        name: t("studio.name"),
        set: t("studio.set"),
        hit: t("studio.hit"),
      },
    ],
    [t],
  );
  /* Held in a ref: putting the copy in the deps would restart the intro. */
  const beatsRef = useRef(beats);
  useEffect(() => {
    beatsRef.current = beats;
  }, [beats]);

  useIsoLayoutEffect(() => {
    setMounted(true);
    /* 브라우저당 한 번. 모션을 줄여 달라고 한 사용자에게는 재생하지 않는다.
       force 는 "인트로 다시 보기" 용이라 두 조건을 모두 건너뛴다. */
    if (force) {
      setActive(true);
      return;
    }
    let seen = false;
    try {
      seen = localStorage.getItem(INTRO_SEEN_KEY) === "1";
    } catch {
      /* 시크릿 모드 — 매번 보여도 무방하다 */
    }
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setActive(!seen && !reduce);
  }, [force]);

  useEffect(() => {
    if (!active) return;
    const root = rootRef.current;
    const eyeBox = eyeBoxRef.current;
    const eye = eyeRef.current;
    const say = sayRef.current;
    const fx = fxRef.current;
    if (!root || !eyeBox || !eye || !say || !fx) return;

    let aborted = false;
    let landedOnce = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

    const up = readUpMs();

    /* 랜딩 화면을 숨겼다 드러내는 표시. 원본은 <html> 에 걸었지만 우리는
       액자 안에서만 재생하므로 액자에 건다 — 바깥 페이지는 건드리지 않는다. */
    const frame = root.parentElement;
    frame?.setAttribute("data-intro", "playing");

    /* 좌표 기준이 뷰포트가 아니라 액자다. 액자가 화면보다 작으므로 눈과
       카피가 뷰포트 기준으로 놓이면 액자 밖으로 나간다. */
    const boxW = () => root.clientWidth;
    const boxH = () => root.clientHeight;

    /* 40% of the viewport height, not centred - copy goes below the eye. */
    let eyeScale = EYE_BIG;
    let introCY = 0;
    let pulse = 1;

    const place = () => {
      if (landedOnce) return;
      eyeBox.style.transform =
        `translate(${boxW() / 2 - EYE_CX}px, ${introCY - EYE_CY}px)` +
        ` scale(${eyeScale * pulse})`;
    };
    const layout = () => {
      const s = Math.min(1, (boxW() - 40) / 900, (boxH() - 80) / 760);
      eyeScale = EYE_BIG * Math.max(0.5, s);
      introCY = boxH() * 0.4;
      say.style.transform = `translateY(${introCY + (154 * eyeScale) / 2 + 28}px)`;
      fx.style.top = `${introCY}px`;
      /* Eye radius plus half a card. */
      root.style.setProperty("--gi-d", `${Math.round(eyeScale * 157)}px`);
      place();
    };
    addEventListener("resize", layout);
    /* 액자는 반응형이라 창 크기가 그대로여도 폭이 바뀔 수 있다. */
    const ro = new ResizeObserver(layout);
    ro.observe(root);

    const land = (markSeen = true) => {
      if (landedOnce) return;
      landedOnce = true;
      aborted = true;
      eye.stop();
      say.dataset.step = "out";
      fx.dataset.gone = "1";
      root.dataset.phase = "landing";
      frame?.setAttribute("data-intro", "landing");

      const slot = (frame ?? document).querySelector(`[${INTRO_SLOT_ATTR}]`);
      const r = slot?.getBoundingClientRect();
      const fr = root.getBoundingClientRect();
      eyeBox.style.transition = `transform ${up}ms cubic-bezier(.25,.9,.25,1), opacity 260ms ease`;
      eyeBox.style.opacity = "1";
      if (r && r.width > 0) {
        eyeBox.style.transform =
          `translate(${r.left - fr.left + r.width / 2 - EYE_CX}px, ${r.top - fr.top + r.height / 2 - EYE_CY}px)` +
          ` scale(${r.width / 204})`;
      } else {
        /* No slot means no target, so fade out rather than land somewhere wrong. */
        eyeBox.style.opacity = "0";
      }

      later(() => {
        root.dataset.phase = "done";
        frame?.removeAttribute("data-intro");
        setActive(false);
      }, up + 120);

      if (markSeen) {
        try {
          localStorage.setItem(INTRO_SEEN_KEY, "1");
        } catch {
          /* Private mode - showing the intro once more is acceptable. */
        }
      }
    };
    landRef.current = () => land();

    /* Swells as the result line lands. Runs alongside the blink loop. */
    const bump = () => {
      const t0 = performance.now();
      const step = (now: number) => {
        if (aborted) {
          pulse = 1;
          return;
        }
        const p = Math.min(1, (now - t0) / 380);
        pulse = 1 + 0.055 * Math.sin(Math.PI * p);
        place();
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    /* Cleared and re-set so the same kind twice in a row still replays. */
    const accent = (kind: Beat["kind"]) => {
      delete fx.dataset.kind;
      delete fx.dataset.gone;
      void fx.offsetWidth; /* reflow, or the animation does not restart */
      fx.dataset.kind = kind;
    };

    const paint = (beat: Beat) => {
      if (tagNameRef.current) tagNameRef.current.textContent = beat.name;
      if (setRef.current) setRef.current.textContent = beat.set;
      if (hitRef.current) hitRef.current.textContent = beat.hit;
      if (estIcoRef.current)
        estIcoRef.current.style.display = beat.kind === "studio" ? "none" : "";
      if (studioIcoRef.current)
        studioIcoRef.current.style.display = beat.kind === "studio" ? "" : "none";
    };

    const guard = async (p: Promise<unknown>) => {
      await p;
      if (aborted) throw ABORT;
    };

    const run = async () => {
      root.dataset.phase = "intro";
      say.dataset.step = "reset";
      eyeBox.style.transition = "none";
      eyeBox.style.opacity = "0";
      layout();

      try {
        const target = eyeScale;
        eyeScale = target * 0.84;
        place();
        /* Commit the 0.84 scale for a frame before the transition goes on. */
        await guard(wait(20));

        eyeBox.style.transition =
          `transform ${T.lead}ms cubic-bezier(.2,.8,.25,1),` +
          ` opacity ${Math.round(T.lead * 0.6)}ms ease`;
        eyeBox.style.opacity = "1";
        eyeScale = target;
        place();
        eye.think(true);
        await guard(wait(T.lead));
        /* The pulse is drawn per frame from here on. */
        eyeBox.style.transition = "none";

        const script = beatsRef.current;
        for (let i = 0; i < script.length; i++) {
          /* Going straight from "out" to the first step would drop the
             second line in from above instead of raising it. */
          say.dataset.step = "reset";
          void say.offsetWidth;
          paint(script[i]);
          say.dataset.step = "1";
          await guard(wait(T.tag));
          say.dataset.step = "2";
          await guard(wait(T.set));
          say.dataset.step = "3";
          bump();
          accent(script[i].kind);
          await guard(wait(T.hold));
          if (i < script.length - 1) {
            say.dataset.step = "out";
            fx.dataset.gone = "1";
            await guard(wait(T.swap));
          }
        }

        /* Stop the loop first, or its last blink runs into the closing one
           and reads as a double. */
        eye.rest();
        say.dataset.step = "out";
        fx.dataset.gone = "1";
        await guard(wait(T.pull));
        await guard(wait(T.beat));
        await guard(eye.blink(T.blink));
        await guard(wait(T.hold2));
        land();
      } catch (e) {
        if (e !== ABORT) {
          console.error(e);
          land();
        }
      }
    };

    /* Leaving the tab mid-intro does not count as having seen it. */
    const onHidden = () => {
      if (document.hidden) land(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") land();
    };
    document.addEventListener("visibilitychange", onHidden);
    addEventListener("keydown", onKey);

    void run();

    return () => {
      aborted = true;
      eye.stop();
      timers.forEach(clearTimeout);
      removeEventListener("resize", layout);
      ro.disconnect();
      /* 착지 전에 언마운트되면 랜딩 화면이 숨은 채로 남는다 */
      frame?.removeAttribute("data-intro");
      removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [active]);

  if (!mounted || !active) return null;

  return (
    <div className="gi-root" ref={rootRef} data-phase="intro">
      <div className="gi-scrim" aria-hidden="true" />
      <div className="gi-halo" aria-hidden="true" />

      <div className="gi-fx" ref={fxRef} aria-hidden="true">
        <div className="gi-card gi-est gi-c1">
          <span>{t("fx.cost.label")}</span>
          <b>{t("fx.cost.value")}</b>
        </div>
        <div className="gi-card gi-est gi-c2">
          <span>{t("fx.effort.label")}</span>
          <b>{t("fx.effort.value")}</b>
        </div>
        <div className="gi-card gi-est gi-c3">
          <span>{t("fx.vendor.label")}</span>
          <b>{t("fx.vendor.value")}</b>
        </div>
        {STUDIO_SHOTS.map((src, i) => (
          <div key={i} className={`gi-card gi-studio gi-c${i + 1}`}>
            <div className="gi-dots">
              <i />
              <i />
              <i />
            </div>
            <img src={src} alt="" />
          </div>
        ))}
      </div>

      <div className="gi-say" ref={sayRef} data-step="reset" aria-hidden="true">
        <div className="gi-tag">
          <span className="gi-tico" ref={estIcoRef}>
            <GnomEye />
          </span>
          <span className="gi-tico" ref={studioIcoRef} style={{ display: "none" }}>
            <GnomStudioMark />
          </span>
          <span>
            <b>GNOM</b> <span ref={tagNameRef} />
          </span>
        </div>
        <div className="gi-set" ref={setRef} />
        <div className="gi-hit" ref={hitRef} />
      </div>

      <div className="gi-eye" ref={eyeBoxRef} aria-hidden="true">
        <GnomEye ref={eyeRef} />
      </div>

      <button type="button" className="gi-skip" onClick={() => landRef.current()}>
        {t("skip")}
      </button>
    </div>
  );
}

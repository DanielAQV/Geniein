/**
 * Set on `<html>`: "playing" during the intro, "landing" on the way out.
 *
 * The server does not render it, so React logs one hydration mismatch for it in
 * dev. It is dev only - a production build is silent - and React leaves the
 * attribute alone, so this is not worth suppressHydrationWarning on the root layout.
 */
export const INTRO_ATTR = "data-intro";

/** Once seen, the intro does not play again in this browser. */
export const INTRO_SEEN_KEY = "connext_intro_seen";

/** Goes on the landing logo wrapper - the eye lands there. */
export const INTRO_SLOT_ATTR = "data-intro-eye-slot";

/* INTRO_BOOT_SCRIPT 는 전체화면 인터스티셜용이었다. 액자 안에서 재생하도록
   바꾸면서 페이지를 미리 숨길 이유가 없어져 삭제했다. 재생 여부는
   ConnextIntro 가 마운트 시점에 직접 판단한다. */

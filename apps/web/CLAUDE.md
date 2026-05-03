# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — start the Next.js dev server (Turbopack defaults in Next 16)
- `pnpm build` — production build
- `pnpm start` — run the built app
- `pnpm lint` — `eslint .` (no eslint config is checked in; lint is effectively a no-op until one is added)

There is no test runner configured.

`pnpm-lock.yaml` and `package-lock.json` both exist. pnpm appears to be the intended package manager (the lockfile is more recent and larger); prefer `pnpm` and avoid regenerating `package-lock.json`.

## Architecture

Single-page marketing site for **geniein** (Digital ODA consulting + IT platforms). Stack: **Next.js 16 App Router, React 19, TypeScript 5.7, Tailwind CSS v4, shadcn/ui (new-york style)**. The project was bootstrapped from v0.app (`generator: 'v0.app'` in metadata).

### Page composition

`src/app/page.tsx` is the entire site — it stacks five section components in order: `Header`, `Hero`, `BusinessOverview`, `Platforms`, `AIInsights`, `ContactFooter`. Inter-section navigation is anchor-based (`#about`, `#business`, `#platforms`, `#insights`, `#contact`) — when adding or renaming a section, keep the anchor IDs in sync with the `<Link href="#...">` references in `src/components/header.tsx`.

UI copy is **Korean**. A trilingual scheme (KR / EN / VN) is hinted at by the language switcher in the header, but i18n is not wired up — the dropdown items don't change locale. `src/i18n/`, `src/stores/`, `src/constants/`, `src/types/`, and `src/assets/` are **empty placeholder directories** kept for future expansion; the path alias `@/*` resolves to `./src/*`.

### Styling system

- Tailwind **v4** with the new `@import 'tailwindcss'` + `@theme inline` syntax. There is no `tailwind.config.*` — theme tokens live in `src/app/globals.css` as CSS variables (oklch color space) and are projected into Tailwind via `@theme inline`.
- Dark mode is **forced on** at the root: `<html className="dark">` in `src/app/layout.tsx`. `next-themes` is installed but no provider/toggle is wired up; both `:root` and `.dark` palettes are defined but only `.dark` is active in practice.
- `styles/globals.css` exists at the repo root but **is not imported anywhere** — the active stylesheet is `src/app/globals.css` (referenced by `layout.tsx` and by `components.json`). Edit the latter; the former appears to be a stale leftover.

### shadcn/ui

Configured in `components.json` (style: `new-york`, baseColor: `neutral`, RSC enabled, icon library: `lucide`). About 50 primitives are already scaffolded under `src/components/ui/` — prefer composing those over installing new ones. Use `cn()` from `src/lib/utils.ts` for class merging (clsx + tailwind-merge).

Note: there are duplicate hook files — `src/hooks/use-mobile.ts` + `src/hooks/use-toast.ts` and `src/components/ui/use-mobile.tsx` + `src/components/ui/use-toast.ts`. Imports in section components currently use `@/hooks/...`; keep new hooks there to match.

### Build configuration gotchas

`next.config.mjs` sets `typescript.ignoreBuildErrors: true` and `images.unoptimized: true`. **`pnpm build` will not catch TypeScript errors** — run `tsc --noEmit` manually if you want type checking to gate a change. `next/image` runs unoptimized, so any image works without configuring remote patterns.

Vercel Analytics is loaded only in production (`process.env.NODE_ENV === 'production'`) — it won't appear in dev.

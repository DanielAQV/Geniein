"use client"

import { useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import { ArrowUpRight, RotateCcw } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { ConnextIntro } from "@/components/connext-intro/connext-intro"
import { ConnextLanding } from "@/components/connext-intro/connext-landing"
import { INTRO_SEEN_KEY } from "@/components/connext-intro/intro-boot"

/**
 * 플랫폼 서비스 상단의 Connext 소개.
 *
 * 인트로를 화면 전체로 띄우지 않고 16:9 액자 안에서 돌린다. 회사 소개
 * 사이트의 하위 페이지를 6초 가리면 방문자가 당황하고, 무엇보다 "플랫폼
 * 서비스" 를 확인하러 온 사람의 용건을 막게 된다. 액자 안이면 인트로를
 * 보든 그냥 스크롤해 내려가든 방문자가 고르게 된다.
 *
 * 인트로가 끝난 자리에 그대로 CTA 가 남아 "그래서 어디서 보나" 에 답한다.
 * Connext 는 별도 제품이라 화면을 이 사이트 안에 흉내 내지 않고 링크로만
 * 내보낸다 — 흉내 내기 시작하면 원본이 바뀔 때마다 따라가야 한다.
 */

/* 배포 주소가 정해지면 이 상수만 고치면 된다. */
const CONNEXT_URL = "https://dev.connex-t.com"

export function ConnextCta() {
  const { t } = useLanguage()
  const [replayKey, setReplayKey] = useState(0)

  /* 액자가 화면에 들어온 뒤에 재생을 시작한다.
     액자가 카드 아래에 있어 진입 시 화면 밖일 수 있는데, 그대로 두면
     아무도 못 본 채로 6초가 흐르고 "브라우저당 1회" 규칙 때문에
     그 사람은 영영 못 보게 된다. */
  const frameRef = useRef<HTMLDivElement>(null)
  /* framer-motion 의 useInView 를 쓴다 — 이 페이지의 다른 섹션들이 이미
     같은 방식으로 동작한다. once 라 한 번 보이면 계속 참이다. */
  const inView = useInView(frameRef, { once: true, amount: 0.4 })

  /* 인트로는 브라우저당 한 번만 재생된다. 다시 보고 싶을 때가 있어서
     기록을 지우고 컴포넌트를 새로 마운트한다 — 페이지 새로고침 없이. */
  const replay = () => {
    try {
      localStorage.removeItem(INTRO_SEEN_KEY)
    } catch {
      /* 시크릿 모드 — 어차피 저장된 적이 없다 */
    }
    setReplayKey((n) => n + 1)
  }

  return (
    <section className="relative border-b border-border/50 bg-background py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-[20px] border border-[var(--border-card)] bg-[var(--card-dark)] shadow-md"
        >
          <div className="flex flex-col items-center gap-3 px-6 pt-10 text-center">
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-[17px] py-[5px] text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {t("connext.cta.label")}
            </span>
            <h2 className="text-[22px] md:text-3xl font-bold leading-snug tracking-tight text-foreground break-keep">
              {t("connext.cta.title")}
            </h2>
            <p className="max-w-2xl whitespace-pre-line break-keep text-sm md:text-base font-light leading-relaxed text-muted-foreground">
              {t("connext.cta.desc")}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 px-6 pb-10 pt-6 sm:flex-row">
            <a
              href={CONNEXT_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90"
            >
              {t("connext.cta.button")}
              <ArrowUpRight className="h-4 w-4" />
            </a>

            <button
              type="button"
              onClick={replay}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-card-strong)] px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t("connext.cta.replay")}
            </button>
          </div>

          {/* 모니터 비율 액자. 인트로는 여기 안에서만 움직인다. */}
          {/* 액자 안은 테마와 무관하게 어둡다 — Connext 화면 자체가 어두운 UI 라
              라이트 모드에서도 여기만 "모니터" 처럼 읽히는 편이 낫다. */}
          <div ref={frameRef} className="relative aspect-video w-full overflow-hidden bg-[#03060f]">
            {/* 인트로가 끝나면 눈이 이 화면의 로고 자리로 날아가 앉는다 */}
            <ConnextLanding />
            {inView && <ConnextIntro key={replayKey} force={replayKey > 0} />}
          </div>

        </motion.div>
      </div>
    </section>
  )
}

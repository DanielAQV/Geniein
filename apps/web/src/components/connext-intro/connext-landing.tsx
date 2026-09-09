"use client"

import { useLanguage } from "@/lib/i18n/language-context"
import { LogoGnom } from "./logo-gnom"
import { CONNEXT_URL } from "./connext-url"

/**
 * 액자 안에 놓이는 Connext 랜딩 화면.
 *
 * 인트로의 마지막 동작이 "눈이 로고 자리로 날아가 앉는 것" 이라 그 자리가
 * 있어야 한다 — [data-intro-eye-slot] 이 그 표시다. 슬롯이 없으면 눈은
 * 갈 곳이 없어 그냥 사라지고, 인트로가 붕 뜬 채로 끝난다.
 *
 * 실제 Connext 를 iframe 으로 끌어오지 않고 화면만 재현한다. 로그인·입력창
 * 같은 것이 여기서 동작하면 방문자가 여기서 쓰려 하고, 그 순간 두 서비스의
 * 경계가 무너진다. 여기서는 "이렇게 생긴 서비스" 까지만 보여주고 실제
 * 사용은 CTA 로 내보낸다.
 *
 * data-intro-rise 는 인트로가 끝날 때 순서대로 떠오르는 요소들이다.
 */
export function ConnextLanding() {
  const { t } = useLanguage()

  return (
    <div className="absolute inset-0 overflow-hidden">
      <img
        src="/images/intro/connext-home.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[#02040a]/35" />

      <div className="relative flex h-full flex-col items-center justify-center gap-[3%] px-[6%] text-center">
        {/* 눈이 착지하는 자리 */}
        <div
          data-intro-eye-slot
          className="w-[16%] min-w-[54px] max-w-[110px] [&_svg]:h-auto [&_svg]:w-full"
        >
          <LogoGnom />
        </div>

        <div className="flex flex-col items-center gap-[1.5%]" data-intro-rise="1">
          <p className="text-[clamp(15px,2.6vw,34px)] font-bold leading-tight text-white">
            {t("connext.landing.title")}
          </p>
          <p className="max-w-[42em] text-[clamp(9px,1.15vw,15px)] font-light leading-relaxed text-white/70 break-keep">
            {t("connext.landing.desc")}
          </p>
        </div>

        {/* 입력창은 생김새만이다 — 여기서 프로젝트를 적게 하면 두 서비스의
            경계가 무너진다. 버튼만 실제 링크로, 새 탭에서 Connext 를 연다.
            색·모양은 Connext 메인의 버튼과 같다 (bg-[#4A6DF2], hover/active 포함). */}
        <div className="w-full max-w-[560px]" data-intro-rise="2">
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-[3%] py-[1.6%] backdrop-blur-sm">
            <span className="flex-1 truncate text-left text-[clamp(9px,1.05vw,14px)] text-white/45">
              {t("connext.landing.placeholder")}
            </span>
            <a
              href={CONNEXT_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="shrink-0 rounded-lg bg-[#4A6DF2] px-[14px] py-[7px] text-[clamp(8px,0.9vw,12px)] font-bold text-white transition-colors hover:bg-[#4262D9] active:bg-[#334CA9]"
            >
              {t("connext.landing.button")}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 채용 지원 접수.
 *
 * 지원서를 **저장하지 않는다.** 받은 즉시 담당자 메일로 넘기고 서버에는
 * 아무것도 남기지 않는다. 이력서는 개인정보라 저장소·접근권한·보관기간·파기
 * 절차가 정해지기 전에는 서버에 쌓아둘 근거가 없다. 메일로만 흐르면 보관
 * 기간이 곧 사서함의 보관 정책이 되고, 파기도 메일 삭제로 끝난다.
 *
 * 저장이 필요해지면(지원자 목록 화면, 전형 상태 관리 등) 그때 오브젝트
 * 스토리지 + DB 를 붙이고 처리방침의 보유 기간 조항을 함께 고친다.
 *
 * 수신자는 CAREERS_TO_EMAIL 에서 읽고 쉼표로 여러 명을 넣을 수 있다.
 * 미설정이면 CONTACT_TO_EMAIL 로 떨어진다.
 */

import { NextResponse } from "next/server"

export const runtime = "nodejs"

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"]

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

const FONT_STACK =
  "'Noto Sans KR','Apple SD Gothic Neo','Helvetica Neue',Arial,sans-serif"

type ApplicationFields = {
  name: string
  email: string
  phone: string
  position: string
  intro: string
  resumeName: string
  receivedAt: string
}

const buildEmailHtml = (f: ApplicationFields) => {
  const field = (labelKo: string, value: string, isLast = false) => `
    <tr>
      <td style="padding:22px 0;${isLast ? "" : "border-bottom:1px solid #ededee;"}">
        <p style="margin:0 0 7px;font-family:${FONT_STACK};font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#a2a6b0;">${labelKo}</p>
        <div style="font-family:${FONT_STACK};font-size:16px;font-weight:400;line-height:1.7;color:#15181f;">${value}</div>
      </td>
    </tr>`

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8" /><meta name="color-scheme" content="light only" /><title>새 지원서</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f3;padding:48px 16px;">
    <tr><td align="center">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background-color:#ffffff;border:1px solid #eaeaec;">
        <tr><td style="height:3px;background-color:#03081c;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:44px 48px 0;">
          <p style="margin:0;font-family:${FONT_STACK};font-size:14px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:#03081c;">GENIEIN</p>
          <p style="margin:18px 0 0;font-family:${FONT_STACK};font-size:24px;font-weight:700;color:#15181f;">새 지원서가 접수되었습니다</p>
          <p style="margin:8px 0 0;font-family:${FONT_STACK};font-size:13px;color:#8b8f99;">${escapeHtml(f.receivedAt)}</p>
        </td></tr>
        <tr><td style="padding:20px 48px 44px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${field("지원 포지션", escapeHtml(f.position))}
            ${field("성명", escapeHtml(f.name))}
            ${field("이메일", `<a href="mailto:${escapeHtml(f.email)}" style="color:#15181f;text-decoration:none;border-bottom:1px solid #d2d4da;">${escapeHtml(f.email)}</a>`)}
            ${field("연락처", escapeHtml(f.phone))}
            ${field("자기소개", escapeHtml(f.intro).replace(/\n/g, "<br />"))}
            ${field("이력서 파일", escapeHtml(f.resumeName), true)}
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

const buildEmailText = (f: ApplicationFields) =>
  [
    "새 지원서가 접수되었습니다",
    f.receivedAt,
    "",
    `지원 포지션: ${f.position}`,
    `성명: ${f.name}`,
    `이메일: ${f.email}`,
    `연락처: ${f.phone}`,
    "",
    "자기소개:",
    f.intro,
    "",
    `이력서 파일: ${f.resumeName}`,
  ].join("\n")

export async function POST(request: Request) {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 })
  }

  const str = (key: string) => {
    const value = form.get(key)
    return typeof value === "string" ? value.trim() : ""
  }

  const name = str("name")
  const email = str("email")
  const phone = str("phone")
  const intro = str("intro")
  const position = str("position") || "일반 지원"
  const consent = str("consent") === "true"
  const resume = form.get("resume")

  if (!name || !email || !phone || !intro) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 })
  }
  // 동의 없이 들어온 지원서는 받지 않는다. 클라이언트에서 이미 막지만
  // 여기서 한 번 더 본다 — 동의가 빠진 개인정보는 처리 근거가 없다.
  if (!consent) {
    return NextResponse.json({ error: "CONSENT_REQUIRED" }, { status: 400 })
  }
  if (!(resume instanceof File) || resume.size === 0) {
    return NextResponse.json({ error: "RESUME_REQUIRED" }, { status: 400 })
  }
  if (resume.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "RESUME_TOO_LARGE" }, { status: 400 })
  }
  const lower = resume.name.toLowerCase()
  if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return NextResponse.json({ error: "RESUME_TYPE_NOT_ALLOWED" }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const recipients = (process.env.CAREERS_TO_EMAIL || process.env.CONTACT_TO_EMAIL || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  const from = process.env.CONTACT_FROM_EMAIL || "onboarding@resend.dev"

  if (!apiKey || recipients.length === 0) {
    console.error(
      "[careers] Missing email configuration: RESEND_API_KEY and/or CAREERS_TO_EMAIL are not set.",
    )
    return NextResponse.json({ error: "EMAIL_NOT_CONFIGURED" }, { status: 500 })
  }

  const receivedAt = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date())

  const fields: ApplicationFields = {
    name,
    email,
    phone,
    position,
    intro,
    resumeName: resume.name,
    receivedAt,
  }

  const attachment = Buffer.from(await resume.arrayBuffer()).toString("base64")

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        reply_to: email,
        subject: `[지원] ${position} · ${name}`,
        html: buildEmailHtml(fields),
        text: buildEmailText(fields),
        attachments: [{ filename: resume.name, content: attachment }],
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      console.error("[careers] Resend send failed:", res.status, detail)
      return NextResponse.json({ error: "SEND_FAILED" }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[careers] Resend request error:", err)
    return NextResponse.json({ error: "SEND_FAILED" }, { status: 502 })
  }
}

import { NextResponse } from "next/server"

type ContactPayload = {
  name?: string
  email?: string
  phone?: string
  org?: string
  message?: string
  inquiryType?: string
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

type EmailFields = {
  name: string
  email: string
  phone: string
  org: string
  inquiryType: string
  message: string
  receivedAt: string
}

const FONT_STACK =
  "'Noto Sans KR','Apple SD Gothic Neo','Helvetica Neue',Arial,sans-serif"

const buildEmailHtml = ({
  name,
  email,
  phone,
  org,
  inquiryType,
  message,
  receivedAt,
}: EmailFields) => {
  // Editorial definition list — small letter-spaced label, generous value, hairline divider.
  const field = (labelKo: string, labelEn: string, value: string, isLast = false) => `
    <tr>
      <td style="padding:22px 0;${isLast ? "" : "border-bottom:1px solid #ededee;"}">
        <p style="margin:0 0 7px;font-family:${FONT_STACK};font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#a2a6b0;">${labelKo} <span style="color:#c7cad2;">${labelEn}</span></p>
        <div style="font-family:${FONT_STACK};font-size:16px;font-weight:400;line-height:1.7;color:#15181f;">${value}</div>
      </td>
    </tr>`

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <title>새 문의</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f3;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f3;padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background-color:#ffffff;border:1px solid #eaeaec;">
          <!-- Top hairline accent -->
          <tr><td style="height:3px;background-color:#03081c;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Masthead -->
          <tr>
            <td style="padding:44px 48px 0;">
              <p style="margin:0;font-family:${FONT_STACK};font-size:14px;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:#03081c;">GENIEIN</p>
              <p style="margin:8px 0 0;font-family:${FONT_STACK};font-size:11px;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:#a2a6b0;">Contact Inquiry</p>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding:30px 48px 0;">
              <h1 style="margin:0;font-family:${FONT_STACK};font-size:24px;font-weight:700;letter-spacing:-0.3px;line-height:1.4;color:#0e1118;">새로운 문의가 도착했습니다</h1>
              <p style="margin:12px 0 0;font-family:${FONT_STACK};font-size:13px;font-weight:400;line-height:1.6;color:#6b7180;">${escapeHtml(receivedAt)} 접수 · 문의 유형 <span style="color:#15181f;font-weight:600;">${escapeHtml(inquiryType)}</span></p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:28px 48px 0;"><div style="border-top:1px solid #0e1118;font-size:0;line-height:0;">&nbsp;</div></td></tr>

          <!-- Details -->
          <tr>
            <td style="padding:6px 48px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${field("이름", "Name", escapeHtml(name))}
                ${field("이메일", "Email", `<a href="mailto:${escapeHtml(email)}" style="color:#15181f;text-decoration:none;border-bottom:1px solid #d2d4da;">${escapeHtml(email)}</a>`)}
                ${field("연락처", "Phone", escapeHtml(phone))}
                ${field("소속", "Organization", escapeHtml(org))}
                ${field("문의 내용", "Message", escapeHtml(message).replace(/\n/g, "<br/>"), true)}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:44px 48px;">
              <div style="border-top:1px solid #ededee;padding-top:22px;">
                <p style="margin:0;font-family:${FONT_STACK};font-size:12px;font-weight:600;letter-spacing:0.5px;color:#15181f;">Geniein Co., Ltd.</p>
                <p style="margin:7px 0 0;font-family:${FONT_STACK};font-size:11px;font-weight:400;line-height:1.7;color:#a2a6b0;">경기도 용인시 수지구 용구대로2790번길 7, 3층 302-179호<br/>본 메일은 Geniein 웹사이트 문의 폼을 통해 자동 발송되었습니다.</p>
                <p style="margin:14px 0 0;font-family:${FONT_STACK};font-size:11px;font-weight:400;letter-spacing:0.3px;color:#c7cad2;">© 2026 Geniein Co., Ltd. All rights reserved.</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

const buildEmailText = ({
  name,
  email,
  phone,
  org,
  inquiryType,
  message,
  receivedAt,
}: EmailFields) =>
  [
    "GENIEIN — CONTACT INQUIRY",
    "새로운 문의가 도착했습니다",
    "",
    `${receivedAt} 접수 · 문의 유형: ${inquiryType}`,
    "──────────────────────────────",
    `이름        ${name}`,
    `이메일      ${email}`,
    `연락처      ${phone}`,
    `소속        ${org}`,
    "",
    "문의 내용",
    message,
    "──────────────────────────────",
    "Geniein Co., Ltd.",
    "경기도 용인시 수지구 용구대로2790번길 7, 3층 302-179호",
    "본 메일은 Geniein 웹사이트 문의 폼을 통해 자동 발송되었습니다.",
    "© 2026 Geniein Co., Ltd. All rights reserved.",
  ].join("\n")

export async function POST(request: Request) {
  let body: ContactPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 })
  }

  const name = body.name?.trim()
  const email = body.email?.trim()
  const phone = body.phone?.trim()
  const org = body.org?.trim()
  const message = body.message?.trim()
  const inquiryType = body.inquiryType?.trim() || "-"

  // Server-side validation
  if (!name || !email || !phone || !org || !message) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_TO_EMAIL
  const from = process.env.CONTACT_FROM_EMAIL || "onboarding@resend.dev"

  // Without delivery config we cannot send — report failure so the UI shows the error state.
  if (!apiKey || !to) {
    console.error(
      "[contact] Missing email configuration: RESEND_API_KEY and/or CONTACT_TO_EMAIL are not set.",
    )
    return NextResponse.json({ error: "EMAIL_NOT_CONFIGURED" }, { status: 500 })
  }

  const receivedAt = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date())

  const html = buildEmailHtml({ name, email, phone, org, inquiryType, message, receivedAt })
  const text = buildEmailText({ name, email, phone, org, inquiryType, message, receivedAt })

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `[문의] ${name} · ${inquiryType}`,
        html,
        text,
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      console.error("[contact] Resend send failed:", res.status, detail)
      return NextResponse.json({ error: "SEND_FAILED" }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[contact] Resend request error:", err)
    return NextResponse.json({ error: "SEND_FAILED" }, { status: 502 })
  }
}

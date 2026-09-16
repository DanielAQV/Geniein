/**
 * GNOM 개인정보 처리방침 본문 — Google API 제한적 범위(restricted scope) 검증용.
 *
 * geniein.com/privacy(회사 채용·문의용)와 달리, 이 문서는 GNOM 서비스의 개인정보
 * 처리를 단독으로 다룬다. Google OAuth 클라이언트 검증(consent screen verification)에서
 * 공개 정책 URL(privacy policy)로 제출하는 페이지다.
 *
 * GNOM: 이용자가 자신의 Google 계정(캘린더·Gmail·Drive)을 연결해 쓰는 AI 비서.
 * Google API에서 수신한 데이터는 세션 처리 후 즉시 파기하며, AI 요약·응답 생성은
 * Anthropic에 위탁한다(제5조).
 *
 * ⚠ 법률 검토 전 초안. 아래 값은 확정 전이므로 제출 전에 반드시 확인할 것:
 *   - GNOM_EFFECTIVE_DATE (시행일)
 *   - 제2조 처리 범위는 실제 OAuth 클라이언트가 요청하는 스코프와 일치해야 한다.
 *   - 제5·6조 위탁 표는 실제 이용 중인 제공사와 일치해야 한다.
 *
 * **한국어(kr)가 정본이다.** en / vn 은 참고용 번역이고, 해석이 갈리면 한국어가 우선한다.
 */

import {
  Localized,
  PrivacySection,
  privacyOfficer,
} from "./privacy"

export { privacyOfficer }

/** 공개 시점에 맞춰 수정할 것. */
export const GNOM_EFFECTIVE_DATE = "2026-09-15"

export const gnomIntro: Localized = {
  kr: "주식회사 지니인(이하 '회사')이 운영하는 GNOM 서비스(이하 'GNOM')는 이용자가 본인의 Google 계정(캘린더·Gmail·Drive)을 연결하여 일정·메일 요약, 일정 안내·알림, 문서 검색·요약 등 AI 비서 기능을 제공합니다. 회사는 개인정보 보호법 제30조에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.",
  en: "GNOM, operated by Geniein Co., Ltd. (the \"Company\"), is an AI assistant that lets users connect their own Google account (Calendar, Gmail, Drive) to receive AI assistant features such as event and email summaries, schedule alerts and reminders, and document search and summarization. Consistent with Article 30 of the Personal Information Protection Act of the Republic of Korea, the Company establishes and discloses this Privacy Policy in order to protect users' personal information and to handle related grievances promptly.",
  vn: "GNOM do Công ty TNHH Geniein (\"Công ty\") vận hành là trợ lý AI cho phép người dùng kết nối tài khoản Google (Lịch, Gmail, Drive) để sử dụng các tính năng như tóm tắt lịch trình và email, nhắc lịch, tìm kiếm và tóm tắt tài liệu. Theo Điều 30 của Luật Bảo vệ Thông tin Cá nhân Hàn Quốc, Công ty thiết lập và công bố Chính sách Bảo mật này nhằm bảo vệ thông tin cá nhân của người dùng và xử lý kịp thời các khiếu nại liên quan.",
}

export const gnomLanguageNote: Localized = {
  kr: "본 방침은 한국어본을 정본으로 합니다. 영어·베트남어본은 이해를 돕기 위한 참고 번역이며, 내용이 서로 다를 경우 한국어본이 우선합니다.",
  en: "The Korean version of this policy is the governing text. The English and Vietnamese versions are reference translations provided for convenience; in case of any discrepancy, the Korean version prevails.",
  vn: "Bản tiếng Hàn của chính sách này là bản gốc có hiệu lực. Bản tiếng Anh và tiếng Việt là bản dịch tham khảo; nếu có khác biệt, bản tiếng Hàn được ưu tiên áp dụng.",
}

const L = (kr: string, en: string, vn: string): Localized => ({ kr, en, vn })

export const gnomSections: PrivacySection[] = [
  {
    heading: L("제1조 (개인정보의 처리 목적)", "Article 1. Purposes of Processing", "Điều 1. Mục đích xử lý"),
    paragraphs: [
      L(
        "회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행합니다.",
        "The Company processes personal information for the purposes below. Personal information is not used for any purpose other than those stated; if the purpose changes, the Company will take necessary measures, including obtaining separate consent under Article 18 of the Act.",
        "Công ty xử lý thông tin cá nhân cho các mục đích dưới đây. Thông tin cá nhân không được sử dụng ngoài các mục đích đã nêu; nếu mục đích thay đổi, Công ty sẽ thực hiện các biện pháp cần thiết, bao gồm xin sự đồng ý riêng.",
      ),
    ],
    bullets: [
      L(
        "GNOM 서비스 제공: 일정·메일 요약, 일정 안내·알림, 문서 검색·요약 등 AI 비서 기능 제공",
        "Providing the GNOM service: delivering AI assistant features such as event and email summaries, schedule alerts and reminders, and document search and summarization",
        "Cung cấp dịch vụ GNOM: thực hiện các tính năng trợ lý AI như tóm tắt lịch trình và email, nhắc lịch, tìm kiếm và tóm tắt tài liệu",
      ),
      L(
        "Google 계정 연동: OAuth 인증을 통한 캘린더·Gmail·Drive 접근 권한 부여 및 연결 상태 관리",
        "Google account connection: granting access to Calendar, Gmail, and Drive through OAuth authentication and managing the connection status",
        "Kết nối tài khoản Google: cấp quyền truy cập Lịch, Gmail, Drive thông qua xác thực OAuth và quản lý trạng thái kết nối",
      ),
      L(
        "AI 요약·응답 생성: 이용자의 요청에 따른 일정·메일·문서 요약과 응답 생성(제5조의 위탁에 따라 처리)",
        "AI summarization and responses: summarizing events, emails, and documents and generating responses at the user's request (processed through consignees under Article 5)",
        "Tính năng tóm tắt và phản hồi AI: tóm tắt lịch, email, tài liệu và tạo phản hồi theo yêu cầu của người dùng (xử lý thông qua bên nhận ủy thác tại Điều 5)",
      ),
      L(
        "서비스 운영 및 보안: 접속 기록 보관을 통한 안정적인 서비스 운영과 부정 이용 방지",
        "Service operation and security: maintaining stable service and preventing abuse through retention of access logs",
        "Vận hành và bảo mật dịch vụ: duy trì dịch vụ ổn định và ngăn chặn lạm dụng thông qua lưu giữ nhật ký truy cập",
      ),
    ],
  },
  {
    heading: L("제2조 (처리하는 개인정보의 항목 및 수집 방법)", "Article 2. Items Collected and Methods of Collection", "Điều 2. Các mục thu thập và phương thức thu thập"),
    table: {
      columns: [
        L("구분", "Category", "Phân loại"),
        L("수집 항목", "Items collected", "Mục thu thập"),
        L("수집 방법", "Method", "Phương thức"),
      ],
      rows: [
        [
          L("Google 캘린더", "Google Calendar", "Google Lịch"),
          L("일정 제목, 일시, 위치, 참석자, 설명 등 일정 정보(메타데이터)", "Event metadata such as title, time, location, attendees, and description", "Thông tin lịch (siêu dữ liệu) như tiêu đề, thời gian, địa điểm, người tham dự, mô tả"),
          L("Google Calendar API — 이용자의 Google 계정 OAuth 연결", "Google Calendar API, via the user's OAuth connection", "Google Calendar API — thông qua kết nối OAuth tài khoản Google của người dùng"),
        ],
        [
          L("Google Gmail", "Google Gmail", "Google Gmail"),
          L("메일 제목, 발신자, 수신·발송 시각 등 메타데이터. 이용자가 명시적으로 요청한 메일의 경우 본문 내용", "Email metadata such as subject, sender, and timestamps. For emails the user explicitly requests, the message body", "Siêu dữ liệu email như tiêu đề, người gửi, thời gian. Nội dung thư chỉ khi người dùng yêu cầu cụ thể"),
          L("Gmail API — 이용자의 Google 계정 OAuth 연결", "Gmail API, via the user's OAuth connection", "Gmail API — thông qua kết nối OAuth tài khoản Google của người dùng"),
        ],
        [
          L("Google Drive", "Google Drive", "Google Drive"),
          L("파일명, 파일 유형, 수정 시각 등 파일 메타데이터. 이용자가 명시적으로 요청한 파일의 경우 내용", "File metadata such as file name, type, and modification time. File content only when explicitly requested by the user", "Siêu dữ liệu tệp như tên tệp, loại tệp, thời gian chỉnh sửa. Nội dung tệp chỉ khi người dùng yêu cầu cụ thể"),
          L("Google Drive API — 이용자의 Google 계정 OAuth 연결", "Google Drive API, via the user's OAuth connection", "Google Drive API — thông qua kết nối OAuth tài khoản Google của người dùng"),
        ],
        [
          L("계정 정보", "Account information", "Thông tin tài khoản"),
          L("Google 계정 식별 정보(이메일 주소, 이름)", "Google account identifier (email address, name)", "Thông tin nhận dạng tài khoản Google (địa chỉ email, tên)"),
          L("OAuth 인증 과정에서 수집", "Collected during OAuth authentication", "Thu thập trong quá trình xác thực OAuth"),
        ],
        [
          L("자동 수집", "Automatically collected", "Thu thập tự động"),
          L("접속 IP 주소, 브라우저·기기 정보, 방문 일시, 이용 기록", "IP address, browser and device information, visit timestamps, usage history", "Địa chỉ IP, thông tin trình duyệt và thiết bị, thời gian truy cập, nhật ký sử dụng"),
          L("서비스 이용 과정에서 자동 생성", "Generated automatically while using the service", "Tự động tạo ra trong quá trình sử dụng dịch vụ"),
        ],
      ],
    },
    paragraphs: [
      L(
        "회사는 Google API를 통해 사상·신념, 노동조합 가입, 건강, 성생활 등 민감정보를 의도적으로 수집하지 않습니다. 이용자는 Google 계정 연결 시 GNOM에 접근을 허용할 스코프(범위)를 별도로 확인·선택할 수 있으며, 접근 권한은 연결 시점에 명시한 범위로 한정됩니다.",
        "The Company does not intentionally collect sensitive information (such as beliefs, union membership, health, or sexual life) through the Google APIs. At the time of connection, users can review and choose which scopes (access ranges) to grant to GNOM; access is limited to the scope stated at the time of connection.",
        "Công ty không cố ý thu thập thông tin nhạy cảm (tín ngưỡng, tư cách thành viên công đoàn, sức khỏe, đời sống tình dục) thông qua Google API. Người dùng có thể xem và chọn phạm vi truy cập cấp cho GNOM khi kết nối; quyền truy cập chỉ giới hạn trong phạm vi đã nêu tại thời điểm kết nối.",
      ),
      L(
        "이용자는 Google 데이터의 수집·이용에 동의하지 않을 권리가 있으며, 이 경우 일정·메일 요약 등 Google 연동 기반 기능의 이용이 제한될 수 있습니다.",
        "Users may decline to consent to the collection and use of their Google data; in that case, use of Google-connected features such as event and email summaries may be limited.",
        "Người dùng có quyền từ chối đồng ý với việc thu thập và sử dụng dữ liệu Google; khi đó các tính năng kết nối Google như tóm tắt lịch và email có thể bị hạn chế.",
      ),
    ],
  },
  {
    heading: L("제3조 (개인정보의 보유 및 이용 기간)", "Article 3. Retention and Use Period", "Điều 3. Thời gian lưu giữ và sử dụng"),
    paragraphs: [
      L(
        "회사는 법령에 따른 보유 기간 또는 이용자로부터 동의받은 보유 기간 내에서 개인정보를 처리·보유합니다. Google API에서 수신한 데이터는 이용자의 요청을 처리하는 동안에만 사용되며, 처리 목적이 달성되거나 보유 기간이 경과한 경우에는 지체 없이 파기합니다.",
        "The Company retains personal information within the period required by law or consented to by the user. Data received from the Google APIs is used only while processing the user's request and is destroyed without delay once the purpose is achieved or the retention period elapses.",
        "Công ty lưu giữ thông tin cá nhân trong thời hạn luật định hoặc thời hạn được người dùng đồng ý. Dữ liệu nhận từ Google API chỉ được sử dụng trong khi xử lý yêu cầu của người dùng và được hủy không chậm trễ sau khi đạt được mục đích hoặc hết thời hạn.",
      ),
    ],
    table: {
      columns: [
        L("구분", "Category", "Phân loại"),
        L("보유 기간", "Retention period", "Thời gian lưu giữ"),
      ],
      rows: [
        [
          L("Google에서 수신한 데이터(캘린더·Gmail·Drive)", "Data received from Google (Calendar, Gmail, Drive)", "Dữ liệu nhận từ Google (Lịch, Gmail, Drive)"),
          L("이용자 요청 처리 완료 시 지체 없이 파기 — 세션 내 처리 후 별도 보관하지 않음", "Destroyed without delay once the user's request is processed — handled within the session and not stored beyond it", "Hủy không chậm trễ sau khi xử lý xong yêu cầu của người dùng — xử lý trong phiên và không lưu giữ thêm"),
        ],
        [
          L("이용자가 명시적으로 요청한 메일·파일 본문", "Email and file content explicitly requested by the user", "Nội dung email và tệp được người dùng yêu cầu cụ thể"),
          L("요청된 요약·처리 완료 후 지체 없이 파기", "Destroyed without delay once the requested summary or processing is complete", "Hủy không chậm trễ sau khi hoàn tất tóm tắt hoặc xử lý được yêu cầu"),
        ],
        [
          L("계정 연동 정보(접근·갱신 토큰 등)", "Account connection information (access and refresh tokens, etc.)", "Thông tin kết nối tài khoản (token truy cập, token làm mới v.v.)"),
          L("연결이 유지되는 기간 동안 보관, 연동 해제 또는 동의 철회 시 지체 없이 파기", "Retained while the connection is active; destroyed without delay upon disconnection or withdrawal of consent", "Lưu giữ trong thời gian kết nối; hủy không chậm trễ khi ngắt kết nối hoặc rút lại sự đồng ý"),
        ],
        [
          L("자동 수집 정보", "Automatically collected information", "Thông tin thu thập tự động"),
          L("수집일로부터 1년", "1 year from the date of collection", "1 năm kể từ ngày thu thập"),
        ],
      ],
    },
  },
  {
    heading: L("제4조 (개인정보의 제3자 제공)", "Article 4. Provision to Third Parties", "Điều 4. Cung cấp cho bên thứ ba"),
    paragraphs: [
      L(
        "회사는 이용자의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며, 이용자의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 해당하는 경우에만 제3자에게 제공합니다. 특히 Google API를 통해 수신한 정보는 제3자에게 제공하거나 판매하지 않습니다.",
        "The Company processes personal information only within the scope stated in Article 1, and provides it to third parties only where Articles 17 and 18 of the Act apply, such as with the user's consent or under specific statutory provisions. In particular, information received through the Google APIs is not provided or sold to third parties.",
        "Công ty chỉ xử lý thông tin cá nhân trong phạm vi nêu tại Điều 1 và chỉ cung cấp cho bên thứ ba khi thuộc các trường hợp quy định tại Điều 17, 18 của Luật. Cụ thể, thông tin nhận được qua Google API không được cung cấp hoặc bán cho bên thứ ba.",
      ),
    ],
  },
  {
    heading: L("제5조 (개인정보 처리업무의 위탁)", "Article 5. Consignment of Processing", "Điều 5. Ủy thác xử lý"),
    paragraphs: [
      L(
        "회사는 원활한 서비스 제공을 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다. 위탁계약 체결 시 개인정보 보호법 제26조에 따라 목적 외 처리 금지, 안전성 확보조치, 재위탁 제한 등을 계약서에 반영하고 수탁자의 처리 현황을 감독합니다. AI 요약·응답 생성을 위해 이용자의 질의 내용과 요청된 Google 데이터가 제5조의 위탁받은 업체로 전송될 수 있습니다.",
        "The Company consigns personal information processing tasks as set out below. Under Article 26 of the Act, consignment agreements include restrictions on processing beyond the stated purpose, safeguards, and limits on re-consignment, and the Company supervises the consignees. To generate AI summaries and responses, the user's queries and requested Google data may be transmitted to the consignees listed in Article 5.",
        "Công ty ủy thác các công việc xử lý thông tin cá nhân như dưới đây. Theo Điều 26 của Luật, hợp đồng ủy thác bao gồm các hạn chế về mục đích xử lý, biện pháp bảo đảm an toàn và giới hạn tái ủy thác. Để tạo bản tóm tắt và phản hồi AI, câu hỏi của người dùng và dữ liệu Google được yêu cầu có thể được gửi tới các bên nhận ủy thác nêu tại Điều 5.",
      ),
    ],
    table: {
      columns: [
        L("수탁자", "Consignee", "Bên nhận ủy thác"),
        L("위탁 업무 내용", "Consigned task", "Nội dung ủy thác"),
      ],
      rows: [
        [
          L("Anthropic PBC", "Anthropic PBC", "Anthropic PBC"),
          L("AI 요약·응답 생성 등 LLM 처리(이용자 질의와 함께 요청된 Google 데이터 전송 포함)", "LLM processing such as AI summarization and response generation (including transmission of the user's query and requested Google data)", "Xử lý mô hình ngôn ngữ lớn (LLM) như tóm tắt và phản hồi AI (bao gồm truyền câu hỏi của người dùng và dữ liệu Google được yêu cầu)"),
        ],
        [
          L("Amazon Web Services, Inc.", "Amazon Web Services, Inc.", "Amazon Web Services, Inc."),
          L("서버 운영 및 데이터 보관", "Server operation and data storage", "Vận hành máy chủ và lưu trữ dữ liệu"),
        ],
      ],
    },
  },
  {
    heading: L("제6조 (개인정보의 국외 이전)", "Article 6. Cross-Border Transfer", "Điều 6. Chuyển giao ra nước ngoài"),
    paragraphs: [
      L(
        "회사는 서비스 제공을 위하여 아래와 같이 개인정보를 국외로 이전(보관 포함)하거나, 국외에 저장된 데이터를 수신하여 처리하고 있습니다. 이용자는 국외 이전을 거부할 수 있으며, 거부하는 경우 AI 요약 등 관련 기능 이용이 제한될 수 있습니다.",
        "For the provision of its services, the Company transfers (including stores) personal information overseas, or receives and processes data stored overseas, as described below. Users may refuse the cross-border transfer; in that case, use of related features such as AI summaries may be limited.",
        "Để cung cấp dịch vụ, Công ty chuyển giao (bao gồm lưu trữ) thông tin cá nhân ra nước ngoài hoặc tiếp nhận và xử lý dữ liệu được lưu trữ ở nước ngoài như mô tả dưới đây. Người dùng có thể từ chối việc chuyển giao này; khi đó các tính năng liên quan như tóm tắt AI có thể bị hạn chế.",
      ),
    ],
    table: {
      columns: [
        L("이전받는 자 / 국가", "Recipient / Country", "Bên nhận / Quốc gia"),
        L("이전 항목 및 목적", "Items and purpose", "Mục và mục đích"),
        L("이전 일시 및 방법", "Timing and method", "Thời điểm và phương thức"),
      ],
      rows: [
        [
          L("Anthropic PBC / 미국", "Anthropic PBC / United States", "Anthropic PBC / Hoa Kỳ"),
          L("이용자 질의 및 요청된 Google 데이터(일정·메일·파일), 요약·응답 결과 — AI 요약·응답 생성을 위하여", "User queries and requested Google data (events, emails, files) and summary/response output — for AI summarization and response generation", "Câu hỏi của người dùng và dữ liệu Google được yêu cầu (lịch, email, tệp), kết quả tóm tắt/phản hồi — để tạo tóm tắt và phản hồi AI"),
          L("이용자 요청 시점에 네트워크를 통해 전송", "Transmitted over the network at the time of the user's request", "Truyền qua mạng tại thời điểm người dùng yêu cầu"),
        ],
        [
          L("Amazon Web Services, Inc. / 미국", "Amazon Web Services, Inc. / United States", "Amazon Web Services, Inc. / Hoa Kỳ"),
          L("서버 운영 및 보관에 필요한 데이터 — 서비스 운영", "Data necessary for server operation and storage — service operation", "Dữ liệu cần thiết cho vận hành máy chủ và lưu trữ — vận hành dịch vụ"),
          L("서비스 이용 시점에 네트워크를 통해 전송", "Transmitted over the network at the time of use", "Truyền qua mạng tại thời điểm sử dụng"),
        ],
        [
          L("Google LLC / 미국 등", "Google LLC / United States and other locations", "Google LLC / Hoa Kỳ và các nơi khác"),
          L("이용자가 연결한 캘린더·Gmail·Drive 데이터는 Google 서버에 보관되어 있으며, 회사는 API 호출을 통해 이를 수신 — GNOM 기능 제공", "Calendar, Gmail, and Drive data connected by the user is stored on Google servers; the Company receives it through API calls — to provide GNOM features", "Dữ liệu Lịch, Gmail, Drive mà người dùng kết nối được lưu trên máy chủ Google; Công ty nhận dữ liệu qua các lệnh gọi API — để cung cấp tính năng GNOM"),
          L("API 호출 시점에 Google 서버에서 수신", "Received from Google servers at the time of API calls", "Nhận từ máy chủ Google tại thời điểm gọi API"),
        ],
      ],
    },
  },
  {
    heading: L("제7조 (개인정보의 파기)", "Article 7. Destruction of Personal Information", "Điều 7. Hủy thông tin cá nhân"),
    paragraphs: [
      L(
        "회사는 보유 기간이 경과하거나 처리 목적이 달성되어 개인정보가 불필요하게 되었을 때에는 지체 없이(사유 발생일로부터 5일 이내) 해당 개인정보를 파기합니다. Google API에서 수신한 데이터는 이용자의 요청 처리가 완료되는 즉시 삭제됩니다.",
        "When the retention period expires or the purpose of processing is achieved and the personal information is no longer necessary, the Company destroys it without delay (within five days of the arising of such cause). Data received from the Google APIs is deleted immediately once the user's request is processed.",
        "Khi hết thời hạn lưu giữ hoặc mục đích xử lý đã đạt được, Công ty hủy thông tin cá nhân không chậm trễ (trong vòng 5 ngày kể từ khi phát sinh lý do). Dữ liệu nhận từ Google API được xóa ngay sau khi xử lý xong yêu cầu của người dùng.",
      ),
    ],
    bullets: [
      L(
        "전자적 파일 형태의 정보: 복원이 불가능한 방법으로 영구 삭제",
        "Information in electronic file form: permanently deleted by a method that renders recovery impossible",
        "Thông tin dạng tệp điện tử: xóa vĩnh viễn bằng phương pháp không thể khôi phục",
      ),
      L(
        "Google API 접근 토큰: 연동 해제 시 즉시 폐기",
        "Google API access tokens: revoked immediately upon disconnection",
        "Token truy cập Google API: hủy ngay khi ngắt kết nối",
      ),
    ],
  },
  {
    heading: L("제8조 (정보주체와 법정대리인의 권리·의무 및 행사 방법)", "Article 8. Rights of Data Subjects and How to Exercise Them", "Điều 8. Quyền của chủ thể dữ liệu và cách thực hiện"),
    paragraphs: [
      L(
        "이용자는 회사에 대해 언제든지 개인정보 열람, 정정, 삭제, 처리정지 및 동의 철회를 요구할 수 있습니다. 권리 행사는 제11조의 개인정보 보호책임자에게 서면, 전화 또는 이메일로 하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.",
        "Users may at any time request access to, correction of, deletion of, or suspension of processing of their personal information, and may withdraw consent. Such requests may be made to the Privacy Officer identified in Article 11 in writing, by telephone, or by email, and the Company will act on them without delay.",
        "Người dùng có thể yêu cầu truy cập, chỉnh sửa, xóa, tạm dừng xử lý thông tin cá nhân và rút lại sự đồng ý bất cứ lúc nào. Yêu cầu có thể gửi tới Người phụ trách tại Điều 11 bằng văn bản, điện thoại hoặc email.",
      ),
      L(
        "이용자는 언제든지 Google 계정의 연결된 앱(연결된 서비스) 설정에서 GNOM의 Google 데이터 접근 권한을 해제할 수 있습니다. 연동을 해제하면 회사는 더 이상 해당 Google 데이터에 접근하지 못하며, 저장된 계정 연동 정보를 지체 없이 파기합니다. 일부 Google 데이터의 삭제는 사용자가 직접 Google 계정에서 처리할 수도 있습니다.",
        "Users may revoke GNOM's access to their Google data at any time in their Google account's connected-app (connected-services) settings. Once disconnected, the Company can no longer access the relevant Google data and destroys stored account connection information without delay. Users may also delete some Google data directly in their Google account.",
        "Người dùng có thể hủy quyền truy cập dữ liệu Google của GNOM bất cứ lúc nào trong phần cài đặt ứng dụng (dịch vụ) đã kết nối của tài khoản Google. Khi ngắt kết nối, Công ty không thể truy cập dữ liệu Google liên quan và hủy thông tin kết nối tài khoản không chậm trễ. Người dùng cũng có thể tự xóa một số dữ liệu Google trực tiếp trong tài khoản Google.",
      ),
    ],
  },
  {
    heading: L("제9조 (개인정보의 안전성 확보 조치)", "Article 9. Security Measures", "Điều 9. Biện pháp bảo đảm an toàn"),
    bullets: [
      L("개인정보 취급 담당자의 최소화 및 접근 권한 관리", "Minimizing the number of personnel handling personal information and managing access rights", "Giảm thiểu nhân sự xử lý và quản lý quyền truy cập"),
      L("개인정보 처리 시스템에 대한 접근 통제 및 접속 기록 보관", "Access control over processing systems and retention of access logs", "Kiểm soát truy cập hệ thống và lưu giữ nhật ký truy cập"),
      L("Google API 접근 토큰의 암호화 저장 및 최소 권한 원칙 준수", "Encrypted storage of Google API access tokens and adherence to the principle of least privilege", "Mã hóa token truy cập Google API và tuân thủ nguyên tắc đặc quyền tối thiểu"),
      L("개인정보의 암호화 저장 및 전송 구간 암호화(HTTPS)", "Encrypted storage of personal information and encryption in transit (HTTPS)", "Mã hóa khi lưu trữ và mã hóa đường truyền (HTTPS)"),
      L("보안 프로그램 설치 및 주기적 갱신·점검", "Installation of security software with periodic updates and inspections", "Cài đặt phần mềm bảo mật, cập nhật và kiểm tra định kỳ"),
    ],
  },
  {
    heading: L("제10조 (Google API 서비스 사용자 데이터 정책의 준수)", "Article 10. Compliance with the Google API Services User Data Policy", "Điều 10. Tuân thủ Chính sách Dữ liệu Người dùng Dịch vụ Google API"),
    paragraphs: [
      L(
        "회사가 Google API로부터 수신한 정보를 다른 애플리케이션에 사용하거나 이전하는 경우, Google API 서비스 사용자 데이터 정책(Google API Services User Data Policy)의 제한적 사용(Limited Use) 요건을 포함한 해당 정책의 모든 요건을 준수합니다. Google API를 통해 수집한 데이터는 이용자가 요청하고 활성화한 GNOM 기능을 제공하기 위한 목적으로만 사용되며, 광고 제공 또는 광고 영향 측정, 제3자에게의 판매, 기능 제공에 필요한 범위를 넘는 행태 정보 기반 개인 맞춤(프로파일링)에는 사용되지 않습니다.",
        "The Company's use and transfer of information received from Google APIs to any other app will adhere to the Google API Services User Data Policy, including the Limited Use requirements. Data collected through the Google APIs is used solely to provide the GNOM features the user has requested and activated; it is not used to serve ads, to measure the impact of ads, or for measurement services, is not sold to third parties, and is not used for behavioral or personalized profiling beyond what is necessary to provide those features.",
        "Việc Công ty sử dụng và chuyển giao thông tin nhận được từ Google API cho bất kỳ ứng dụng nào khác sẽ tuân thủ Chính sách Dữ liệu Người dùng của Dịch vụ Google API, bao gồm các yêu cầu về Sử dụng hạn chế. Dữ liệu thu thập qua Google API chỉ được dùng để cung cấp các tính năng GNOM mà người dùng đã yêu cầu và kích hoạt; không dùng để phát quảng cáo, đo lường tác động quảng cáo hoặc cho dịch vụ đo lường, không bán cho bên thứ ba và không dùng để lập hồ sơ hành vi hoặc cá nhân hóa ngoài phạm vi cần thiết để cung cấp các tính năng đó.",
      ),
    ],
    bullets: [
      L(
        "광고 제공·광고 영향 측정 목적의 미사용: Google 데이터는 광고 제공, 광고 영향 측정 또는 측정 서비스에 사용하지 않습니다.",
        "Not used for advertising: Google data is not used to serve ads, to measure the impact of ads, or for measurement services.",
        "Không dùng cho quảng cáo: dữ liệu Google không được dùng để phát quảng cáo, đo lường tác động quảng cáo hoặc cho dịch vụ đo lường.",
      ),
      L(
        "판매 및 행태 정보 분석 금지: Google 데이터를 제3자에게 판매하거나, 계약된 기능 제공에 필요한 범위를 넘는 행태 정보 기반 개인화에 사용하지 않습니다.",
        "No sale or behavioral profiling: Google data is not sold to third parties and is not used for behavioral personalization beyond what is required to provide the contracted functionalities.",
        "Không bán hoặc lập hồ sơ hành vi: dữ liệu Google không bị bán cho bên thứ ba và không được dùng để cá nhân hóa theo hành vi ngoài phạm vi cần thiết để cung cấp các chức năng đã thỏa thuận.",
      ),
      L(
        "목적 외 사용 금지: Google 데이터는 이용자가 연결 시 동의한 범위를 벗어나 처리하지 않습니다.",
        "No processing beyond the stated purpose: Google data is processed only within the scope the user consented to at the time of connection.",
        "Không xử lý ngoài mục đích đã nêu: dữ liệu Google chỉ được xử lý trong phạm vi người dùng đồng ý tại thời điểm kết nối.",
      ),
      L(
        "접근 해제 방법: 이용자는 Google 계정의 연결된 앱 설정에서 언제든지 GNOM의 접근 권한을 해제할 수 있습니다.",
        "How to revoke access: users may revoke GNOM's access at any time in the connected-app settings of their Google account.",
        "Cách hủy quyền truy cập: người dùng có thể hủy quyền truy cập của GNOM bất cứ lúc nào trong phần cài đặt ứng dụng đã kết nối của tài khoản Google.",
      ),
    ],
  },
  {
    heading: L("제11조 (개인정보 보호책임자)", "Article 11. Privacy Officer", "Điều 11. Người phụ trách bảo vệ thông tin cá nhân"),
    paragraphs: [
      L(
        "회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다. 이용자는 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의를 아래로 문의하실 수 있습니다.",
        "The Company designates the following Privacy Officer to take overall responsibility for personal information processing and to handle complaints and remedies from users. Users may direct any privacy-related inquiry to the contact below.",
        "Công ty chỉ định Người phụ trách sau đây để chịu trách nhiệm chung về việc xử lý thông tin cá nhân và giải quyết khiếu nại của người dùng.",
      ),
    ],
  },
  {
    heading: L("제12조 (권익침해 구제 방법)", "Article 12. Remedies for Infringement of Rights", "Điều 12. Biện pháp khắc phục khi quyền bị xâm phạm"),
    paragraphs: [
      L(
        "이용자는 개인정보 침해로 인한 구제를 받기 위하여 아래 기관에 분쟁 해결이나 상담 등을 신청할 수 있습니다.",
        "Users may apply to the following organizations for dispute resolution or consultation regarding infringement of personal information.",
        "Người dùng có thể liên hệ các cơ quan sau để giải quyết tranh chấp hoặc tư vấn.",
      ),
    ],
    bullets: [
      L("개인정보분쟁조정위원회: (국번없이) 1833-6972 / www.kopico.go.kr", "Personal Information Dispute Mediation Committee: 1833-6972 / www.kopico.go.kr", "Ủy ban Hòa giải Tranh chấp Thông tin Cá nhân: 1833-6972 / www.kopico.go.kr"),
      L("개인정보침해신고센터: (국번없이) 118 / privacy.kisa.or.kr", "Privacy Infringement Report Center: 118 / privacy.kisa.or.kr", "Trung tâm Tiếp nhận Báo cáo Xâm phạm: 118 / privacy.kisa.or.kr"),
      L("대검찰청 사이버범죄수사단: (국번없이) 1301 / www.spo.go.kr", "Supreme Prosecutors' Office Cybercrime Investigation Unit: 1301 / www.spo.go.kr", "Đơn vị Điều tra Tội phạm Mạng: 1301 / www.spo.go.kr"),
      L("경찰청 사이버수사국: (국번없이) 182 / ecrm.police.go.kr", "National Police Agency Cyber Bureau: 182 / ecrm.police.go.kr", "Cục Điều tra Mạng Cảnh sát Quốc gia: 182 / ecrm.police.go.kr"),
    ],
  },
  {
    heading: L("제13조 (개인정보 처리방침의 변경)", "Article 13. Changes to This Policy", "Điều 13. Thay đổi chính sách"),
    paragraphs: [
      L(
        "이 개인정보 처리방침은 시행일로부터 적용됩니다. 법령·정책 또는 보안기술의 변경에 따라 내용의 추가·삭제 및 수정이 있을 시에는 변경사항의 시행 7일 전부터 웹사이트를 통하여 고지합니다.",
        "This Privacy Policy applies from its effective date. Where content is added, deleted, or amended due to changes in law, policy, or security technology, the Company will give notice on this website from seven days before the change takes effect.",
        "Chính sách này áp dụng từ ngày có hiệu lực. Khi có bổ sung, xóa bỏ hoặc sửa đổi do thay đổi pháp luật, chính sách hoặc công nghệ bảo mật, Công ty sẽ thông báo trên trang web trước 7 ngày.",
      ),
    ],
  },
]
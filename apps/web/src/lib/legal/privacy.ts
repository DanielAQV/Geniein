/**
 * 개인정보 처리방침 본문.
 *
 * dictionary.ts 가 아니라 별도 파일에 둔 이유:
 *   ① 분량이 사전 전체와 맞먹어 사전 가독성을 해친다
 *   ② 법무 검토 대상이라 마케팅 카피와 수정 주기가 다르다
 *
 * **한국어(kr)가 정본이다.** en / vn 은 참고용 번역이고, 해석이 갈리면 한국어가 우선한다.
 * 이 원칙은 문서 안(governing_law_note)에도 명시돼 있다.
 *
 * ⚠ 법률 검토 전 초안이다. 아래 값은 확정 전이므로 공개 전에 반드시 확인할 것:
 *   - EFFECTIVE_DATE (시행일)
 *   - 보호책임자 연락처: 공개 페이지에 개인 휴대전화가 노출된다.
 *     support@geniein.com 만 남기려면 officer 의 phone 줄을 지우면 된다.
 *   - 국외 이전(제6조): AWS us-east-1(미국) 기준으로 작성했다.
 *     서울 리전(ap-northeast-2)으로 옮기면 이 조항은 통째로 삭제 가능하다.
 */

export type Localized = { kr: string; en: string; vn: string }

export type PrivacyTable = {
  columns: Localized[]
  rows: Localized[][]
}

export type PrivacySection = {
  heading: Localized
  paragraphs?: Localized[]
  bullets?: Localized[]
  table?: PrivacyTable
}

/** 공개 시점에 맞춰 수정할 것. */
export const EFFECTIVE_DATE = "2026-00-00"

export const privacyOfficer = {
  name: { kr: "변범준", en: "Byun Beom Joon", vn: "Byun Beom Joon" },
  title: { kr: "대표", en: "CEO", vn: "Giám đốc" },
  email: "support@geniein.com",
  /** 개인 휴대전화. 공개가 부담되면 이 줄만 지우면 페이지에서도 사라진다. */
  phone: "010-9024-8429",
}

export const privacyIntro: Localized = {
  kr: "주식회사 지니인(이하 '회사')은 개인정보 보호법 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.",
  en: "Geniein Co., Ltd. (the \"Company\") establishes and discloses this Privacy Policy pursuant to Article 30 of the Personal Information Protection Act of the Republic of Korea, in order to protect the personal information of data subjects and to handle related grievances promptly.",
  vn: "Công ty TNHH Geniein (\"Công ty\") thiết lập và công bố Chính sách Bảo mật này theo Điều 30 của Luật Bảo vệ Thông tin Cá nhân Hàn Quốc, nhằm bảo vệ thông tin cá nhân của chủ thể dữ liệu và xử lý kịp thời các khiếu nại liên quan.",
}

export const governingLanguageNote: Localized = {
  kr: "본 방침은 한국어본을 정본으로 합니다. 영어·베트남어본은 이해를 돕기 위한 참고 번역이며, 내용이 서로 다를 경우 한국어본이 우선합니다.",
  en: "The Korean version of this policy is the governing text. The English and Vietnamese versions are reference translations provided for convenience; in case of any discrepancy, the Korean version prevails.",
  vn: "Bản tiếng Hàn của chính sách này là bản gốc có hiệu lực. Bản tiếng Anh và tiếng Việt là bản dịch tham khảo; nếu có khác biệt, bản tiếng Hàn được ưu tiên áp dụng.",
}

const L = (kr: string, en: string, vn: string): Localized => ({ kr, en, vn })

export const privacySections: PrivacySection[] = [
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
        "문의 대응: 사업·기술 협력 문의의 접수, 확인, 회신 및 상담 이력 관리",
        "Inquiry handling: receiving, verifying, and responding to business and technical partnership inquiries, and managing consultation records",
        "Xử lý yêu cầu: tiếp nhận, xác minh, phản hồi các yêu cầu hợp tác kinh doanh, kỹ thuật và quản lý hồ sơ tư vấn",
      ),
      L(
        "채용 절차 진행: 지원자 확인, 서류·면접 전형, 전형 결과 안내",
        "Recruitment: verifying applicants, conducting document and interview screening, and communicating results",
        "Tuyển dụng: xác minh ứng viên, sàng lọc hồ sơ và phỏng vấn, thông báo kết quả",
      ),
      L(
        "인재풀 운영: 별도 동의를 받은 경우에 한하여, 향후 채용 기회 안내",
        "Talent pool: informing candidates of future openings, only where separate consent has been obtained",
        "Nguồn ứng viên: thông báo cơ hội tuyển dụng trong tương lai, chỉ khi đã có sự đồng ý riêng",
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
          L("문의하기 (필수)", "Contact form (required)", "Biểu mẫu liên hệ (bắt buộc)"),
          L("성명, 이메일 주소, 연락처, 소속 기관·기업명, 문의 유형, 문의 내용", "Name, email address, phone number, organization, inquiry type, inquiry content", "Họ tên, email, số điện thoại, tổ chức, loại yêu cầu, nội dung yêu cầu"),
          L("웹사이트 문의 폼", "Website inquiry form", "Biểu mẫu trên trang web"),
        ],
        [
          L("채용 지원 (필수)", "Job application (required)", "Ứng tuyển (bắt buộc)"),
          L("성명, 이메일 주소, 연락처, 지원 포지션, 자기소개, 이력서 파일에 포함된 정보(학력, 경력 등)", "Name, email address, phone number, position applied for, cover letter, and information contained in the résumé file (education, work history, etc.)", "Họ tên, email, số điện thoại, vị trí ứng tuyển, thư giới thiệu và thông tin trong tệp hồ sơ (học vấn, kinh nghiệm...)"),
          L("웹사이트 지원 폼 및 첨부파일", "Website application form and attachments", "Biểu mẫu ứng tuyển và tệp đính kèm"),
        ],
        [
          L("인재풀 등록 (선택)", "Talent pool (optional)", "Nguồn ứng viên (tùy chọn)"),
          L("위 채용 지원 항목과 동일", "Same items as the job application above", "Giống các mục ứng tuyển nêu trên"),
          L("지원 시 별도 동의", "Separate consent at the time of application", "Đồng ý riêng khi ứng tuyển"),
        ],
        [
          L("자동 수집", "Automatically collected", "Thu thập tự động"),
          L("접속 IP 주소, 브라우저·기기 정보, 방문 일시, 이용 페이지 기록", "IP address, browser and device information, visit timestamps, page view history", "Địa chỉ IP, thông tin trình duyệt và thiết bị, thời gian truy cập, lịch sử trang đã xem"),
          L("웹사이트 이용 과정에서 자동 생성", "Generated automatically while using the website", "Tự động tạo ra trong quá trình sử dụng trang web"),
        ],
      ],
    },
    paragraphs: [
      L(
        "회사는 사상·신념, 노동조합 가입, 건강, 성생활 등 민감정보와 주민등록번호를 수집하지 않습니다. 이력서에 이러한 정보를 자발적으로 기재하지 않도록 유의하여 주시기 바랍니다.",
        "The Company does not collect sensitive information (such as beliefs, union membership, health, or sexual life) or resident registration numbers. Please refrain from voluntarily including such information in your résumé.",
        "Công ty không thu thập thông tin nhạy cảm (tín ngưỡng, tư cách thành viên công đoàn, sức khỏe, đời sống tình dục) hoặc số đăng ký cư trú. Vui lòng không tự nguyện đưa các thông tin này vào hồ sơ.",
      ),
      L(
        "정보주체는 필수 항목의 수집·이용에 동의하지 않을 권리가 있으며, 이 경우 문의 접수 또는 채용 전형 진행이 제한될 수 있습니다. 선택 항목(인재풀 등록)에 동의하지 않더라도 지원한 채용 전형에는 어떠한 불이익도 없습니다.",
        "Data subjects may decline to consent to the collection of required items; in that case, inquiry handling or participation in the recruitment process may be limited. Declining the optional item (talent pool) results in no disadvantage whatsoever in the recruitment process applied for.",
        "Chủ thể dữ liệu có quyền từ chối đồng ý với các mục bắt buộc; khi đó việc tiếp nhận yêu cầu hoặc tham gia tuyển dụng có thể bị hạn chế. Việc từ chối mục tùy chọn (nguồn ứng viên) không gây bất kỳ bất lợi nào.",
      ),
    ],
  },
  {
    heading: L("제3조 (개인정보의 보유 및 이용 기간)", "Article 3. Retention and Use Period", "Điều 3. Thời gian lưu giữ và sử dụng"),
    paragraphs: [
      L(
        "회사는 법령에 따른 보유 기간 또는 정보주체로부터 동의받은 보유 기간 내에서 개인정보를 처리·보유합니다. 처리 목적이 달성되거나 보유 기간이 경과한 경우에는 지체 없이 파기합니다.",
        "The Company retains personal information within the period required by law or consented to by the data subject. Once the purpose is achieved or the period elapses, the information is destroyed without delay.",
        "Công ty lưu giữ thông tin cá nhân trong thời hạn luật định hoặc thời hạn được chủ thể dữ liệu đồng ý. Khi mục đích đã đạt được hoặc hết thời hạn, thông tin sẽ được hủy không chậm trễ.",
      ),
    ],
    table: {
      columns: [
        L("구분", "Category", "Phân loại"),
        L("보유 기간", "Retention period", "Thời gian lưu giữ"),
      ],
      rows: [
        [
          L("문의 내역", "Inquiry records", "Hồ sơ yêu cầu"),
          L("문의 접수일로부터 3년", "3 years from the date the inquiry is received", "3 năm kể từ ngày tiếp nhận yêu cầu"),
        ],
        [
          L("채용 지원 서류 (인재풀 미동의)", "Application documents (no talent-pool consent)", "Hồ sơ ứng tuyển (không đồng ý nguồn ứng viên)"),
          L("해당 채용 전형 종료 후 지체 없이 파기", "Destroyed without delay once the relevant recruitment process ends", "Hủy ngay sau khi quy trình tuyển dụng kết thúc"),
        ],
        [
          L("채용 지원 서류 (인재풀 동의)", "Application documents (talent-pool consent given)", "Hồ sơ ứng tuyển (đã đồng ý nguồn ứng viên)"),
          L("동의일로부터 1년 (기간 만료 전 언제든 철회 가능)", "1 year from the date of consent; withdrawable at any time before expiry", "1 năm kể từ ngày đồng ý; có thể rút lại bất cứ lúc nào"),
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
        "회사는 정보주체의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 해당하는 경우에만 제3자에게 제공합니다. 현재 회사가 정기적으로 제3자에게 제공하는 개인정보는 없습니다.",
        "The Company processes personal information only within the scope stated in Article 1, and provides it to third parties only where Articles 17 and 18 of the Act apply, such as with the data subject's consent or under specific statutory provisions. The Company currently makes no routine provision of personal information to third parties.",
        "Công ty chỉ xử lý thông tin cá nhân trong phạm vi nêu tại Điều 1 và chỉ cung cấp cho bên thứ ba khi thuộc các trường hợp quy định tại Điều 17, 18 của Luật. Hiện Công ty không cung cấp thường xuyên thông tin cá nhân cho bên thứ ba.",
      ),
    ],
  },
  {
    heading: L("제5조 (개인정보 처리업무의 위탁)", "Article 5. Consignment of Processing", "Điều 5. Ủy thác xử lý"),
    paragraphs: [
      L(
        "회사는 원활한 서비스 제공을 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다. 위탁계약 체결 시 개인정보 보호법 제26조에 따라 목적 외 처리 금지, 안전성 확보조치, 재위탁 제한 등을 계약서에 반영하고 수탁자의 처리 현황을 감독합니다.",
        "The Company consigns personal information processing tasks as set out below. Under Article 26 of the Act, consignment agreements include restrictions on processing beyond the stated purpose, safeguards, and limits on re-consignment, and the Company supervises the consignees.",
        "Công ty ủy thác các công việc xử lý thông tin cá nhân như dưới đây. Theo Điều 26 của Luật, hợp đồng ủy thác bao gồm các hạn chế về mục đích xử lý, biện pháp bảo đảm an toàn và giới hạn tái ủy thác.",
      ),
    ],
    table: {
      columns: [
        L("수탁자", "Consignee", "Bên nhận ủy thác"),
        L("위탁 업무 내용", "Consigned task", "Nội dung ủy thác"),
      ],
      rows: [
        [
          L("Amazon Web Services, Inc.", "Amazon Web Services, Inc.", "Amazon Web Services, Inc."),
          L("서버 운영 및 데이터 보관", "Server operation and data storage", "Vận hành máy chủ và lưu trữ dữ liệu"),
        ],
        [
          L("Resend, Inc.", "Resend, Inc.", "Resend, Inc."),
          L("문의·지원 접수 알림 이메일 발송", "Sending notification emails for inquiries and applications", "Gửi email thông báo yêu cầu và hồ sơ ứng tuyển"),
        ],
        [
          L("Microsoft Corporation", "Microsoft Corporation", "Microsoft Corporation"),
          L("업무용 이메일 수신 및 보관 (Microsoft 365)", "Receipt and storage of business email (Microsoft 365)", "Nhận và lưu trữ email công việc (Microsoft 365)"),
        ],
      ],
    },
  },
  {
    heading: L("제6조 (개인정보의 국외 이전)", "Article 6. Cross-Border Transfer", "Điều 6. Chuyển giao ra nước ngoài"),
    paragraphs: [
      L(
        "회사는 서비스 제공을 위하여 아래와 같이 개인정보를 국외로 이전(보관 포함)하고 있습니다. 정보주체는 국외 이전을 거부할 수 있으며, 거부하는 경우 문의 접수 및 채용 지원 등 관련 서비스 이용이 제한될 수 있습니다.",
        "For the provision of its services, the Company transfers (including stores) personal information overseas as described below. Data subjects may refuse the cross-border transfer; in that case, use of the related services, such as inquiry submission and job application, may be limited.",
        "Để cung cấp dịch vụ, Công ty chuyển giao (bao gồm lưu trữ) thông tin cá nhân ra nước ngoài như mô tả dưới đây. Chủ thể dữ liệu có thể từ chối việc chuyển giao này; khi đó việc sử dụng các dịch vụ liên quan có thể bị hạn chế.",
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
          L("Amazon Web Services, Inc. / 미국", "Amazon Web Services, Inc. / United States", "Amazon Web Services, Inc. / Hoa Kỳ"),
          L("제2조의 수집 항목 전부 — 서버 운영 및 보관", "All items listed in Article 2 — server operation and storage", "Toàn bộ các mục tại Điều 2 — vận hành máy chủ và lưu trữ"),
          L("서비스 이용 시점에 네트워크를 통해 전송", "Transmitted over the network at the time of use", "Truyền qua mạng tại thời điểm sử dụng"),
        ],
        [
          L("Resend, Inc. / 미국", "Resend, Inc. / United States", "Resend, Inc. / Hoa Kỳ"),
          L("성명, 이메일 주소, 문의·지원 내용 — 알림 이메일 발송", "Name, email address, inquiry or application content — sending notification emails", "Họ tên, email, nội dung yêu cầu — gửi email thông báo"),
          L("문의·지원 접수 시 네트워크를 통해 전송", "Transmitted over the network upon submission", "Truyền qua mạng khi gửi biểu mẫu"),
        ],
        [
          L("Microsoft Corporation / 미국", "Microsoft Corporation / United States", "Microsoft Corporation / Hoa Kỳ"),
          L("성명, 이메일 주소, 문의·지원 내용 — 이메일 수신 및 보관", "Name, email address, inquiry or application content — email receipt and storage", "Họ tên, email, nội dung — nhận và lưu trữ email"),
          L("이메일 수신 시점에 네트워크를 통해 전송", "Transmitted over the network upon email receipt", "Truyền qua mạng khi nhận email"),
        ],
      ],
    },
  },
  {
    heading: L("제7조 (개인정보의 파기)", "Article 7. Destruction of Personal Information", "Điều 7. Hủy thông tin cá nhân"),
    paragraphs: [
      L(
        "회사는 보유 기간이 경과하거나 처리 목적이 달성되어 개인정보가 불필요하게 되었을 때에는 지체 없이(사유 발생일로부터 5일 이내) 해당 개인정보를 파기합니다.",
        "When the retention period expires or the purpose of processing is achieved and the personal information is no longer necessary, the Company destroys it without delay (within five days of the arising of such cause).",
        "Khi hết thời hạn lưu giữ hoặc mục đích xử lý đã đạt được, Công ty hủy thông tin cá nhân không chậm trễ (trong vòng 5 ngày kể từ khi phát sinh lý do).",
      ),
    ],
    bullets: [
      L(
        "전자적 파일 형태의 정보: 복원이 불가능한 방법으로 영구 삭제",
        "Information in electronic file form: permanently deleted by a method that renders recovery impossible",
        "Thông tin dạng tệp điện tử: xóa vĩnh viễn bằng phương pháp không thể khôi phục",
      ),
      L(
        "종이에 출력된 정보: 분쇄기로 분쇄하거나 소각",
        "Information printed on paper: shredded or incinerated",
        "Thông tin in trên giấy: hủy bằng máy hủy tài liệu hoặc đốt",
      ),
    ],
  },
  {
    heading: L("제8조 (정보주체와 법정대리인의 권리·의무 및 행사 방법)", "Article 8. Rights of Data Subjects and How to Exercise Them", "Điều 8. Quyền của chủ thể dữ liệu và cách thực hiện"),
    paragraphs: [
      L(
        "정보주체는 회사에 대해 언제든지 개인정보 열람, 정정, 삭제, 처리정지 및 동의 철회를 요구할 수 있습니다. 권리 행사는 제11조의 개인정보 보호책임자에게 서면, 전화 또는 이메일로 하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.",
        "Data subjects may at any time request access to, correction of, deletion of, or suspension of processing of their personal information, and may withdraw consent. Such requests may be made to the Privacy Officer identified in Article 10 in writing, by telephone, or by email, and the Company will act on them without delay.",
        "Chủ thể dữ liệu có thể yêu cầu truy cập, chỉnh sửa, xóa, tạm dừng xử lý thông tin cá nhân và rút lại sự đồng ý bất cứ lúc nào. Yêu cầu có thể gửi tới Người phụ trách tại Điều 10 bằng văn bản, điện thoại hoặc email.",
      ),
      L(
        "정보주체가 개인정보의 오류 등에 대한 정정을 요구한 경우, 회사는 정정을 완료하기 전까지 해당 개인정보를 이용하거나 제공하지 않습니다.",
        "Where a data subject requests correction of an error, the Company will not use or provide the relevant personal information until the correction is complete.",
        "Khi chủ thể dữ liệu yêu cầu chỉnh sửa lỗi, Công ty sẽ không sử dụng hoặc cung cấp thông tin đó cho đến khi hoàn tất việc chỉnh sửa.",
      ),
    ],
  },
  {
    heading: L("제9조 (개인정보의 안전성 확보 조치)", "Article 9. Security Measures", "Điều 9. Biện pháp bảo đảm an toàn"),
    bullets: [
      L("개인정보 취급 담당자의 최소화 및 접근 권한 관리", "Minimizing the number of personnel handling personal information and managing access rights", "Giảm thiểu nhân sự xử lý và quản lý quyền truy cập"),
      L("개인정보 처리 시스템에 대한 접근 통제 및 접속 기록 보관", "Access control over processing systems and retention of access logs", "Kiểm soát truy cập hệ thống và lưu giữ nhật ký truy cập"),
      L("개인정보의 암호화 저장 및 전송 구간 암호화(HTTPS)", "Encrypted storage of personal information and encryption in transit (HTTPS)", "Mã hóa khi lưu trữ và mã hóa đường truyền (HTTPS)"),
      L("보안 프로그램 설치 및 주기적 갱신·점검", "Installation of security software with periodic updates and inspections", "Cài đặt phần mềm bảo mật, cập nhật và kiểm tra định kỳ"),
    ],
  },
  {
    heading: L("제10조 (개인정보 자동 수집 장치의 설치·운영 및 거부)", "Article 10. Automatic Collection Devices and How to Refuse Them", "Điều 10. Thiết bị thu thập tự động và cách từ chối"),
    paragraphs: [
      L(
        "회사는 이용자의 언어 및 화면 테마 설정을 저장하기 위해 브라우저의 로컬 저장소(localStorage)를 사용합니다. 해당 정보는 이용자의 브라우저에만 저장되며 회사 서버로 전송되지 않습니다.",
        "The Company uses the browser's local storage to remember the user's language and theme preferences. This information is stored only in the user's browser and is not transmitted to the Company's servers.",
        "Công ty sử dụng bộ nhớ cục bộ của trình duyệt để ghi nhớ tùy chọn ngôn ngữ và giao diện. Thông tin này chỉ lưu trên trình duyệt của người dùng và không được gửi tới máy chủ của Công ty.",
      ),
      L(
        "회사는 제3자 행태정보 분석 도구나 광고 목적의 추적 기술을 사용하지 않습니다. 이용자는 브라우저 설정에서 저장소 사용을 차단하여 위 저장을 거부할 수 있으며, 이 경우 언어·테마 설정이 유지되지 않는 등 일부 편의 기능이 제한될 수 있습니다.",
        "The Company does not use third-party behavioral analytics or advertising tracking technologies. Users may refuse the above storage by blocking site data in their browser settings; in that case, some conveniences such as remembering language and theme preferences will not work.",
        "Công ty không sử dụng công cụ phân tích hành vi của bên thứ ba hoặc công nghệ theo dõi quảng cáo. Người dùng có thể từ chối bằng cách chặn dữ liệu trang web trong cài đặt trình duyệt; khi đó một số tiện ích như ghi nhớ ngôn ngữ và giao diện sẽ không hoạt động.",
      ),
    ],
  },
  {
    heading: L("제11조 (개인정보 보호책임자)", "Article 11. Privacy Officer", "Điều 11. Người phụ trách bảo vệ thông tin cá nhân"),
    paragraphs: [
      L(
        "회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다. 정보주체는 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의를 아래로 문의하실 수 있습니다.",
        "The Company designates the following Privacy Officer to take overall responsibility for personal information processing and to handle complaints and remedies from data subjects. Data subjects may direct any privacy-related inquiry to the contact below.",
        "Công ty chỉ định Người phụ trách sau đây để chịu trách nhiệm chung về việc xử lý thông tin cá nhân và giải quyết khiếu nại của chủ thể dữ liệu.",
      ),
    ],
  },
  {
    heading: L("제12조 (권익침해 구제 방법)", "Article 12. Remedies for Infringement of Rights", "Điều 12. Biện pháp khắc phục khi quyền bị xâm phạm"),
    paragraphs: [
      L(
        "정보주체는 개인정보 침해로 인한 구제를 받기 위하여 아래 기관에 분쟁 해결이나 상담 등을 신청할 수 있습니다.",
        "Data subjects may apply to the following organizations for dispute resolution or consultation regarding infringement of personal information.",
        "Chủ thể dữ liệu có thể liên hệ các cơ quan sau để giải quyết tranh chấp hoặc tư vấn.",
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

/** 문의 폼 / 지원 폼에 붙는 짧은 수집·이용 동의 문구. */
export const consentNotice = {
  contact: {
    label: L(
      "개인정보 수집·이용에 동의합니다. (필수)",
      "I consent to the collection and use of my personal information. (Required)",
      "Tôi đồng ý cho thu thập và sử dụng thông tin cá nhân của tôi. (Bắt buộc)",
    ),
    detail: L(
      "수집 항목: 성명, 이메일, 연락처, 소속 기관 · 이용 목적: 문의 접수 및 회신 · 보유 기간: 3년. 동의를 거부하실 수 있으나, 이 경우 문의 접수가 제한됩니다.",
      "Items: name, email, phone, organization · Purpose: receiving and responding to inquiries · Retention: 3 years. You may decline, but inquiry submission will then be unavailable.",
      "Mục thu thập: họ tên, email, điện thoại, tổ chức · Mục đích: tiếp nhận và phản hồi · Lưu giữ: 3 năm. Bạn có thể từ chối, nhưng khi đó không thể gửi yêu cầu.",
    ),
    error: L(
      "개인정보 수집·이용에 동의해주세요",
      "Please consent to the collection and use of your personal information",
      "Vui lòng đồng ý với việc thu thập và sử dụng thông tin cá nhân",
    ),
  },
  /**
   * 채용 지원 폼. 필수(전형 진행)와 선택(인재풀)을 나눈 이유는 목적이 다르기 때문이다.
   * 필수 동의만으로는 전형이 끝나면 파기해야 하고, 보관하려면 별도 목적에 대한
   * 선택 동의가 있어야 한다. 선택에 동의하지 않아도 전형에는 아무 영향이 없다.
   */
  careers: {
    label: L(
      "개인정보 수집·이용에 동의합니다. (필수)",
      "I consent to the collection and use of my personal information. (Required)",
      "Tôi đồng ý cho thu thập và sử dụng thông tin cá nhân của tôi. (Bắt buộc)",
    ),
    detail: L(
      "수집 항목: 성명, 이메일, 연락처, 자기소개, 이력서 파일에 포함된 정보 · 이용 목적: 채용 전형 진행 및 결과 안내 · 보유 기간: 해당 채용 전형 종료 후 지체 없이 파기. 동의를 거부하실 수 있으나, 이 경우 지원 접수가 제한됩니다.",
      "Items: name, email, phone, cover letter, and information contained in the résumé file · Purpose: conducting the recruitment process and communicating results · Retention: destroyed without delay once the process ends. You may decline, but the application cannot then be submitted.",
      "Mục thu thập: họ tên, email, điện thoại, thư giới thiệu và thông tin trong tệp hồ sơ · Mục đích: tiến hành tuyển dụng và thông báo kết quả · Lưu giữ: hủy ngay sau khi quy trình kết thúc. Bạn có thể từ chối, nhưng khi đó không thể nộp hồ sơ.",
    ),
    error: L(
      "개인정보 수집·이용에 동의해주세요",
      "Please consent to the collection and use of your personal information",
      "Vui lòng đồng ý với việc thu thập và sử dụng thông tin cá nhân",
    ),
    talentPoolLabel: L(
      "인재풀 등록에 동의합니다. (선택)",
      "I consent to being added to the talent pool. (Optional)",
      "Tôi đồng ý được thêm vào nguồn ứng viên. (Tùy chọn)",
    ),
    talentPoolDetail: L(
      "이번 전형이 끝난 뒤에도 지원 서류를 1년간 보관하고, 적합한 채용 기회가 있을 때 연락드립니다. 동의하지 않으셔도 이번 전형에는 어떠한 불이익도 없으며, 동의는 언제든 철회하실 수 있습니다.",
      "We keep your application on file for one year after this process ends and contact you when a suitable opening arises. Declining causes no disadvantage in this process, and consent may be withdrawn at any time.",
      "Chúng tôi lưu hồ sơ của bạn trong một năm sau khi quy trình này kết thúc và liên hệ khi có vị trí phù hợp. Việc từ chối không gây bất lợi nào và bạn có thể rút lại đồng ý bất cứ lúc nào.",
    ),
  },
  policyLink: L("개인정보 처리방침 전문 보기", "Read the full Privacy Policy", "Xem toàn văn Chính sách Bảo mật"),
}

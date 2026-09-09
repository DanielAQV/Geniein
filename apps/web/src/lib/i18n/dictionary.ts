export type Language = "kr" | "en" | "vn"

export const dictionary = {
  common: {
    home: { kr: "홈", en: "Home", vn: "Trang chủ" },
    about: { kr: "회사 소개", en: "About", vn: "Giới thiệu" },
    business: { kr: "사업 분야", en: "Business", vn: "Lĩnh vực" },
    oda: { kr: "ODA 컨설팅", en: "ODA Consulting", vn: "Tư vấn ODA" },
    platform: { kr: "플랫폼 서비스", en: "Platform Services", vn: "Dịch vụ Nền tảng" },
    insights: { kr: "비즈니스 인사이트", en: "Business Insights", vn: "Góc nhìn Kinh doanh" },
    insights_oda: { kr: "글로벌 ODA", en: "Global ODA", vn: "ODA Toàn cầu" },
    insights_it: { kr: "IT 트렌드", en: "IT Trends", vn: "Xu hướng CNTT" },
    careers: { kr: "채용", en: "Careers", vn: "Tuyển dụng" },
    contact: { kr: "문의하기", en: "Contact Us", vn: "Liên hệ" },
    consulting_btn: { kr: "파트너십 상담", en: "Partnership", vn: "Tư vấn" },
    language: { kr: "언어", en: "Language", vn: "Ngôn ngữ" },
    copyright: { kr: "© 2026 Geniein Co., Ltd. All rights reserved.", en: "© 2026 Geniein Co., Ltd. All rights reserved.", vn: "© 2026 Geniein Co., Ltd. All rights reserved." },
    more: { kr: "자세히 보기", en: "Read More", vn: "Xem thêm" },
    prev: { kr: "이전", en: "Previous", vn: "Trước" },
    next: { kr: "다음", en: "Next", vn: "Tiếp" },
    privacy: { kr: "개인정보 처리방침", en: "Privacy Policy", vn: "Chính sách Bảo mật" }
  },
  hero: {
    badge: { kr: "글로벌 성장을 가속하는 지능형 디지털 아키텍트", en: "Intelligent Digital Architect Accelerating Global Growth", vn: "Đối tác thiết lập tương lai số" },
    title_main: { kr: "Beyond", en: "Beyond", vn: "Vượt trên cả" },
    title_accent: { kr: "Communication", en: "Communication", vn: "Giao tiếp" },
    description: {
      kr: "현장 중심의 전문 기획과 혁신적인 플랫폼 기술을 결합하여\n글로벌 시장의 지속 가능한 디지털 성장을 이끕니다.",
      en: "Combining field-oriented professional planning with innovative platform technology\nto lead sustainable digital growth in the global market.",
      vn: "Kết hợp quy hoạch chuyên nghiệp hướng tới thực địa với công nghệ nền tảng đổi mới\nđể dẫn đầu sự phát triển kỹ thuật số bền vững trên thị trường toàn cầu."
    },
    btn_projects: { kr: "지니인 소개", en: "About Us", vn: "Về chúng tôi" },
    btn_contact: { kr: "문의하기", en: "Contact", vn: "Liên hệ" },
    scroll: { kr: "Scroll", en: "Scroll", vn: "Scroll" }
  },
  landing: {
    business: {
      label: { kr: "Business Focus", en: "Business Focus", vn: "Trọng tâm kinh doanh" },
      title: { kr: "사업 분야", en: "Business Areas", vn: "Lĩnh vực kinh doanh" },
      description: {
        kr: "현장 중심의 기획과 차별화된 기술력으로,\n지니인은 글로벌 ODA와 AI 플랫폼 시장의 새로운 표준을 제시합니다.",
        en: "With field-oriented planning and differentiated technology,\nGeniein presents new standards for the global ODA and AI platform markets.",
        vn: "Với quy hoạch hướng tới thực địa và công nghệ khác biệt,\nGeniein đưa ra các tiêu chuẩn mới cho ODA toàn cầu và nền tảng AI."
      },
      platform_title: { kr: "AI 기반 소프트웨어 생태계의 표준", en: "The Standard for AI-Based Software Ecosystems", vn: "Đổi mới giá trị phần mềm dựa trên AI" },
      platform_desc: { kr: "AI 기반의 지능형 소프트웨어 FP 가치 산정과 더불어, 자연어 기반 개발과 안정적인 호스팅을 지원하는 AI Studio를 통해 혁신적인 아이디어를 기술로 완성합니다.", en: "Beyond intelligent AI-based Software FP value estimation, we turn innovative ideas into technical reality through AI Studio, supporting natural language development and stable hosting.", vn: "Ngoài việc ước tính giá trị FP phần mềm dựa trên AI thông minh, chúng tôi hiện thực hóa các ý tưởng đổi mới thông qua AI Studio, hỗ trợ phát triển ngôn ngữ tự nhiên và hosting ổn định." },
      platform_items: [
        { kr: "AI 기반 지능형 FP 산정", en: "AI-based Intelligent FP Estimation", vn: "Ước tính FP thông minh dựa trên AI" },
        { kr: "데이터 기반 공수 분석 시스템", en: "Data-driven Effort Analysis", vn: "Hệ thống phân tích nỗ lực dựa trên dữ liệu" },
        { kr: "자연어 기반 앱 개발", en: "Natural Language App Dev", vn: "Phát triển ứng dụng bằng ngôn ngữ tự nhiên" },
        { kr: "호스팅 및 운영관리", en: "Hosting & Operations", vn: "Dịch vụ Hosting & Quản lý" }
      ],
      oda_title: { kr: "글로벌 공공 가치를 창출하는 ODA 전략 파트너", en: "ODA Strategic Partner Creating Global Public Value", vn: "Tư vấn ODA Toàn cầu" },
      oda_desc: { kr: "글로벌 균형 발전을 위한 파트너로서, IT 인프라와 전자정부, 사이버 보안 등 전 분야에 걸친 포괄적인 ODA 서비스를 제공합니다.", en: "As a partner for global balanced development, we provide comprehensive ODA services across various fields including IT infrastructure, e-government, and cybersecurity.", vn: "Với tư cách là đối tác vì sự phát triển cân bằng toàn cầu, chúng tôi cung cấp các dịch vụ ODA toàn diện trong nhiều lĩnh vực bao gồm hạ tầng CNTT, chính phủ điện tử và an ninh mạng." },
      oda_items: [
        { kr: "비즈니스 기획 및 컨설팅", en: "Business Planning & Consulting", vn: "Quy hoạch & Tư vấn kinh doanh" },
        { kr: "IT 인프라 및 시스템 개발", en: "IT Infrastructure & System Dev", vn: "Phát triển hạ tầng & Hệ thống CNTT" },
        { kr: "사이버 보안 및 네트워크 구축", en: "Cybersecurity & Network", vn: "An ninh mạng & Xây dựng mạng lưới" },
        { kr: "프로젝트 수행 및 사후 평가", en: "Implementation & Evaluation", vn: "Triển khai & Đánh giá dự án" }
      ]
    },
    insights: {
      label: { kr: "Business Insights", en: "Business Insights", vn: "Góc nhìn Kinh doanh" },
      hero_title: { kr: "AI STRATEGIC INSIGHTS", en: "AI STRATEGIC INSIGHTS", vn: "AI STRATEGIC INSIGHTS" },
      section_title: { kr: "비즈니스 인사이트", en: "BUSINESS INSIGHTS", vn: "GOC NHIN KINH DOANH" },
      hero_desc: { kr: "실시간 글로벌 비즈니스 데이터와 AI 기술을 결합하여,\n전략적 의사결정을 위한 핵심 인사이트를 도출합니다.", en: "Combining real-time global business data with AI technology,\nwe derive core insights for strategic decision-making.", vn: "Kết hợp dữ liệu kinh doanh toàn cầu theo thời gian thực với công nghệ AI,\nchúng tôi đưa ra các thông tin cốt lõi cho việc ra quyết định chiến lược." },
      title: { kr: "글로벌 인사이트 라우팅", en: "GLOBAL INSIGHT ROUTING", vn: "ĐỊNH HƯỚNG GÓC NHÌN TOÀN CẦU" },
      desc: { kr: "지니인만의 고도화된 AI 분석 기술로\n글로벌 시장의 미래 기회를 가장 먼저 포착합니다.", en: "With Geniein's advanced AI analysis technology,\nbe the first to capture future opportunities in the global market.", vn: "Với công nghệ phân tích AI tiên tiến của Geniein,\nhãy là người đầu tiên nắm bắt các cơ hội tương lai trên thị trường toàn cầu." },
      desc_oda: { kr: "글로벌 디지털 전환 트렌드와 ODA 전략의 융합을 통해,\n국가 간 협력을 넘어 새로운 글로벌 비즈니스 시장의 가능성을 분석합니다.", en: "Through the convergence of global DX trends and ODA strategies,\nwe analyze new global business market possibilities beyond inter-country cooperation.", vn: "Thông qua sự hội tụ của các xu hướng DX toàn cầu và chiến lược ODA,\nchúng tôi phân tích các khả năng thị trường kinh doanh toàn cầu mới vượt ra ngoài hợp tác giữa các quốc gia." },
      desc_it: { kr: "지니인만의 독보적인 AI 기술 인사이트를 비즈니스 전략과 결합하여,\n디지털 전환 그 이상의 실질적인 사업적 도약과 성과를 실현합니다.", en: "By combining Geniein's unique AI technology insights with business strategy,\nwe realize practical business leaps and results beyond digital transformation.", vn: "Bằng cách kết hợp những hiểu biết sâu sắc về công nghệ AI độc đáo của Geniein với chiến lược kinh doanh,\nchúng tôi hiện thực hóa những bước nhảy vọt và kết quả kinh doanh thực tế vượt ra ngoài chuyển đổi kỹ thuật số." },
      items: [
        {
          tag: "ODA",
          thumbnail_url: "/images/insights/oda.png",
          title: { kr: "동남아시아 디지털 인프라 개발 동향", en: "Digital Infrastructure Trends in SE Asia", vn: "Xu hướng phát triển hạ tầng số tại Đông Nam Á" },
          summary: { kr: "베트남과 캄보디아의 스마트 시티 솔루션과 전자 정부 플랫폼을 중심으로 분석합니다.", en: "Focusing on smart city solutions and e-government platforms across Vietnam and Cambodia.", vn: "Tập trung vào các giải pháp thành phố thông minh và nền tảng chính phủ điện tử trên khắp Việt Nam và Campuchia." },
          perspective: { kr: "현지 인프라 환경을 고려한 단계별 DX 로드맵 수립이 프로젝트 성공의 핵심입니다.", en: "Establishing a step-by-step DX roadmap considering the local infrastructure is the key to project success.", vn: "Thiết lập lộ trình DX từng bước xem xét hạ tầng địa phương là chìa khóa thành공의 dự án." },
          date: { kr: "2시간 전", en: "2h ago", vn: "2 giờ trước" }
        },
        {
          tag: "IT",
          thumbnail_url: "/images/insights/it.png",
          title: { kr: "AI 기반 프로젝트 평가", en: "AI-based Project Evaluation: A New Paradigm", vn: "Đánh giá dự án dựa trên AI: Một mô hình mới" },
          summary: { kr: "머신러닝 모델이 개발 프로젝트의 평가 및 모니터링 방식을 혁신하고 있습니다.", en: "Machine learning models are revolutionizing how development projects are evaluated and monitored.", vn: "Các mô hình học máy đang cách mạng hóa cách thức đánh giá và giám sát các dự án phát triển." },
          perspective: { kr: "데이터 기반 객관적 성과 지표는 ODA 프로젝트의 투명성과 신뢰도를 높여줍니다.", en: "Objective performance metrics based on data will elevate the transparency and reliability of ODA projects.", vn: "Các chỉ số hiệu quả khách quan dựa trên dữ liệu sẽ nâng cao tính minh bạch và độ tin cậy của các dự án ODA." },
          date: { kr: "5시간 전", en: "5h ago", vn: "5 giờ trước" }
        },
        {
          tag: "ODA",
          thumbnail_url: "/images/heroes/insights.png",
          title: { kr: "G20 정상회의, 디지털 개발 의제 채택", en: "G20 Summit Adopts Digital Development Agenda", vn: "Hội nghị thượng đỉnh G20 thông qua chương trình nghị sự phát triển kỹ thuật số" },
          summary: { kr: "세계 정상들은 신규 ODA 자금으로 디지털 격차를 해소하기로 약속했습니다.", en: "World leaders committed to bridging the digital divide with new ODA funding.", vn: "Các nhà lãnh đạo thế giới đã cam kết thu hẹp khoảng cách số với nguồn vốn ODA mới." },
          perspective: { kr: "디지털 격차 해소는 단순한 지원을 넘어 글로벌 시장 통합의 핵심 동력이 될 것입니다.", en: "Bridging the digital divide will be a key driver for global market integration, beyond simple support.", vn: "Thu hẹp khoảng cách số sẽ là động lực chính cho sự hội nhập thị trường toàn cầu, vượt xa sự hỗ trợ đơn thuần." },
          date: { kr: "1일 전", en: "1d ago", vn: "1 ngày trước" }
        }
      ]
    },
    contact: {
      label: { kr: "Global Partnership", en: "GLOBAL PARTNERSHIP", vn: "Hợp tác toàn cầu" },
      title: { kr: "성공적인 글로벌 협력,\n지니인이 최적의 해답을 제시합니다", en: "Successful Global Cooperation,\nGeniein provides the optimal answer.", vn: "Hợp tác toàn cầu thành công,\nGeniein đưa ra câu trả lời tối ưu." },
      desc: { kr: "현장 중심의 전략과 탄탄한 기술력으로 실질적인 비즈니스 가치를 창출합니다.\n글로벌 비즈니스의 성공을 위한 최적의 파트너십, 지니인과 함께 시작하세요.", en: "We create tangible business value through field-oriented strategies and solid technology.\nThe optimal partnership for your global business success starts with Geniein.", vn: "Chúng tôi tạo ra giá trị kinh doanh hữu hình thông qua các chiến lược hướng tới thực tế và công nghệ vững chắc.\nMối quan hệ đối tác tối ưu cho sự thành công trong kinh doanh toàn cầu của bạn bắt đầu với Geniein." },
      seoul: { kr: "한국 본사 (주)지니인", en: "Korea HQ (Geniein Inc.)", vn: "Trụ sở chính Hàn Quốc (Geniein Inc.)" },
      seoul_addr: { kr: "경기도 성남시 분당구 황새울로319번길 8-4, 7층 720호", en: "720, 7F, 8-4 Hwangsaeul-ro 319beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do", vn: "720, 7F, 8-4 Hwangsaeul-ro 319beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do" },
      hanoi: { kr: "하노이 법인 (GENIE VINA)", en: "Hanoi Subsidiary (GENIE VINA)", vn: "Công ty tại Hà Nội (GENIE VINA)" },
      hanoi_addr: { kr: "Room 01-02, 15F, Pearl Tower, 1 Chau Van Liem, Tu Liem, Hanoi, Vietnam", en: "Room 01-02, 15F, Pearl Tower, 1 Chau Van Liem, Tu Liem, Hanoi, Vietnam", vn: "Phòng số 01-02, tầng 15, tòa nhà Pearl Tower, số 1 Châu Văn Liêm, Phường Từ Liêm, Thành phố Hà Nội, Việt Nam" },
      manila: { kr: "필리핀 법인 (Genie PH Corporation)", en: "Philippines Subsidiary (Genie PH Corporation)", vn: "Công ty tại Philippines (Genie PH Corporation)" },
      manila_addr: { kr: "4F, Marvin Plaza Bldg., 2153 Chino Roces Ave, Makati City, 1230 Metro Manila", en: "4F, Marvin Plaza Bldg., 2153 Chino Roces Ave, Makati City, 1230 Metro Manila", vn: "4F, Marvin Plaza Bldg., 2153 Chino Roces Ave, Makati City, 1230 Metro Manila" },
      form_name_ph: { kr: "성함 또는 기관명을 입력해주세요", en: "Enter your name or organization", vn: "Nhập tên hoặc tổ chức của bạn" },
      form_subject_ph: { kr: "어떤 도움이 필요하신가요?", en: "How can we help you?", vn: "Chúng tôi có thể giúp gì cho bạn?" },
      form_message_ph: { kr: "프로젝트 또는 솔루션과 관련하여 궁금한 점을 자세히 남겨주세요...", en: "Please leave details about your questions regarding projects or solutions...", vn: "Vui lòng để lại chi tiết về các câu hỏi của bạn liên quan đến dự án hoặc giải pháp..." },
      form_submit: { kr: "메시지 보내기", en: "Send Message", vn: "Gửi tin nhắn" },
      form_sending: { kr: "발송 중...", en: "Sending...", vn: "Đang gửi..." },
      success_title: { kr: "발송 완료!", en: "Sent Successfully!", vn: "Đã gửi thành công!" },
      success_desc: { kr: "문의가 접수되었습니다. 담당자가 확인 후 24시간 이내에 회신해 드립니다.", en: "Your inquiry has been received. Our representative will respond within 24 hours after review.", vn: "Yêu cầu của bạn đã được tiếp nhận. Đại diện của chúng tôi sẽ phản hồi trong vòng 24 giờ sau khi xem xét." }
    },
    footer: {
      desc: { kr: "디지털 ODA 컨설팅 및 혁신적인 IT 플랫폼 분야의 글로벌 리더. 전 세계 국가들을 디지털로 하나 되게 연결하고, 모두의 지속 가능한 성장을 위한 인프라 구축을 주도합니다.", en: "A global leader in digital ODA consulting and innovative IT platforms. Connecting countries worldwide through digital and leading the building of infrastructure for sustainable growth for all.", vn: "Nhà lãnh đạo toàn cầu trong lĩnh vực tư vấn ODA kỹ thuật số và các nền tảng CNTT đổi mới. Kết nối các quốc gia trên toàn thế giới thông qua kỹ thuật số và dẫn đầu việc xây dựng cơ sở hạ tầng để tăng trưởng bền vững cho tất cả mọi người." },
      reg_no: { kr: "사업자등록번호: 645-81-03508", en: "Registration No: 645-81-03508", vn: "Mã số thuế: 645-81-03508" },
      ceo: { kr: "대표: 변범준", en: "CEO: Byun Beom Joon", vn: "Đại diện: Byun Beom Joon" },
      address: { kr: "주소: 경기도 성남시 분당구 황새울로319번길 8-4, 7층 720호", en: "Address: 720, 7F, 8-4 Hwangsaeul-ro 319beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do", vn: "Địa chỉ: Phòng 720, Tầng 7, 8-4 Hwangsaeul-ro 319beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do" }
    }
  },
  about: {
    hero: {
      label: { kr: "REDEFINING CONNECTION", en: "REDEFINING CONNECTION", vn: "REDEFINING CONNECTION" },
      title_1: { kr: "BEYOND", en: "BEYOND", vn: "VƯỢT TRÊN CẢ" },
      title_2: { kr: "COMMUNICATION", en: "COMMUNICATION", vn: "GIAO TIẾP" },
      description: {
        kr: "단순한 연결을 넘어 의미를 공유하고 가치를 더합니다.\n초연결 시대, 지니인이 그리는 새로운 소통의 표준입니다.",
        en: "Beyond simple connection, we share meanings and add value.\nIn the era of hyper-connectivity, this is Geniein's new standard of communication.",
        vn: "Vượt ra ngoài sự kết nối đơn thuần, chúng tôi chia sẻ ý nghĩa và gia tăng giá trị.\nTrong kỷ nguyên siêu kết nối, đây là tiêu chuẩn giao tiếp mới của Geniein."
      }
    },
    identity: {
      label: { kr: "Identity", en: "Identity", vn: "Danh tính" },
      title: { kr: "Beyond Communication", en: "Beyond Communication", vn: "Vượt trên cả giao tiếp" },
      p1: { kr: "소통은 단순한 정보의 전달을 넘어, 의미를 공유하고 상호 존중하는 인류의 본질적인 행위입니다. 디지털 전환(DX)의 시대, 우리는 0과 1의 시퀀스를 통해 사람과 기계, 그리고 인공지능(AI)이 서로 교감하는 새로운 소통의 패러다임을 마주하고 있습니다.", en: "Communication is an essential human act beyond just transmitting information; it's about sharing meaning and mutual respect. In the era of Digital Transformation (DX), we face a new paradigm where humans, machines, and AI interact through a sequence of 0s and 1s.", vn: "Giao tiếp là một hành động thiết yếu của con người, vượt xa việc chỉ truyền đạt thông tin; đó là về việc chia sẻ ý nghĩa và tôn trọng lẫn nhau. Trong kỷ nguyên Chuyển đổi số (DX), chúng ta đối mặt với một mô hình mới nơi con người, máy móc và AI tương tác thông qua chuỗi các số 0 và 1." },
      p2: { kr: "지니인은 'Tele-Communication'에 필요한 인프라와 통찰력을 바탕으로, 모든 소통의 주체가 최적의 경로(Optimal Routing)를 통해 원활하게 연결되는 세상을 지향합니다. 사람 사이의 연결을 넘어, 새로운 디지털 시대의 소통을 혁신하겠습니다.", en: "Based on the infrastructure and insights necessary for Tele-Communication, Geniein aims for a world where all subjects of communication connect smoothly through Optimal Routing. Beyond human connection, we will innovate communication for the new digital era.", vn: "Dựa trên cơ sở hạ tầng và những hiểu biết cần thiết cho Viễn thông, Geniein hướng tới một thế giới nơi tất cả các chủ thể giao tiếp kết nối suôn sẻ thông qua Lộ trình tối ưu (Optimal Routing). Vượt ra ngoài kết nối giữa con người, chúng tôi sẽ đổi mới giao tiếp cho kỷ nguyên số mới." },
      steps: [
        {
          title: { kr: "VISION", en: "VISION", vn: "TẦM NHÌN" },
          label: { kr: "소통의 혁신", en: "Innovation in Communication", vn: "Đổi mới giao tiếp" },
          desc: { kr: "사람과 기술이 가장 효율적으로 공존하고 소통할 수 있는 최적의 환경을 구축합니다.", en: "Building an optimal environment where people and technology can coexist and communicate most efficiently.", vn: "Xây dựng môi trường tối ưu nơi con người và công nghệ có thể cùng tồn tại và giao tiếp hiệu quả nhất." }
        },
        {
          title: { kr: "MISSION", en: "MISSION", vn: "SỨ MỆNH" },
          label: { kr: "새로운 연결의 설계", en: "Architecting New Connections", vn: "Thiết kế các kết nối mới" },
          desc: { kr: "전통적인 통신을 넘어 지능형 상호작용이 조화를 이루는 새로운 디지털 패러다임을 선도합니다.", en: "Beyond traditional telecommunications, leading a new digital paradigm where intelligent interaction harmonizes.", vn: "Vượt ra ngoài viễn thông truyền thống, dẫn đầu một mô hình kỹ thuật số mới nơi tương tác thông minh hài hòa." }
        },
        {
          title: { kr: "CORE VALUE", en: "CORE VALUE", vn: "GIÁ TRỊ CỐT LÕI" },
          label: { kr: "사람 그 이상의 연결", en: "Beyond Human Connection", vn: "Vượt trên kết nối con người" },
          desc: { kr: "인간과 AI, AGI를 아우르는 모든 존재가 상호 존중하며 조화롭게 연결되는 미래를 지향합니다.", en: "Aiming for a future where all beings, including humans, AI, and AGI, connect harmoniously with mutual respect.", vn: "Hướng tới một tương lai nơi tất cả các sinh vật, bao gồm con người, AI và AGI, kết nối hài hòa với sự tôn trọng lẫn nhau." }
        }
      ]
    },
    organization: {
      label: { kr: "Global Network", en: "Global Network", vn: "Mạng lưới toàn cầu" },
      title: { kr: "국경을 넘는 시너지", en: "Synergy Across Borders", vn: "Sự hiệp lực xuyên biên giới" },
      desc: { kr: "전략적 인사이트와 강력한 엔지니어링 역량이 결합된 글로벌 협업 네트워크", en: "A global collaboration network combining strategic insights and strong engineering capabilities.", vn: "Một mạng lưới hợp tác toàn cầu kết hợp giữa cái nhìn chiến lược và năng lực kỹ thuật mạnh mẽ." },
      expertise_label: { kr: "핵심 역량", en: "CORE CAPABILITIES", vn: "Năng lực cốt lõi" },
      hubs: [
        {
          city: { kr: "한국 본사\nGeniein Co., Ltd", en: "KOREA HQ\nGeniein Co., Ltd", vn: "Trụ sở chính Hàn Quốc\nGeniein Co., Ltd" },
          role: { kr: "사업 수주 · 관리 허브", en: "Business Development & Management Hub", vn: "Trung tâm Phát triển & Quản lý Dự án" },
          image: "/images/about/org-korea.jpg",
          address: { kr: "경기도 성남시 분당구 황새울로319번길 8-4, 7층", en: "7F, 8-4 Hwangsaeul-ro 319beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do", vn: "Tầng 7, 8-4 Hwangsaeul-ro 319beon-gil, Bundang-gu, Seongnam-si, Gyeonggi-do" },
          specialization: [
            { kr: "해외사업 수주", en: "Overseas Business Development", vn: "Phát triển dự án nước ngoài" },
            { kr: "사업기획", en: "Project Planning", vn: "Lập kế hoạch dự án" },
            { kr: "사업관리", en: "Project Management", vn: "Quản lý dự án" }
          ]
        },
        {
          city: { kr: "하노이 법인\nGENIE VINA", en: "HANOI SUBSIDIARY\nGENIE VINA", vn: "Công ty tại Hà Nội\nGENIE VINA" },
          role: { kr: "R&D 및 사업수행 허브", en: "R&D & Delivery Hub", vn: "Trung tâm R&D & Triển khai" },
          image: "/images/about/org-hanoi-pearl.jpg",
          address: { kr: "Room 01-02, 15F, Pearl Tower, 1 Chau Van Liem, Tu Liem, Hanoi, Vietnam", en: "Room 01-02, 15F, Pearl Tower, 1 Chau Van Liem, Tu Liem, Hanoi, Vietnam", vn: "Phòng số 01-02, tầng 15, tòa nhà Pearl Tower, số 1 Châu Văn Liêm, Phường Từ Liêm, Thành phố Hà Nội, Việt Nam" },
          specialization: [
            { kr: "Connext", en: "Connext", vn: "Connext" },
            { kr: "GNOM / HER", en: "GNOM / HER", vn: "GNOM / HER" },
            { kr: "RWA / BCI", en: "RWA / BCI", vn: "RWA / BCI" }
          ]
        },
        {
          city: { kr: "필리핀 법인\nGenie PH Corporation", en: "PHILIPPINES SUBSIDIARY\nGenie PH Corporation", vn: "Công ty tại Philippines\nGenie PH Corporation" },
          role: { kr: "현지 프로젝트 수행 허브", en: "Local Project Delivery Hub", vn: "Trung tâm Triển khai Dự án Tại chỗ" },
          image: "/images/about/org-philippines.jpg",
          address: { kr: "4F, Marvin Plaza Bldg., 2153 Chino Roces Ave, Makati City, 1230 Metro Manila", en: "4F, Marvin Plaza Bldg., 2153 Chino Roces Ave, Makati City, 1230 Metro Manila", vn: "4F, Marvin Plaza Bldg., 2153 Chino Roces Ave, Makati City, 1230 Metro Manila" },
          specialization: [
            { kr: "현장운영", en: "Field Operations", vn: "Vận hành hiện trường" },
            { kr: "기자재조달", en: "Equipment Procurement", vn: "Mua sắm thiết bị" },
            { kr: "공정관리", en: "Progress & Schedule Control", vn: "Quản lý tiến độ" }
          ]
        }
      ]
    },
    projects: {
      label: { kr: "Track Record", en: "Track Record", vn: "Thành tích thực hiện" },
      title: { kr: "프로젝트 포트폴리오", en: "Project Portfolio", vn: "Danh mục dự án" },
      desc: { kr: "지니인은 현장 중심의 전문 기획과 탄탄한 기술력을 바탕으로\n실질적인 비즈니스 가치를 창출합니다.", en: "Geniein creates tangible business value through field-oriented planning\nand solid technical expertise.", vn: "Geniein tạo ra giá trị kinh doanh hữu hình thông qua quy hoạch hướng tới thực tế\nvà chuyên môn kỹ thuật vững chắc." },
      view_case: { kr: "상세 사례 보기", en: "View full case study", vn: "Xem chi tiết dự án" },
      filter_all: { kr: "전체", en: "All", vn: "Tất cả" },
      summary: { kr: "총 {count}건 · {countries}개국 수행", en: "{count} projects across {countries} countries", vn: "{count} dự án tại {countries} quốc gia" },
      countries: {
        ph: { kr: "필리핀", en: "Philippines", vn: "Philippines" },
        vn: { kr: "베트남", en: "Vietnam", vn: "Việt Nam" },
        bd: { kr: "방글라데시", en: "Bangladesh", vn: "Bangladesh" },
        uz: { kr: "우즈베키스탄", en: "Uzbekistan", vn: "Uzbekistan" }
      },
      // 수행 사업 9건 (확정).
      // 제목(국문·영문)과 사업목적은 대표가 준 원문 그대로다 — 다듬거나 문장으로
      // 고쳐 쓰지 말 것. 영문 사업명은 공식 명칭이라 대소문자도 원문을 따른다.
      // en/vn description 은 그 원문을 옮긴 번역이고, 국문 원문이 정본이다.
      // country 는 flagcdn 국가 코드(카드 국기 배지), image 는 아직 자리표시자 사진이다.
      items: [
        {
          country: "ph",
          image: "/images/about/projects/ph-ews4.jpg",
          title: { kr: "필리핀 재해경감을 위한 메트로 마닐라 통합 홍수관리 체계 구축 사업", en: "THE PROJECT \"DEVELOPMENT OF FLOOD FORECASTING AND EARLY WARNING SYSTEM FOR THE GREATER METRO MANILA AND SURROUNDING PROVINCES OF LAGUNA LAKE COMPLEX FOR DISASTER MITIGATION (EWS 4)\"", vn: "필리핀 재해경감을 위한 메트로 마닐라 통합 홍수관리 체계 구축 사업" },
          official: "THE PROJECT \"DEVELOPMENT OF FLOOD FORECASTING AND EARLY WARNING SYSTEM FOR THE GREATER METRO MANILA AND SURROUNDING PROVINCES OF LAGUNA LAKE COMPLEX FOR DISASTER MITIGATION (EWS 4)\"",
          category: { kr: "ODA · 재해관리", en: "ODA · Disaster Management", vn: "ODA · Quản lý thiên tai" },
          description: { kr: "(장기) 필리핀 지속가능한 개발을 위한 재해대비 복원력과 적응능력 강화\n(중기) 광역 메트로 마닐라의 홍수위험경감 및 재해관리 대응체계 강화\n(단기) 광역 메트로 마닐라의 홍수예경보 체계 구축 및 전문인력 양성", en: "(Long term) Strengthening disaster preparedness resilience and adaptive capacity for sustainable development in the Philippines\n(Medium term) Strengthening flood risk reduction and disaster management response systems in the Greater Metro Manila\n(Short term) Establishing a flood forecasting and early warning system and training specialists in the Greater Metro Manila", vn: "(Dài hạn) Tăng cường khả năng phục hồi và thích ứng với thiên tai vì sự phát triển bền vững của Philippines\n(Trung hạn) Tăng cường giảm nhẹ rủi ro lũ lụt và hệ thống ứng phó quản lý thiên tai tại Vùng Đô thị Manila mở rộng\n(Ngắn hạn) Xây dựng hệ thống dự báo, cảnh báo sớm lũ lụt và đào tạo nhân lực chuyên môn" }
        },
        {
          country: "ph",
          image: "/images/about/projects/ph-enris.jpg",
          title: { kr: "필리핀 팔라완 지역 식량 안보 및 기후변화 대응을 위한 환경자원정보시스템(ENRIS) 개발 사업", en: "Environment and Natural Resources Information System (ENRIS) for Palawan towards Food Security and Response to Climate Change", vn: "필리핀 팔라완 지역 식량 안보 및 기후변화 대응을 위한 환경자원정보시스템(ENRIS) 개발 사업" },
          official: "Environment and Natural Resources Information System (ENRIS) for Palawan towards Food Security and Response to Climate Change",
          category: { kr: "ODA · 환경 · 기후", en: "ODA · Environment & Climate", vn: "ODA · Môi trường & Khí hậu" },
          description: { kr: "팔라완 지역 내 수자원/기후/농업 정보의 디지털 관리 시스템 구축을 통해 식량 안보와 기후변화 대응 역량 강화", en: "Strengthening food security and climate change response capacity through the establishment of a digital management system for water, climate and agricultural information in the Palawan region", vn: "Tăng cường an ninh lương thực và năng lực ứng phó biến đổi khí hậu thông qua việc xây dựng hệ thống quản lý số hóa thông tin tài nguyên nước, khí hậu và nông nghiệp tại vùng Palawan" }
        },
        {
          country: "ph",
          image: "",
          title: { kr: "필리핀 사이버 위기대응 역량강화를 위한 국가사이버안전센터 구축사업", en: "Establishment Project of National Cyber Security Center for Enhancing the Cyber Crisis Response Capabilities in the Philippines", vn: "필리핀 사이버 위기대응 역량강화를 위한 국가사이버안전센터 구축사업" },
          official: "Establishment Project of National Cyber Security Center for Enhancing the Cyber Crisis Response Capabilities in the Philippines",
          category: { kr: "ODA · 사이버보안", en: "ODA · Cybersecurity", vn: "ODA · An ninh mạng" },
          description: { kr: "지능형 기술을 적용한 사이버위협 대응 기반 마련을 통해 필리핀 및 일반 국민에게 안전한 사이버환경 제공 및 국제적 신뢰 제고", en: "Providing a safe cyber environment for the Philippines and its citizens and raising international trust, through the establishment of a cyber threat response foundation applying intelligent technologies", vn: "Cung cấp môi trường mạng an toàn cho Philippines và người dân, đồng thời nâng cao niềm tin quốc tế, thông qua việc thiết lập nền tảng ứng phó mối đe dọa mạng ứng dụng công nghệ thông minh" }
        },
        {
          country: "vn",
          image: "/images/about/projects/vn-vku-ict.jpg",
          title: { kr: "베트남 한베 ICT 대학교 교육역량 강화 지원사업", en: "Project for Strengthening Academic Development of the Vietnam-Korea University of Information and Communication Technology (VKU) with regard to ICT Education, Research, and Governance", vn: "베트남 한베 ICT 대학교 교육역량 강화 지원사업" },
          official: "Project for Strengthening Academic Development of the Vietnam-Korea University of Information and Communication Technology (VKU) with regard to ICT Education, Research, and Governance",
          category: { kr: "ODA · 고등교육 ICT", en: "ODA · Higher Education ICT", vn: "ODA · CNTT Giáo dục Đại học" },
          description: { kr: "베트남 한베 ICT 대학교의 교육역량 강화를 통해 베트남 4차 산업혁명을 이끌어 갈 중부지역 고급 ICT 인력양성 기여", en: "Contributing to the training of advanced ICT personnel in the central region who will lead Vietnam's fourth industrial revolution, through strengthening the academic capacity of the Vietnam-Korea University of ICT", vn: "Góp phần đào tạo nhân lực CNTT trình độ cao tại khu vực miền Trung dẫn dắt cuộc cách mạng công nghiệp lần thứ tư của Việt Nam, thông qua việc tăng cường năng lực đào tạo của Trường Đại học CNTT-TT Việt-Hàn" }
        },
        {
          country: "ph",
          image: "",
          title: { kr: "필리핀 사법 효율성 및 접근성 개선을 위한 사법 정보 디지털화 및 역량강화사업('26-'31/1,450만불)", en: "Improving Judicial Efficiency and Accessibility by Innovating Philippine Courts", vn: "필리핀 사법 효율성 및 접근성 개선을 위한 사법 정보 디지털화 및 역량강화사업('26-'31/1,450만불)" },
          official: "Improving Judicial Efficiency and Accessibility by Innovating Philippine Courts",
          category: { kr: "ODA · 사법 디지털화", en: "ODA · Judicial Digitalization", vn: "ODA · Số hóa Tư pháp" },
          description: { kr: "필리핀 사법 시스템의 디지털 혁신을 통해 법원 서비스의 신속한 제공을 촉진하고, 사법 절차의 투명성 및 효율성을 강화하여 모든 시민이 공정하고 신속한 사법 서비스를 받을 수 있도록 함", en: "Promoting the prompt delivery of court services through digital innovation of the Philippine judicial system, and strengthening the transparency and efficiency of judicial procedures so that every citizen can receive fair and timely judicial services", vn: "Thúc đẩy việc cung cấp dịch vụ tòa án nhanh chóng thông qua đổi mới số hệ thống tư pháp Philippines, và tăng cường tính minh bạch, hiệu quả của thủ tục tư pháp để mọi công dân được hưởng dịch vụ tư pháp công bằng và kịp thời" }
        },
        {
          country: "vn",
          image: "/images/about/projects/vn-nontraditional-security.jpg",
          title: { kr: "베트남 사이버보안 전문인력 양성을 위한 비전통보안연구소 지원 사업", en: "Support to Institute of Non-traditional Security of Viet Nam for cybersecurity Capacity building for professionals", vn: "베트남 사이버보안 전문인력 양성을 위한 비전통보안연구소 지원 사업" },
          official: "Support to Institute of Non-traditional Security of Viet Nam for cybersecurity Capacity building for professionals",
          category: { kr: "ODA · 사이버보안 인력양성", en: "ODA · Cyber Workforce", vn: "ODA · Nhân lực An ninh mạng" },
          description: { kr: "베트남 비전통보안연구소 내 사이버보안 교육 실습실 구축, 전문가 양성을 위한 교육 커리큘럼 개발 및 교육 과정 설계를 지원하여 베트남의 사이버보안 연구 역량 및 사이버 위협 대응 역량 강화", en: "Strengthening Vietnam's cybersecurity research capacity and cyber threat response capacity by supporting the establishment of a cybersecurity training laboratory at the Institute of Non-traditional Security, the development of a training curriculum for professionals, and the design of the training courses", vn: "Tăng cường năng lực nghiên cứu an ninh mạng và năng lực ứng phó mối đe dọa mạng của Việt Nam bằng cách hỗ trợ xây dựng phòng thực hành đào tạo an ninh mạng tại Viện An ninh Phi truyền thống, phát triển chương trình đào tạo chuyên gia và thiết kế các khóa học" }
        },
        {
          country: "bd",
          image: "",
          title: { kr: "방글라데시 차토그램 한·방직업훈련원 스마트·그린 선박해체 기술 산업인력 양성사업", en: "Project for Smart & Green Ship-Breaking Workforce Development at Bangladesh-Korea Technical Training Center (BKTTC), Chattogram in Bangladesh", vn: "방글라데시 차토그램 한·방직업훈련원 스마트·그린 선박해체 기술 산업인력 양성사업" },
          official: "Project for Smart & Green Ship-Breaking Workforce Development at Bangladesh-Korea Technical Training Center (BKTTC), Chattogram in Bangladesh",
          category: { kr: "ODA · 직업훈련", en: "ODA · Vocational Training", vn: "ODA · Đào tạo nghề" },
          description: { kr: "방글라데시 선박해체 산업 종사자를 위한 스마트·그린 기반 기술교육 체계를 구축하여 HKC 기준 준수 가능 인력을 양성함으로써 양질의 일자리 창출과 지속가능한 산업 발전에 기여", en: "Contributing to the creation of decent jobs and sustainable industrial development by establishing a smart and green technical training system for workers in Bangladesh's ship-breaking industry and training a workforce capable of complying with HKC standards", vn: "Góp phần tạo việc làm chất lượng và phát triển công nghiệp bền vững bằng cách xây dựng hệ thống đào tạo kỹ thuật thông minh và xanh cho lao động ngành phá dỡ tàu biển Bangladesh, đào tạo nhân lực đáp ứng tiêu chuẩn HKC" }
        },
        {
          country: "bd",
          image: "",
          title: { kr: "방글라데시 AI 혁신기술 전문인력 양성사업", en: "Project For Fostering Innovative Technology Experts with a Focus on AI in the People's republic of Bangladesh", vn: "방글라데시 AI 혁신기술 전문인력 양성사업" },
          official: "Project For Fostering Innovative Technology Experts with a Focus on AI in the People's republic of Bangladesh",
          category: { kr: "ODA · AI 인력양성", en: "ODA · AI Talent", vn: "ODA · Nhân lực AI" },
          description: { kr: "AI-Hub 센터를 중심으로 방글라데시의 디지털 전환, AI 전문인력 양성, 및 4차 산업혁명 기반 생태계 구축을 통해 국가 경쟁력 강화, 산업 발전, 취창업 기회 창출을 지원", en: "Supporting national competitiveness, industrial development and the creation of employment and startup opportunities, through Bangladesh's digital transformation, AI expert training and the building of a fourth-industrial-revolution ecosystem centered on an AI Hub center", vn: "Hỗ trợ nâng cao năng lực cạnh tranh quốc gia, phát triển công nghiệp và tạo cơ hội việc làm, khởi nghiệp, thông qua chuyển đổi số, đào tạo chuyên gia AI và xây dựng hệ sinh thái cách mạng công nghiệp 4.0 lấy trung tâm AI-Hub làm trọng tâm" }
        },
        {
          country: "uz",
          image: "/images/about/projects/uz-cultural-heritage.jpg",
          title: { kr: "우즈베키스탄 문화유산 디지털 통합 관리 및 활용 역량강화사업", en: "Integrated Digital Management and Utilization of Cultural Heritage and Capacity Building Project in Uzbekistan", vn: "우즈베키스탄 문화유산 디지털 통합 관리 및 활용 역량강화사업" },
          official: "Integrated Digital Management and Utilization of Cultural Heritage and Capacity Building Project in Uzbekistan",
          category: { kr: "ODA · 문화유산 DX", en: "ODA · Cultural Heritage DX", vn: "ODA · DX Di sản Văn hóa" },
          description: { kr: "문화유산 디지털 통합 관리 및 활용을 위한 인적/물적/제도적 기반 구축을 통해 관리 역량을 강화하고, 우즈베키스탄 중장기 관광산업 활성화에 기여", en: "Strengthening management capacity through the establishment of human, physical and institutional foundations for the integrated digital management and utilization of cultural heritage, and contributing to the revitalization of Uzbekistan's tourism industry over the medium to long term", vn: "Tăng cường năng lực quản lý thông qua việc xây dựng nền tảng nhân lực, vật chất và thể chế cho quản lý tích hợp kỹ thuật số và sử dụng di sản văn hóa, góp phần thúc đẩy ngành du lịch Uzbekistan trung và dài hạn" }
        }
      ]
    },
    // 특허 3건. 출원번호·발명의명칭은 확정본이다.
    // date 가 비어 있으면 페이지에서 출원일 행이 렌더되지 않는다.
    patents: {
      label: { kr: "Intellectual Property", en: "Intellectual Property", vn: "Sở hữu trí tuệ" },
      title: { kr: "특허가 증명하는 기술력", en: "Technology Proven by Patents", vn: "Năng lực công nghệ được chứng minh qua bằng sáng chế" },
      desc: { kr: "현장에서 검증한 방법론을 특허로 정리하며,\n지니인의 기술력을 하나씩 증명해가고 있습니다.", en: "We formalize field-proven methodologies as patents,\nproving Geniein's technical capability one at a time.", vn: "Chúng tôi hệ thống hóa các phương pháp đã được kiểm chứng thành bằng sáng chế,\nchứng minh năng lực công nghệ của Geniein từng bước một." },
      status: { kr: "출원", en: "Filed", vn: "Đã nộp đơn" },
      office: { kr: "특허청 (KIPO)", en: "KIPO, Republic of Korea", vn: "KIPO, Hàn Quốc" },
      no_label: { kr: "출원번호", en: "Application No.", vn: "Số đơn" },
      date_label: { kr: "출원일", en: "Filing Date", vn: "Ngày nộp" },
      items: [
        {
          no: "10-2025-0217025",
          date: "2025-12-31",
          title: { kr: "기능 점수 기반 B2B 소프트웨어 개발 자동 매칭 및 계약, 지급 통합 시스템 및 그 방법", en: "Function Point-Based System and Method for Automated Matching, Contracting, and Payment Integration in B2B Software Development", vn: "Hệ thống và Phương pháp Tự động Kết nối, Ký kết Hợp đồng và Tích hợp Thanh toán trong Phát triển Phần mềm B2B dựa trên Điểm Chức năng" },
          desc: { kr: "기능점수(FP)로 산정한 개발 규모를 기준으로 발주자와 개발자를 자동 매칭하고, 계약 체결에서 대금 지급까지를 하나의 흐름으로 묶는 기술입니다.", en: "Automatically matching clients and developers on the basis of development scale measured in function points, and binding contracting through payment into a single flow.", vn: "Tự động kết nối bên đặt hàng và nhà phát triển dựa trên quy mô phát triển đo bằng điểm chức năng, liên kết việc ký hợp đồng đến thanh toán thành một luồng duy nhất." }
        },
        {
          no: "10-2025-0217026",
          date: "2025-12-31",
          title: { kr: "AI 기반 소프트웨어 개발 견적 자동화, 매칭 시스템 및 그 방법", en: "AI-Based System and Method for Automating Software Development Estimation and Matching", vn: "Hệ thống và Phương pháp Tự động hóa Báo giá và Kết nối Phát triển Phần mềm dựa trên AI" },
          desc: { kr: "요구사항으로부터 개발 견적을 자동으로 산출하고, 산출된 견적을 기준으로 수행 주체를 매칭하는 기술입니다.", en: "Automatically deriving a development estimate from requirements and matching the party to perform the work on the basis of that estimate.", vn: "Tự động đưa ra báo giá phát triển từ các yêu cầu và kết nối bên thực hiện dựa trên báo giá đó." }
        },
        {
          no: "10-2025-0217028",
          date: "2025-12-31",
          title: { kr: "Web3 기반 기능 단위 소프트웨어 계약 연동형 유틸리티 토큰 시스템 및 그 운영 방법", en: "Web3-Based Utility Token System Linked to Function-Unit Software Contracts and Method of Operating the Same", vn: "Hệ thống Token Tiện ích Liên kết Hợp đồng Phần mềm theo Đơn vị Chức năng dựa trên Web3 và Phương pháp Vận hành" },
          desc: { kr: "기능 단위로 나눈 소프트웨어 계약을 Web3 상에서 연동하고, 이행과 정산에 사용되는 유틸리티 토큰을 운영하는 기술입니다.", en: "Linking software contracts divided into functional units on Web3, and operating a utility token used for performance and settlement.", vn: "Liên kết các hợp đồng phần mềm được chia theo đơn vị chức năng trên Web3, và vận hành token tiện ích dùng cho việc thực hiện và quyết toán." }
        }
      ]
    }
  },
  business: {
    hero: {
      label: { kr: "Business Areas", en: "Business Areas", vn: "Lĩnh vực kinh doanh" },
      title_1: { kr: "BEYOND", en: "BEYOND", vn: "VƯỢT TRÊN" },
      title_2: { kr: "INNOVATION", en: "INNOVATION", vn: "ĐỔI MỚI" },
      description: {
        kr: "현장 중심의 전문 기획과 혁신적인 기술력을 결합하여\n지속 가능한 디지털 성장의 새로운 길을 제시합니다.",
        en: "Combining field-oriented professional planning with innovative technology\nto present new paths for sustainable digital growth.",
        vn: "Kết hợp quy hoạch chuyên nghiệp hướng tới thực địa với công nghệ đổi mới\nđể trình bày những con đường mới cho sự phát triển kỹ thuật số bền vững."
      }
    },
    oda: {
      label: { kr: "ODA Service Scope", en: "ODA Service Scope", vn: "Phạm vi dịch vụ ODA" },
      title: { kr: "글로벌 공공 가치를 창출하는 ODA 전략 파트너", en: "ODA Strategic Partner Creating Global Public Value", vn: "Thiết kế & Triển khai tích hợp ODA" },
      description: {
        kr: "기획조사부터 시스템 구축, 운영 관리까지 프로젝트의 전 과정을 통합적으로 수행합니다. 단순한 인프라 공급을 넘어, 수원국의 자립을 지원하는 최적의 시스템 환경을 구축합니다.",
        en: "We integratedly perform the entire process of a project, from planning and research to system construction and operational management. Beyond simple infrastructure supply, we build an optimal system environment that supports the self-reliance of partner countries.",
        vn: "Chúng tôi thực hiện tích hợp toàn bộ quy trình của một dự án, từ lập kế hoạch và nghiên cứu đến xây dựng hệ thống và quản lý vận hành. Vượt ra ngoài việc cung cấp hạ tầng đơn thuần, chúng tôi xây dựng một môi trường hệ thống tối ưu hỗ trợ sự tự lực của các quốc gia đối tác."
      },
      pillars: [
        {
          title: { kr: "PMC", en: "PMC", vn: "PMC" },
          label: { kr: "Project Management Consultancy", en: "Project Management Consultancy", vn: "Tư vấn quản lý dự án" },
          desc: { kr: "사업 전반의 컨트롤 타워로서 프로젝트 전 과정을 총괄 관리합니다. 예산, 일정, 품질, 리스크 관리 등 기술적·행정적 전문 역량을 통해 사업의 성공을 보장합니다.", en: "Managing the entire project process as a business control tower. Ensuring project success through technical and administrative expertise in budget, schedule, quality, and risk management.", vn: "Quản lý toàn bộ quy trình dự án với tư cách là tháp điều khiển kinh doanh. Đảm bảo thành công của dự án thông qua chuyên môn kỹ thuật và hành chính về ngân sách, tiến độ, chất lượng và quản lý rủi ro." }
        },
        {
          title: { kr: "PC", en: "PC", vn: "PC" },
          label: { kr: "Project Consultant / Coordinator", en: "Project Consultant / Coordinator", vn: "Cố vấn / Điều phối viên dự án" },
          desc: { kr: "현지 파트너 및 이해관계자와의 긴밀한 소통을 전담합니다. 현지 밀착형 코디네이션을 통해 사업의 실질적인 현지화와 성공적인 안착을 이끕니다.", en: "Dedicated to close communication with local partners and stakeholders. Leading real-world localization and successful project settlement through localized coordination.", vn: "Chuyên tâm giao tiếp chặt chẽ với các đối tác và các bên liên quan tại địa phương. Dẫn dắt quá trình nội địa hóa thực tế và ổn định dự án thành công thông qua điều phối cục bộ." }
        },
        {
          title: { kr: "컨설팅", en: "Consulting", vn: "Tư vấn" },
          label: { kr: "Strategy & DX Consulting", en: "Strategy & DX Consulting", vn: "Tư vấn chiến lược & DX" },
          desc: { kr: "타당성 조사(F/S)부터 디지털 전환(DX) 전략 수립까지 최적의 비즈니스 로드맵을 제시합니다. 현장 중심의 정책 자문과 제도 개선을 통해 사업의 안정적인 안착과 지속 가능한 성장을 지원합니다.", en: "Presenting the optimal business roadmap from Feasibility Studies (F/S) to Digital Transformation (DX) strategy. Supporting stable project settlement and sustainable growth through field-oriented policy advisory and institutional improvement.", vn: "Trình bày lộ trình kinh doanh tối ưu từ Nghiên cứu khả thi (F/S) đến chiến lược Chuyển đổi số (DX). Hỗ trợ dự án ổn định và tăng trưởng bền vững thông qua tư vấn chính sách hướng tới thực địa và cải thiện thể chế." }
        }
      ]
    },
    platform: {
      label: { kr: "Platform Innovation", en: "Platform Innovation", vn: "Đổi mới nền tảng" },
      title: { kr: "AI 기반 소프트웨어 생태계의 표준", en: "The Standard for AI-Based Software Ecosystems", vn: "Đổi mới giá trị phần mềm dựa trên AI" },
      description: {
        kr: "단순한 개발을 넘어 기술의 가치를 표준화하고 효율을 극대화합니다.\n지니인은 지능형 엔지니어링을 통해 소프트웨어 시장의 새로운 표준을 제시합니다.",
        en: "Beyond simple development, we standardize technology value and maximize efficiency.\nGeniein presents new standards in the software market through intelligent engineering.",
        vn: "Hơn cả việc phát triển đơn thuần, chúng tôi tiêu chuẩn hóa giá trị công nghệ và tối đa hóa hiệu quả.\nGeniein trình bày các tiêu chuẩn mới trong thị trường phần mềm thông qua kỹ thuật thông minh."
      },
      capabilities: [
        {
          title: { kr: "AI 기반 소프트웨어 가치 산정", en: "AI-Powered Software Estimation", vn: "Ước tính phần mềm bằng AI" },
          desc: { kr: "지능형 AI 엔진과 국제 표준 기능점수(FP) 산정 방식을 결합하여 소프트웨어의 실질적 규모를 객관적으로 측정합니다. 데이터 기반의 정교한 지표를 통해 개발 공수 산정의 표준화를 지향합니다.", en: "Combining intelligent AI engines with International Standard Function Point (FP) estimation to objectively measure the actual scale of software. We aim for the standardization of development effort estimation through sophisticated data-driven metrics.", vn: "Kết hợp các công cụ AI thông minh với phương pháp ước tính Điểm chức năng (FP) Tiêu chuẩn Quốc tế để đo lường khách quan quy mô thực tế của phần mềm. Chúng tôi hướng tới việc tiêu chuẩn hóa việc ước tính nỗ lực phát triển thông qua các số liệu tinh vi dựa trên dữ liệu." }
        },
        {
          title: { kr: "AI 기반 지능형 개발 플랫폼", en: "AI-Driven Development Intelligence", vn: "Nền tảng phát triển bằng AI" },
          desc: { kr: "자연어 기반의 지능형 개발 환경인 AI Studio를 통해 혁신적인 아이디어를 기술로 구체화합니다. AI 기술을 활용하여 소프트웨어 개발 생산성을 획기적으로 높입니다.", en: "Materializing innovative ideas into technology through AI Studio, a natural language-based intelligent development environment. Drastically increasing software development productivity using AI technology.", vn: "Hiện thực hóa các ý tưởng đổi mới thành công nghệ thông qua AI Studio, một môi trường phát triển thông minh dựa trên ngôn ngữ tự nhiên. Tăng đáng kể năng suất phát triển phần mềm bằng công nghệ AI." }
        },
        {
          title: { kr: "안정적 기술 운영 및 호스팅", en: "Reliable Technical Operations", vn: "Vận hành kỹ thuật đáng tin cậy" },
          desc: { kr: "소프트웨어가 안정적으로 서비스될 수 있도록 최적의 호스팅과 기술 지원을 제공합니다. 개발부터 운영까지 프로젝트의 전 과정을 신뢰할 수 있는 기술력으로 뒷받침합니다.", en: "Providing optimal hosting and technical support for stable software services. Supporting the entire project process from development to operation with reliable technical expertise.", vn: "Cung cấp dịch vụ hosting và hỗ trợ kỹ thuật tối ưu để dịch vụ phần mềm ổn định. Hỗ trợ toàn bộ quy trình dự án từ phát triển đến vận hành với chuyên môn kỹ thuật đáng tin cậy." }
        }
      ],
      vision_title: { kr: "지속 가능한 기술 생태계", en: "Sustainable Tech Ecosystem", vn: "Hệ sinh thái công nghệ bền vững" },
      vision_desc: {
        kr: "지니인은 기술의 발전이 모두의 혜택으로 돌아가는 지속 가능한 생태계를 꿈꿉니다. 인류와 기술이 조화롭게 공존하며, 새로운 가치를 지속적으로 창출하는 미래를 향해 나아가겠습니다.",
        en: "Geniein dreams of a sustainable ecosystem where technological advancement benefits everyone. We will move toward a future where humanity and technology coexist harmoniously and create new value.",
        vn: "Geniein mơ về một hệ sinh thái bền vững nơi sự tiến bộ công nghệ mang lại lợi ích cho tất cả mọi người. Chúng tôi sẽ hướng tới một tương lai nơi nhân loại và công nghệ cùng tồn tại hài hòa và tạo ra giá trị mới."
      }
    }
  },
  contact: {
    hero: {
      label: { kr: "Contact Us", en: "Contact Us", vn: "Liên hệ với chúng tôi" },
      title_1: { kr: "GROW", en: "GROW", vn: "CÙNG NHAU" },
      title_2: { kr: "TOGETHER", en: "TOGETHER", vn: "PHÁT TRIỂN" },
      description: {
        kr: "글로벌 시장의 가능성을 현실로 연결하는 지니인\n새로운 비즈니스의 시작을 위한 최적의 파트너십을 제안합니다.",
        en: "Geniein connects global market possibilities to reality.\nWe propose the optimal partnership for your new business journey.",
        vn: "Geniein kết nối các khả năng của thị trường toàn cầu với thực tế.\nChúng tôi đề xuất mối quan hệ đối tác tối ưu cho hành trình kinh doanh mới của bạn."
      }
    },
    section: {
      label: { kr: "Global Partnership", en: "Global Partnership", vn: "Hợp tác toàn cầu" },
      title: { kr: "데이터로 설계하는 새로운 비즈니스 라우팅", en: "New Business Routing Designed with Data", vn: "Định hướng kinh doanh mới được thiết kế bằng dữ liệu" },
      desc: { kr: "데이터 기반의 깊이 있는 분석과 통찰을 통해\n비즈니스 성장을 위한 최적의 솔루션을 설계합니다.", en: "We design optimal solutions for business growth\nthrough in-depth data-based analysis and insights.", vn: "Chúng tôi thiết kế các giải pháp tối ưu cho sự phát triển kinh doanh\nthông qua phân tích chuyên sâu và hiểu biết dựa trên dữ liệu." }
    },
    form: {
      label: { kr: "Inquiry Form", en: "Inquiry Form", vn: "Mẫu yêu cầu" },
      name: { kr: "이름", en: "Name", vn: "Tên" },
      name_ph: { kr: "이름", en: "Name", vn: "Họ và tên" },
      email: { kr: "이메일", en: "Email", vn: "Email" },
      email_ph: { kr: "email@example.com", en: "email@example.com", vn: "email@example.com" },
      phone: { kr: "담당자 연락처", en: "Phone Number", vn: "Số điện thoại" },
      phone_ph: { kr: "010-0000-0000", en: "Phone Number", vn: "Số điện thoại" },
      org: { kr: "소속 기관/기업", en: "Organization", vn: "Tổ chức" },
      org_ph: { kr: "지니인 주식회사", en: "Geniein Inc.", vn: "Geniein Inc." },
      type: { kr: "문의 유형", en: "Inquiry Type", vn: "Loại yêu cầu" },
      type_oda: { kr: "ODA 컨설팅 문의", en: "ODA Consulting", vn: "Tư vấn ODA" },
      type_platform: { kr: "플랫폼 구축/파트너십 문의", en: "Platform / Partnership", vn: "Nền tảng / Hợp tác" },
      type_tech: { kr: "기술 협력 문의", en: "Tech Collaboration", vn: "Hợp tác kỹ thuật" },
      type_etc: { kr: "기타 문의", en: "Other Inquiry", vn: "Yêu cầu khác" },
      message: { kr: "메시지", en: "Message", vn: "Tin nhắn" },
      message_ph: { kr: "문의 내용을 작성해주세요", en: "Please describe your inquiry", vn: "Vui lòng mô tả yêu cầu của bạn" },
      submit: { kr: "보내기", en: "Send Message", vn: "Gửi tin nhắn" },
      success_title: { kr: "메시지가 성공적으로 전송되었습니다", en: "Message Sent Successfully", vn: "Đã gửi tin nhắn thành công" },
      success_desc: { kr: "문의가 정상적으로 접수되었습니다.\n최대한 빠르게 답변 드리겠습니다.", en: "We have received your message and\nwill get back to you as soon as possible.", vn: "Chúng tôi đã nhận được tin nhắn của bạn\nvà sẽ phản hồi sớm nhất có thể." },
      new_btn: { kr: "새로운 문의하기", en: "New Inquiry", vn: "Yêu cầu mới" },
      error_title: { kr: "전송에 실패했습니다.", en: "Failed to send.", vn: "Gửi không thành công." },
      error_desc: { kr: "메시지 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.", en: "Failed to send your message. Please try again later.", vn: "Gửi tin nhắn không thành công. Vui lòng thử lại sau." },
      retry_btn: { kr: "다시 시도", en: "Try Again", vn: "Thử lại" },
      close_btn: { kr: "닫기", en: "Close", vn: "Đóng" },
      intro: { kr: "글로벌 비즈니스 협력,\n지니인이 함께하겠습니다.", en: "Global business cooperation,\nGeniein will be with you.", vn: "Hợp tác kinh doanh toàn cầu,\nGeniein sẽ luôn đồng hành." },
      errors: {
        name: { kr: "이름을 입력해주세요", en: "Please enter your name", vn: "Vui lòng nhập tên của bạn" },
        email: { kr: "올바른 이메일 주소를 입력해주세요", en: "Please enter a valid email address", vn: "Vui lòng nhập địa chỉ email hợp lệ" },
        phone: { kr: "연락처를 입력해주세요", en: "Please enter your phone number", vn: "Vui lòng nhập số điện thoại của bạn" },
        org: { kr: "소속 기관을 입력해주세요", en: "Please enter your organization", vn: "Vui lòng nhập tổ chức của bạn" },
        message: { kr: "문의 내용을 입력해주세요", en: "Please enter your message", vn: "Vui lòng nhập tin nhắn của bạn" }
      }
    },
    info: {
      title: { kr: "Contact Information", en: "Contact Information", vn: "Thông tin liên hệ" },
      seoul: { kr: "서울 본사", en: "Seoul HQ", vn: "Trụ sở chính tại Seoul" },
      hanoi: { kr: "하노이 R&D 센터", en: "Hanoi R&D Center", vn: "Trung tâm R&D Hà Nội" },
      hours: { kr: "영업 시간", en: "Business Hours", vn: "Giờ làm việc" }
    },
    faq: {
      title: { kr: "Frequently Asked Questions", en: "Frequently Asked Questions", vn: "Câu hỏi thường gặp" },
      items: [
        {
          q: { kr: "ODA 프로젝트 컨설팅의 범위는 어디까지인가요?", en: "What are the primary countries and fields for ODA consulting?", vn: "Các quốc gia 및 lĩnh vực chính cho tư vấn ODA là gì?" },
          a: { kr: "지니인은 사업 타당성 조사(F/S)부터 기본 설계, 조달 지원, 시공 감리(PMC), 그리고 사후 평가에 이르기까지 ODA 프로젝트의 전 생애주기를 지원합니다.", en: "Geniein performs numerous PMC and consulting projects in digital transformation, public administration efficiency, and educational IT infrastructure, primarily in Southeast Asia (Vietnam, Laos, etc.) and Central Asia.", vn: "Geniein thực hiện nhiều dự án PMC 및 tư vấn về chuyển đổi số, hiệu quả hành chính công 및 cơ sở hạ tầng CNTT giáo dục, chủ yếu ở Đông Nam Á (Việt Nam, Lào, v.v.) 및 Trung Á." }
        },
        {
          q: { kr: "플랫폼 파트너십은 어떤 방식으로 진행되나요?", en: "How does the platform partnership work?", vn: "Hợp tác nền tảng hoạt động như thế nào?" },
          a: { kr: "지니인의 가치 산정 엔진을 도입하려는 기업이나, 개발 자산을 디지털화하여 관리하고자 하는 파트너사를 대상으로 기술 라이선싱 및 공동 사업 모델 개발을 진행합니다. 문의 폼을 통해 상세 제안을 주시면 개별 상담을 도와드립니다.", en: "We provide technology licensing and joint business model development for companies looking to adopt Geniein's value estimation engine or partners wanting to manage development assets digitally. Please provide detailed proposals via the contact form for individual consultation.", vn: "Chúng tôi cung cấp cấp phép công nghệ 및 phát triển mô hình kinh doanh chung cho các công ty muốn áp dụng công cụ ước tính giá trị của Geniein hoặc các đối tác muốn quản lý tài sản phát triển theo cách kỹ thuật số. Vui lòng cung cấp đề xuất chi tiết thông qua mẫu liên hệ để được tư vấn cá nhân." }
        },
        {
          q: { kr: "글로벌 지사와의 협업이 가능한가요?", en: "Is it possible to collaborate with global branches?", vn: "Có thể hợp tác với các chi nhánh toàn cầu không?" },
          a: { kr: "네, 서울 본사와 하노이 R&D 센터 간의 유기적인 협업 시스템을 통해 글로벌 프로젝트를 지원합니다. 특히 베트남 현지 진출이나 네트워크가 필요한 사업의 경우 하노이 센터의 전문 인력을 통해 즉각적인 대응이 가능합니다.", en: "Yes, we support global projects through an organic collaboration system between our Seoul HQ and Hanoi R&D Center. Especially for businesses requiring entry into Vietnam or local networking, immediate response is possible through our expert staff in Hanoi.", vn: "Có, chúng tôi hỗ trợ các dự án toàn cầu thông qua hệ thống cộng tác hữu cơ giữa Trụ sở chính tại Seoul 및 Trung tâm R&D Hà Nội. Đặc biệt đối với các doanh nghiệp yêu cầu thâm nhập vào Việt Nam hoặc mạng lưới địa phương, phản hồi ngay lập tức là có thể thông qua đội ngũ chuyên gia của chúng tôi tại Hanoi." }
        }
      ]
    }
  },
  careers: {
    hero: {
      label: { kr: "Careers at Geniein", en: "Careers at Geniein", vn: "Careers at Geniein" },
      title_1: { kr: "BEYOND", en: "BEYOND", vn: "BEYOND" },
      title_2: { kr: "BORDERS", en: "BORDERS", vn: "BORDERS" },
      description: {
        kr: "지역과 분야의 경계를 넘어, 현장과 기술을 함께 만들어갈 인재를 찾습니다.",
        en: "Beyond the borders of geography and discipline — we are looking for people to build the field and the technology with us.",
        vn: "Vượt qua ranh giới của địa lý và lĩnh vực, chúng tôi tìm kiếm những người cùng xây dựng hiện trường và công nghệ."
      }
    },
    jobs: {
      label: { kr: "Open Positions", en: "Open Positions", vn: "Vị trí đang tuyển" },
      title: { kr: "채용 중인 포지션", en: "Positions We Are Hiring", vn: "Các vị trí đang tuyển dụng" },
      desc: {
        kr: "관심 있는 근무지를 선택해 공고를 확인하세요.\n지원 절차와 상세 요건은 각 공고를 펼치면 볼 수 있습니다.",
        en: "Pick a location to narrow the list.\nExpand a posting to see the full requirements and how to apply.",
        vn: "Chọn địa điểm bạn quan tâm để lọc danh sách.\nMở rộng tin tuyển dụng để xem yêu cầu chi tiết và cách ứng tuyển."
      },
      filter_all: { kr: "전체", en: "All", vn: "Tất cả" },
      filter_department: { kr: "부문", en: "Team", vn: "Bộ phận" },
      filter_location: { kr: "근무지", en: "Location", vn: "Địa điểm" },
      filter_reset: { kr: "필터 초기화", en: "Reset filters", vn: "Đặt lại bộ lọc" },
      count_template: { kr: "총 {count}건의 공고", en: "{count} open positions", vn: "{count} vị trí đang tuyển" },
      deadline_label: { kr: "마감일", en: "Deadline", vn: "Hạn nộp" },
      rolling: { kr: "상시 채용", en: "Rolling", vn: "Tuyển liên tục" },
      responsibilities: { kr: "주요 업무", en: "What You Will Do", vn: "Nhiệm vụ chính" },
      requirements: { kr: "자격 요건", en: "Requirements", vn: "Yêu cầu" },
      preferred: { kr: "우대 사항", en: "Nice to Have", vn: "Ưu tiên" },
      apply: { kr: "이 포지션 지원하기", en: "Apply for this role", vn: "Ứng tuyển vị trí này" }
    },
    cta: {
      label: { kr: "Careers", en: "Careers", vn: "Careers" },
      title: { kr: "지니인과 함께할 인재를 찾습니다", en: "We are looking for people to build Geniein with", vn: "Chúng tôi đang tìm những người cùng xây dựng Geniein" },
      desc: {
        kr: "지니인에 관심이 있으시다면 지원서를 남겨 주십시오.\n담당자가 꼼꼼히 검토한 후 연락드리겠습니다.",
        en: "If you're interested in joining Geniein, please submit your application.\nOur team will carefully review it and get back to you.",
        vn: "Nếu bạn quan tâm đến việc gia nhập Geniein, vui lòng gửi hồ sơ ứng tuyển.\nĐội ngũ của chúng tôi sẽ xem xét kỹ lưỡng và phản hồi bạn."
      },
      button: { kr: "일반 지원하기", en: "Submit an open application", vn: "Ứng tuyển tự do" }
    },
    apply: {
      title: { kr: "지원서 작성", en: "Apply", vn: "Đơn ứng tuyển" },
      subtitle: { kr: "아래 정보를 남겨 주시면 담당자가 검토 후 연락드립니다.", en: "Leave your details and our team will review and get back to you.", vn: "Để lại thông tin của bạn, đội ngũ của chúng tôi sẽ xem xét và phản hồi." },
      position: { kr: "지원 포지션", en: "Position", vn: "Vị trí ứng tuyển" },
      general: { kr: "일반 지원 (포지션 미지정)", en: "Open application (no specific role)", vn: "Ứng tuyển tự do (không chỉ định vị trí)" },
      name: { kr: "이름", en: "Name", vn: "Họ và tên" },
      name_ph: { kr: "홍길동", en: "Your name", vn: "Họ và tên của bạn" },
      email: { kr: "이메일", en: "Email", vn: "Email" },
      email_ph: { kr: "email@example.com", en: "email@example.com", vn: "email@example.com" },
      phone: { kr: "연락처", en: "Phone", vn: "Số điện thoại" },
      phone_ph: { kr: "010-0000-0000", en: "Phone number", vn: "Số điện thoại" },
      intro: { kr: "간단한 자기소개", en: "Short introduction", vn: "Giới thiệu ngắn" },
      intro_ph: { kr: "지원 동기와 관련 경험을 간단히 적어 주세요.", en: "Briefly tell us why you are applying and what you have done.", vn: "Hãy cho chúng tôi biết lý do ứng tuyển và kinh nghiệm của bạn." },
      resume: { kr: "이력서 첨부", en: "Resume", vn: "Hồ sơ" },
      resume_hint: { kr: "PDF · DOC · DOCX, 10MB 이하", en: "PDF, DOC or DOCX, up to 10MB", vn: "PDF, DOC hoặc DOCX, tối đa 10MB" },
      resume_button: { kr: "파일 선택", en: "Choose file", vn: "Chọn tệp" },
      resume_none: { kr: "선택된 파일 없음", en: "No file selected", vn: "Chưa chọn tệp" },
      resume_clear: { kr: "첨부 취소", en: "Remove", vn: "Bỏ tệp" },
      submit: { kr: "지원서 제출", en: "Submit application", vn: "Gửi hồ sơ" },
      cancel: { kr: "취소", en: "Cancel", vn: "Hủy" },
      close: { kr: "닫기", en: "Close", vn: "Đóng" },
      success_title: { kr: "지원서가 접수되었습니다", en: "Application received", vn: "Đã nhận hồ sơ" },
      success_desc: { kr: "검토 후 기재해 주신 연락처로 회신드리겠습니다.", en: "We will review it and reply to the contact you provided.", vn: "Chúng tôi sẽ xem xét và phản hồi qua thông tin liên hệ bạn cung cấp." },
      errors: {
        name: { kr: "이름을 입력해주세요", en: "Please enter your name", vn: "Vui lòng nhập tên của bạn" },
        email: { kr: "올바른 이메일 주소를 입력해주세요", en: "Please enter a valid email address", vn: "Vui lòng nhập địa chỉ email hợp lệ" },
        phone: { kr: "연락처를 입력해주세요", en: "Please enter your phone number", vn: "Vui lòng nhập số điện thoại của bạn" },
        intro: { kr: "간단한 자기소개를 입력해주세요", en: "Please write a short introduction", vn: "Vui lòng viết giới thiệu ngắn" },
        resume: { kr: "이력서 파일을 첨부해주세요", en: "Please attach your resume", vn: "Vui lòng đính kèm hồ sơ của bạn" },
        resume_type: { kr: "PDF, DOC, DOCX 파일만 첨부할 수 있습니다", en: "Only PDF, DOC and DOCX files are accepted", vn: "Chỉ chấp nhận tệp PDF, DOC và DOCX" },
        resume_size: { kr: "파일 용량은 10MB 를 넘을 수 없습니다", en: "The file must be 10MB or smaller", vn: "Tệp không được vượt quá 10MB" },
        submit: { kr: "전송에 실패했습니다. 잠시 후 다시 시도해주세요.", en: "Sending failed. Please try again in a moment.", vn: "Gửi không thành công. Vui lòng thử lại sau." },
      }
    },
    items: []
  },
  /**
   * Connext 인트로. 문구는 Connext 저장소(messages/*.json 의 gnom.intro)에서
   * 그대로 가져왔다 — 같은 제품을 가리키므로 양쪽이 갈라지면 안 된다.
   * 원본이 바뀌면 여기도 같이 고친다.
   */
  connext: {
    intro: {
      skip: { kr: "건너뛰기", en: "Skip", vn: "Bỏ qua" },
      estimator: {
        name: { kr: "Estimator", en: "Estimator", vn: "Estimator" },
        set: { kr: "아이디어를 입력하면", en: "Type your idea", vn: "Nhập ý tưởng của bạn" },
        hit: { kr: "견적부터 개발사가 정리됩니다", en: "You get an estimate and a dev partner", vn: "Bạn nhận được báo giá và đơn vị phát triển" }
      },
      studio: {
        name: { kr: "Studio", en: "Studio", vn: "Studio" },
        set: { kr: "한 문장으로", en: "From one sentence", vn: "Chỉ với một câu" },
        hit: { kr: "앱이 만들어집니다", en: "You get a working app", vn: "Bạn nhận được ứng dụng chạy được" }
      },
      fx: {
        cost: {
          label: { kr: "예상 개발비", en: "Estimated cost", vn: "Chi phí dự kiến" },
          value: { kr: "₩ 188,100,000", en: "188M KRW", vn: "188 triệu KRW" }
        },
        effort: {
          label: { kr: "투입 공수", en: "Effort", vn: "Nhân lực" },
          value: { kr: "12.4 MM", en: "12.4 MM", vn: "12.4 MM" }
        },
        vendor: {
          label: { kr: "현지 개발사", en: "Local vendors", vn: "Nhà thầu bản địa" },
          value: { kr: "66곳", en: "66", vn: "66" }
        }
      }
    },
    /* 액자 안 랜딩 화면 문구. Connext 저장소 messages/*.json 의 gnom.content 원문. */
    landing: {
      title: { kr: "AI가 개발을 대신합니다", en: "AI builds it for you", vn: "AI phát triển thay bạn" },
      desc: { kr: "아이디어를 입력하면, GNOM AI가 요구사항 분석부터 개발팀 선정, 코딩까지 자동으로 수행합니다.", en: "Describe your idea and GNOM AI handles requirements, team selection and coding.", vn: "Nhập ý tưởng, GNOM AI sẽ tự động phân tích yêu cầu, chọn đội ngũ và lập trình." },
      placeholder: { kr: "어떤 프로젝트를 만들고 싶으신가요?", en: "What would you like to build?", vn: "Bạn muốn xây dựng dự án gì?" },
      button: { kr: "무료 견적 받기", en: "Get an estimate", vn: "Nhận báo giá" }
    },
    cta: {
      label: { kr: "Connext", en: "Connext", vn: "Connext" },
      title: { kr: "Connext의 AI 에이전트, GNOM", en: "GNOM, the AI agents of Connext", vn: "GNOM, tác nhân AI của Connext" },
      desc: { kr: "Estimator는 요구사항을 분석해 개발사를 추천하고,\nStudio는 아이디어만으로 앱을 만듭니다.", en: "Estimator analyses your requirements and recommends vendors,\nStudio turns an idea alone into a working app.", vn: "Estimator phân tích yêu cầu và giới thiệu nhà thầu,\nStudio biến ý tưởng thành ứng dụng." },
      button: { kr: "Connext 둘러보기", en: "Explore Connext", vn: "Khám phá Connext" },
      replay: { kr: "인트로 다시 보기", en: "Replay the intro", vn: "Xem lại phần giới thiệu" }
    }
  }
} as const

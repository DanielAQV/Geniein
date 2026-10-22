/**
 * 온보딩 메시지. ★ 초안이다 — HR(Admin Team)이 실제 첫 주 절차에 맞게 고친다.
 *
 * 회사 고유 사실(계정 발급 담당, 장비, 근무시간)은 일부러 적지 않았다. 모르는 것을
 * 지어 넣으면 신입이 첫날 틀린 안내를 받는다. 확인되면 여기에 채운다.
 *
 * {name} {team} 은 등록할 때 값으로 바뀐다. 베트남어가 먼저, 영어가 뒤.
 * day 는 입사일 기준 경과일. 연결(코드 입력) 시점에 이미 지난 단계는 몰아서 보내지 않고
 * 가장 최근 하나만 보낸다.
 */
export interface OnboardingStep {
  day: number;
  text: string;
}

export const WELCOME =
  'Xin chào {name}! Tôi là Genie, trợ lý nội bộ của Genie Group. ' +
  'Từ nay bạn có thể hỏi tôi về quy định công ty (chấm công, phụ cấp, công tác…) ngay tại đây.\n\n' +
  'Hello {name}, I am Genie, Genie Group’s internal assistant. ' +
  'You can ask me about company regulations here anytime.';

export const STEPS: OnboardingStep[] = [
  {
    day: 0,
    text:
      'Ngày đầu tiên — danh sách cần kiểm tra:\n' +
      '1) Đăng nhập Hanbiro (chấm công, nghỉ phép)\n' +
      '2) Gặp trưởng nhóm {team}\n' +
      '3) Đọc nội quy công ty — hỏi tôi bất cứ điều gì chưa rõ\n\n' +
      'Day 1 checklist: 1) Log in to Hanbiro 2) Meet your {team} team leader 3) Read the company rules — ask me anything.',
  },
  {
    day: 2,
    text:
      'Bạn đã quen với Hanbiro chưa? Nếu có câu hỏi về giờ làm, làm thêm giờ hay phụ cấp, cứ nhắn tôi.\n\n' +
      'Getting used to Hanbiro? Ask me about working hours, overtime or allowances anytime.',
  },
  {
    day: 6,
    text:
      'Tuần đầu tiên sắp kết thúc. Có điều gì chưa rõ hoặc cần hỗ trợ không? Tôi sẽ chuyển cho bộ phận Admin nếu cần.\n\n' +
      'Your first week is almost done. Anything unclear? I can pass it to the Admin team.',
  },
];

export function fill(
  text: string,
  v: { name: string; team: string | null },
): string {
  return text.replaceAll('{name}', v.name).replaceAll('{team}', v.team ?? '');
}

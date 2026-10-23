// @ts-nocheck -- direct DOM drawing code, kept as written in the standalone page

// Builds the road, milestones and panel inside the markup above. Runs once per page load.
export function startRoadmap() {

// one accent for what is happening now; everything else is tone
const ACCENT = '#e6c483';
const TONE = { done: '#e9e6df', now: ACCENT, next: '#d4bd8c', far: '#9a8b70' };
// champagne to ice: the light of what is happening now, running toward BCI
const GRAD = 'linear-gradient(120deg, #fbf1dc 0%, #e6c483 50%, #b98a3e 100%)';
// completed: a lit lantern that stays lit, warm gold with a soft glow
const PEARL = 'radial-gradient(circle at 40% 35%, #fff3d6 0%, #e7c27a 45%, #b98a3e 100%)';
const PHASES = {
  cx: { name: 'Connext', color: '#b9b6ae' },
  gn: { name: 'GNOM', color: '#b9b6ae' },
  tk: { name: 'Genie T', color: '#b9b6ae' },
  rnd: { name: 'R&D', color: '#b9b6ae' },
  bci: { name: 'BCI', color: '#b9b6ae' }
};

// road: which track, y: height on the map (8000 = today's end, 0 = horizon), side: label side
const MILESTONES = [
  // Connext
  { id: 'open', road: 'cx', y: 7750, side: 'r', phase: 'cx', short: 'Connext 오픈', title: 'Connext 오픈', when: '2026.10.15', status: 'done', desc: '',
    subs: [] },
  { id: 'studio', road: 'gn', y: 7750, side: 'l', phase: 'gn', short: 'GNOM 오픈', title: 'GNOM 오픈', when: '2026.10.15', status: 'done', desc: '',
    subs: [['Estimator: FP 기반 개발 견적', '', 'done'], ['Studio: 바이브코딩 홈페이지 제작', '', 'done'], ['유료 결제 개시', '', 'done']] },
  { id: 'admin', road: 'gn', y: 7330, side: 'l', phase: 'gn', short: 'Studio 백엔드', title: 'Studio 백엔드', when: '2026.12.31', status: 'now',
    desc: 'Studio로 만든 홈페이지에 데이터와 백엔드 기능 연결. 정적 페이지에서 실제로 운영되는 사이트로',
    subs: [['사이트별 API·데이터베이스', '', 'now'], ['외부 서비스 연동 (문자 등)', '', 'now'], ['AI가 대화로 백엔드 기능 추가', '', 'now']] },
  { id: 'gm', road: 'cx', y: 6100, side: 'r', phase: 'cx', short: 'Global Matching', title: 'Global Matching', when: '2027.06.15', status: 'now',
    desc: '한국 기업의 개발 일과 해외 개발사 연결',
    subs: [['법인 간 계약·정산 구조', '', 'done'], ['기능 명세', '', 'now'], ['출시', '2027.06.15', 'next']] },

  // GNOM
  { id: 'chat', road: 'gn', y: 6700, side: 'l', phase: 'gn', short: 'GNOM Chat', title: 'GNOM Chat', when: '2027.03.15', status: 'now',
    desc: 'Beyond Communication. 관계를 기억하고, 대화하며 스스로 원칙을 세워 가는 AI',
    subs: [['기능 정의', '', 'now'], ['관계 기억 (Relationship history)', '', 'next'], ['스스로 세우는 원칙 (Principles)', '', 'next'], ['사진 · 음성 · 텍스트 대화', '', 'next'], ['출시', '2027.03.15', 'next']] },
  { id: 'video', road: 'gn', y: 6250, side: 'l', phase: 'gn', short: 'GNOM Chat 영상 통화', title: 'GNOM Chat 영상 통화', when: '2027.06.15', status: 'next',
    desc: '얼굴을 보며 나누는 AI와의 실시간 대화',
    subs: [['움직이는 AI 얼굴 (실시간 표정·입 모양)', '', 'next'], ['상대 얼굴 보며 대화', '', 'next'], ['통화 중 카메라로 보여 주기', '', 'next']] },
  { id: 'love', road: 'gn', y: 5300, side: 'l', phase: 'gn', short: 'GNOM Love', title: 'GNOM Love', when: '2027.10.15', status: 'next', desc: '', subs: [] },
  { id: 'pro', road: 'gn', y: 4900, side: 'l', phase: 'gn', short: 'GNOM Chat 전문 분야', title: 'GNOM Chat 전문 분야', when: '2027.12.15', status: 'next',
    desc: '',
    subs: [['건강 정보', '', 'next'], ['법률 정보', '', 'next'], ['학습', '', 'next'], ['마음 돌봄 대화', '', 'next']] },

  // Genie T
  { id: 'entity', road: 'tk', y: 6800, side: 'r', phase: 'tk', short: 'Genie T 발행법인 설립', title: 'Genie T 발행법인 설립', when: '2027.03', status: 'next',
    desc: '발행 국가 결정과 발행법인 설립. Seed 판매의 전제',
    subs: [['발행 국가 규제 검토', '', 'next'], ['발행 국가 결정', '', 'next'], ['발행법인 설립', '', 'next'], ['지니인 ↔ 발행법인 IP·서비스 계약', '', 'next'], ['판매대행사 선정', '', 'next'], ['백서', '', 'next']] },
  { id: 'seed', road: 'tk', y: 6450, side: 'r', phase: 'tk', short: 'Seed 투자', title: 'Seed 투자', when: '2027.04 ~ 06', status: 'next',
    desc: '판매 절차의 법적 확정 후 해외 투자자 대상 투자 유치',
    subs: [['판매 절차 확정', '', 'next'], ['투자자 확인 (KYC·AML)', '', 'next'], ['투자 계약 체결', '', 'next']] },
  { id: 'token', road: 'tk', y: 5500, side: 'r', phase: 'tk', short: 'Genie T 발행', title: 'Genie T 발행', when: '2027.09.15', status: 'next',
    desc: '발행법인을 통한 발행과 Seed 투자자 배분',
    subs: [['토큰 스마트 계약 개발·감사', '', 'next'], ['발행', '2027.09.15', 'next'], ['Seed 투자자 배분', '', 'next']] },
  { id: 'follow', road: 'tk', y: 4850, side: 'r', phase: 'tk', short: '후속 투자 · 상장 준비', title: '후속 투자 · 상장 준비', when: '2027.10 ~ 12', status: 'next',
    desc: '',
    subs: [['후속 투자', '', 'next'], ['유통량·보유자 정보 공시', '', 'next'], ['거래소 심사 준비', '', 'next']] },
  { id: 'listing', road: 'tk', y: 4150, side: 'r', phase: 'tk', short: '거래소 상장', title: '거래소 상장', when: '발행 이후', status: 'next',
    desc: '해외 거래소부터 상장',
    subs: [['해외 거래소', '', 'next'], ['국내 거래소 (관련 법 시행 후)', '', 'next']] },

  // beyond the listed plans: the road toward BCI, in broad strokes
  { id: 'web3', road: 'tk', y: 4300, side: 'r', phase: 'tk', short: 'Web3 소프트웨어 마켓플레이스', title: 'Web3 소프트웨어 마켓플레이스', when: '구상', status: 'far',
    desc: '개발사가 만든 소프트웨어의 Genie T 거래. FP 기반 가격, 거래마다 FP × 단가만큼 토큰 발행',
    subs: [['FP 기반 소프트웨어 가격', '', 'next'], ['Genie T 결제·정산', '', 'next'], ['계약 단위 토큰 발행', '', 'next']] },
  { id: 'emotion', road: 'gn', y: 3700, side: 'l', phase: 'gn', short: '마음을 알아차리는 GNOM', title: '마음을 알아차리는 GNOM', when: '구상', status: 'far',
    desc: '목소리, 표정, 대화의 흐름에서 상대의 마음을 알아차리는 대화',
    subs: [['감정·상태 인식', '', 'next'], ['마음에 맞춘 대화', '', 'next']] },
  { id: 'wordless', road: 'gn', y: 3620, side: 'l', phase: 'gn', short: '말 없이도 대화하는 GNOM', title: '말 없이도 대화하는 GNOM', when: '구상', status: 'far',
    desc: '그림, 선택, 표정 같은 짧은 신호만으로 나누는 대화. 관계 기억을 바탕으로 하고 싶은 말을 완성하는 GNOM',
    subs: [['그림·선택 입력', '', 'next'], ['표정·몸짓 입력', '', 'next'], ['관계 기억으로 말 완성', '', 'next']] },
  { id: 'aidev', road: 'cx', y: 3550, side: 'r', phase: 'cx', short: 'AI·데이터 개발 매칭', title: 'AI·데이터 개발 매칭', when: '구상', status: 'far',
    desc: '웹·앱 개발에서 AI 모델, 데이터 수집과 라벨링까지 매칭 범위 확장',
    subs: [['AI 모델 개발 매칭', '', 'next'], ['데이터 수집·라벨링 매칭', '', 'next']] },
  { id: 'model', road: 'gn', y: 3400, side: 'l', phase: 'gn', short: 'GNOM 자체 AI 모델', title: 'GNOM 자체 AI 모델', when: '구상', status: 'far',
    desc: 'Estimator, Studio, Chat에서 쌓인 데이터로 자체 모델 학습',
    subs: [['데이터 수집·정제 체계', '', 'next'], ['자체 모델 학습', '', 'next'], ['GNOM 서비스 적용', '', 'next']] },
  { id: 'bio', road: 'gn', y: 3150, side: 'l', phase: 'gn', short: '생체 신호 연동', title: '생체 신호 연동', when: '구상', status: 'far',
    desc: '워치 같은 웨어러블의 심박·수면 신호를 대화에 반영',
    subs: [['웨어러블 연동', '', 'next'], ['심박·수면 신호 반영', '', 'next']] },
  { id: 'eeg', road: 'gn', y: 2450, side: 'l', phase: 'gn', short: '뇌파 대화 데이터', title: '뇌파 대화 데이터', when: '구상', status: 'far',
    desc: '사용자의 대화와 뇌파를 함께 모은 해독 모델 학습 데이터',
    subs: [['동의 기반 수집', '', 'next'], ['대화·뇌파 쌍 데이터 구축', '', 'next']] },
  { id: 'lab', road: 'gn', y: 2900, side: 'l', phase: 'rnd', short: 'BCI Lab', title: 'BCI Lab', when: '구상', status: 'far',
    desc: '대학 연구실, 뇌파 기기 제조사와 함께하는 BCI 연구',
    subs: [['대학·뇌파 기기 제조사 연구 파트너십', '', 'next'], ['GNOM · Connext R&D 인력', '', 'next']] },
  { id: 'intent', road: 'gn', y: 2600, side: 'l', phase: 'rnd', short: '의도 인식', title: '의도 인식', when: '구상', status: 'far',
    desc: '예·아니오, 선택, 집중 같은 단순한 의도의 뇌파 인식',
    subs: [] },
  { id: 'proto', road: 'gn', y: 2750, side: 'l', phase: 'rnd', short: '비침습 BCI 프로토타입', title: '비침습 BCI 프로토타입', when: '구상', status: 'far',
    desc: '상용 뇌파 기기로 선택과 집중을 인식하는 첫 시제품',
    subs: [] },
  { id: 'rnd', road: 'tk', y: 5250, dx: 100, ground: true, side: 'c', phase: 'rnd', short: 'R&D', title: 'R&D', when: 'Genie T 투자 이후', status: 'far',
    desc: '각 트랙의 기능을 받치는 기반 연구. 각 R&D의 인력이 모여 BCI 연구로',
    subs: [['GNOM R&D', '', 'next'], ['Connext R&D', '', 'next'], ['Genie T R&D', '', 'next'], ['BCI R&D', '', 'next']] },
  { id: 'bci', road: 'cx', y: 0, side: 'c', phase: 'bci', short: 'BCI', title: '생각으로 대화하는 GNOM', when: 'Brain-Computer Interface · 시점 미정', status: 'far',
    desc: 'Beyond Communication. 말하지 않아도, 관계 기억을 바탕으로 하고 싶은 말을 완성하는 GNOM', subs: [] }
];
const Y0 = 7750;
// BCI stands past the last plan, on the horizon; both are set once the milestones are spread out
let BCI_Y = 0, V_END = -4000, TODAY_Y = 8000;
const ROAD_END = -400000;
// the 3D map only reaches FAR past the window; from there to the horizon the road is drawn flat on screen
const FAR = 4400;

const ROAD_KEYS = ['gn', 'cx', 'tk'];
// three roads run side by side all the way and meet only at the horizon (map is 1000 x 8000)
// one road (map x 215..785 at the near end), three lanes meeting at the horizon point (500, 0)
// the ground runs on far past BCI so the road meets the horizon instead of stopping short
// the three lanes run side by side, then at the research stage they curve in and become one road to BCI
let MERGE_Y = null;
let MERGE_LEN = 1200;
let ROADS = {};
// a highway taper: a long straight narrowing with only its two ends rounded off (a curve would read as a bottleneck)
function mergeFrac(y) {
  if (MERGE_Y == null || y >= MERGE_Y + MERGE_LEN) return 0;
  if (y <= MERGE_Y) return 1;
  const u = (MERGE_Y + MERGE_LEN - y) / MERGE_LEN, e = 0.18, m = 1 / (1 - e);
  return u < e ? m * u * u / (2 * e) : u > 1 - e ? 1 - m * (1 - u) * (1 - u) / (2 * e) : m * (u - e / 2);
}
// a polyline along the taper from x0 (before) to x1 (after), as SVG 'L' commands
function taperPts(x0, x1) {
  let d = '';
  for (let i = 0; i <= 48; i++) { const y = MERGE_Y + MERGE_LEN * (1 - i / 48); d += ` L${(x0 + (x1 - x0) * mergeFrac(y)).toFixed(2)} ${y.toFixed(1)}`; }
  return d;
}
function buildRoads() {
  const lane = (x) => (MERGE_Y == null || x === 500 ? `M${x} 8000 L${x} ${ROAD_END}`
    : `M${x} 8000 ${taperPts(x, 500)} L500 ${ROAD_END}`);
  ROADS = { gn: lane(310), cx: lane(500), tk: lane(690) };
}
buildRoads();
const EDGE_L = 215, EDGE_R = 785, DIV_L = 405, DIV_R = 595;
// the one road after the merge is still a wide road, about two thirds of the three-lane width
const ONE_L = 310, ONE_R = 690;
const xAt = (x0) => x0;
// where one lane hands something to another: [from lane, y, to lane, y]
const CROSSINGS = [];
const BRIDGES = [];
const MERGES = [];
const YEAR_MARKS = [['2027', 0, 'y', 2027], ['2분기', 0, 'q', 2027.25], ['3분기', 0, 'q', 2027.5], ['4분기', 0, 'q', 2027.75], ['2028', 0, 'y', 2028]];
// travel stops: the window's top on the map (the window is 4000 tall); the middle ones are set once milestones are spread out
const STOPS = [['현재', 4000], ['2027', 0], ['2028', 0], ['R&D', 0], ['BCI', V_END]];
const STATUS_TEXT = { done: '완료', now: '진행 중', next: '예정', far: '구상' };

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
const h = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; };
const isPhone = () => innerWidth <= 760 || (matchMedia('(pointer: coarse)').matches && innerHeight <= 500);
const scene = document.getElementById('scene'), stage = document.getElementById('stage'), plane = document.getElementById('plane');
const map = document.getElementById('map'), ov = document.getElementById('ov'), panel = document.getElementById('panel'), inner = document.getElementById('panelInner');
const byId = Object.fromEntries(MILESTONES.map((m) => [m.id, m]));

// ---------- map ----------
const paths = {};
let anchors = {}, lits = {}, headAnchor, tagAnchors = {};
function pointAtY(k, y) {
  const p = paths[k];
  let lo = 0, hi = p.L;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (p.getPointAtLength(mid).y > y) lo = mid; else hi = mid; }
  const pt = p.getPointAtLength(lo);
  return { x: pt.x, y: pt.y, len: lo };
}
// dashed lines are drawn in pieces and only the pieces in view are shown: a dash pattern along tens of thousands of
// map units is the most expensive thing on the page to repaint
let dashParts = [], goldG = null, goldRect = null;
function chunked(x, y0, y1, attrs, parent = map) {
  const step = 2400;
  for (let a = y0; a > y1; a -= step) {
    const b = Math.max(y1, a - step);
    dashParts.push([a, b, el('path', { d: `M${x} ${a} L${x} ${b}`, ...attrs }, parent)]);
  }
}
function cullDashes(v) {
  const top = v - FAR - 50, bottom = v + 4000 + 50;
  dashParts.forEach(([a, b, e]) => { const on = b < bottom && a > top; if (e.__on !== on) { e.__on = on; e.style.display = on ? '' : 'none'; } });
}
function drawMap() {
  map.textContent = '';
  dashParts = [];
  buildRoads();
  ROAD_KEYS.forEach((k) => { paths[k] = el('path', { d: ROADS[k], fill: 'none', stroke: 'none' }, map); paths[k].L = paths[k].getTotalLength(); });
  // R&D foundation: violet light under every road from the funding point to the horizon, with ties between roads
  const F0 = byId.rnd.y;
  const defs = el('defs', {}, map);
  const lg = el('linearGradient', { id: 'litGrad', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 8000, x2: 0, y2: 6900 }, defs);
  [['0', '#fbf1dc'], ['.5', '#e6c483'], ['1', '#c39446']].forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, lg));
  const fg = el('linearGradient', { id: 'fadeR', gradientUnits: 'userSpaceOnUse', x1: 0, y1: F0 + 250, x2: 0, y2: F0 - 600 }, defs);
  el('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0 }, fg); el('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 1 }, fg);
  const mk = el('mask', { id: 'mR', maskUnits: 'userSpaceOnUse', x: -500, y: -70000, width: 2000, height: 80000 }, defs);
  el('rect', { x: -500, y: -70000, width: 2000, height: 80000, fill: 'url(#fadeR)' }, mk);
  const bg = el('linearGradient', { id: 'bedGrad', gradientUnits: 'userSpaceOnUse', x1: 100, y1: 0, x2: 900, y2: 0 }, defs);
  [['0', 0], ['.2', .5], ['.5', .25], ['.8', .5], ['1', 0]].forEach(([o, a]) => el('stop', { offset: o, 'stop-color': '#c9a35e', 'stop-opacity': a }, bg));
  const found = map;
  // the gold lines sit in one group so the opening can draw them from your feet to the horizon
  const gc = el('clipPath', { id: 'goldClip', clipPathUnits: 'userSpaceOnUse' }, defs);
  goldRect = el('rect', { x: -500, width: 2000, y: -500000, height: 508000 }, gc);
  const edgeLine = (x0, y0, y1) => `M${xAt(x0, y0)} ${y0} L${xAt(x0, y1)} ${y1}`;
  const M = MERGE_Y, C = MERGE_Y + MERGE_LEN / 2, S = MERGE_Y + MERGE_LEN;
  const surface = MERGE_Y == null ? `M${EDGE_L} 8000 L${EDGE_L} ${ROAD_END} L${EDGE_R} ${ROAD_END} L${EDGE_R} 8000 Z`
    : `M${EDGE_L} 8000 ${taperPts(EDGE_L, ONE_L)} L${ONE_L} ${ROAD_END} L${ONE_R} ${ROAD_END} ${taperPts(EDGE_R, ONE_R).split(' L').filter(Boolean).reverse().map((q) => 'L' + q).join(' ')} L${EDGE_R} 8000 Z`;
  // R&D runs underneath: a soft gold bed below the road from the funding point on
  // masks repaint the whole plane every frame, so the bed fades in with a plain vertical gradient instead
  const bv = el('linearGradient', { id: 'bedV', gradientUnits: 'userSpaceOnUse', x1: 0, y1: F0 + 250, x2: 0, y2: F0 - 600 }, defs);
  el('stop', { offset: 0, 'stop-color': '#c9a35e', 'stop-opacity': 0 }, bv); el('stop', { offset: 1, 'stop-color': '#c9a35e', 'stop-opacity': .15 }, bv);
  el('path', { d: surface, fill: '#0f0f12' }, map);
  // gold lines go on top of the road surface
  goldG = el('g', {}, map);
  ROAD_KEYS.forEach((k) => {
    const x = pointAtY(k, 8000).x;
    const far = Math.min(...MILESTONES.filter((m) => m.id !== 'bci' && !m.ground && (m.road === k || (MERGE_Y != null && m.y < MERGE_Y))).map((m) => m.y));
    // the dotted plan runs under the whole lane (side lanes stop where they join the middle one); the travelled light covers the part already done
    // the middle line runs on past the last plan into the BCI light
    // only as far as the 3D map can ever show (the far strip draws the rest); a dash pattern to the true road end is thousands of dashes
    const attrs = { fill: 'none', stroke: '#e6c483', 'stroke-opacity': .45, 'stroke-width': 4, 'stroke-dasharray': '6 30', 'stroke-linecap': 'round' };
    // the middle lane's dots run on past the last plan to the BCI light
    const end = x === 500 || MERGE_Y == null ? far : S;
    chunked(x, 8000, end, attrs, goldG);
    if (x !== 500 && MERGE_Y != null) dashParts.push([S, M, el('path', { d: `M${x} ${S}${taperPts(x, 500)}`, ...attrs }, goldG)]);
  });
  ROAD_KEYS.forEach((k) => {
    // the glow is soft strokes stacked for its width, and each fades out along the lane where the light ends,
    // so it trails off instead of stopping flat (a gradient along the lane, moved by setProgress)
    const fade = (id, color) => {
      const g = el('linearGradient', { id, gradientUnits: 'userSpaceOnUse', x1: 0, x2: 0, y1: 8000, y2: 8000 }, defs);
      el('stop', { offset: 0, 'stop-color': color, 'stop-opacity': 1 }, g); el('stop', { offset: 1, 'stop-color': color, 'stop-opacity': 0 }, g);
      return g;
    };
    const glow = fade(`lit-${k}`, '#e6c483'), core = fade(`litc-${k}`, '#f0d595');
    // only as long as the light can reach (a little past today); a full-length gradient stroke is costly to paint
    const lx = pointAtY(k, 8000).x, ld = `M${lx} 8000 L${lx} ${TODAY_Y - 800}`;
    [84, 68, 54, 42, 31, 21, 12].forEach((w) => el('path', { d: ld, fill: 'none', stroke: `url(#lit-${k})`, 'stroke-opacity': .075, 'stroke-width': w }, goldG));
    el('path', { d: ld, fill: 'none', stroke: `url(#litc-${k})`, 'stroke-width': 4 }, goldG);
    lits[k] = { grads: [glow, core] };
  });
  // lane dividers
  // ongoing work: a quiet line beside its lane
  MILESTONES.filter((m) => m.span).forEach((m) => {
    const x = pointAtY(m.road, 8000).x + (m.dx || 0);
    el('line', { x1: x, x2: x, y1: m.from, y2: m.to, stroke: '#e6c483', 'stroke-opacity': .18, 'stroke-width': 22, 'stroke-linecap': 'round' }, map);
    el('line', { x1: x, x2: x, y1: m.from, y2: m.to, stroke: '#f0d595', 'stroke-opacity': .85, 'stroke-width': 5, 'stroke-linecap': 'round' }, map);
    el('line', { x1: x, x2: x, y1: m.to, y2: m.to - 900, stroke: '#e6c483', 'stroke-opacity': .25, 'stroke-width': 4, 'stroke-dasharray': '6 18', 'stroke-linecap': 'round' }, map);
  });
  // time crosses the road: a gold line where each year begins, a fainter dotted one at each quarter
  YEAR_MARKS.forEach(([, y, kind]) => {
    if (kind === 't') {
      // today: a bright line with a soft band of light on the road just behind it
      el('rect', { x: EDGE_L, width: EDGE_R - EDGE_L, y, height: 90, fill: 'url(#todayBand)' }, map);
      el('line', { x1: EDGE_L - 30, x2: EDGE_R + 30, y1: y, y2: y, stroke: '#fbeccb', 'stroke-opacity': .95, 'stroke-width': 6 }, map);
      return;
    }
    el('line', kind === 'y'
      ? { x1: EDGE_L, x2: EDGE_R, y1: y, y2: y, stroke: '#e6c483', 'stroke-opacity': .5, 'stroke-width': 5 }
      : { x1: EDGE_L, x2: EDGE_R, y1: y, y2: y, stroke: '#e6c483', 'stroke-opacity': .28, 'stroke-width': 3, 'stroke-dasharray': '12 18' }, map);
  });
  const tb = el('linearGradient', { id: 'todayBand', gradientUnits: 'objectBoundingBox', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  el('stop', { offset: 0, 'stop-color': '#e6c483', 'stop-opacity': .28 }, tb); el('stop', { offset: 1, 'stop-color': '#e6c483', 'stop-opacity': 0 }, tb);
  // light crossing between lanes where the tracks work together
  CROSSINGS.forEach(([ka, ya, kb, yb]) => {
    const A = pointAtY(ka, ya), B = pointAtY(kb, yb);
    const my = (A.y + B.y) / 2 - 60;
    el('path', { class: 'cross-glow', d: `M${A.x} ${A.y} Q${(A.x + B.x) / 2} ${my} ${B.x} ${B.y}` }, map);
    el('path', { class: 'cross', d: `M${A.x} ${A.y} Q${(A.x + B.x) / 2} ${my} ${B.x} ${B.y}` }, map);
  });
  // the road runs to the horizon and dissolves there, under the BCI light
  const eg = el('linearGradient', { id: 'endGrad', gradientUnits: 'userSpaceOnUse', x1: 0, y1: ROAD_END + 1, x2: 0, y2: ROAD_END }, defs);
  el('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 1 }, eg);
  el('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, eg);
  const em = el('mask', { id: 'mEnd', maskUnits: 'userSpaceOnUse', x: -500, y: -70000, width: 2000, height: 80000 }, defs);
  el('rect', { x: -500, y: -70000, width: 2000, height: 80000, fill: 'url(#endGrad)' }, em);
  const roadG = el('g', {});
  [...map.childNodes].forEach((n) => { if (n !== defs) roadG.appendChild(n); });
  map.appendChild(roadG);
  anchors = {};
  const addAnchor = (id, k, y, dx = 0) => { const pt = pointAtY(k, y); const c = el('circle', { cx: pt.x + dx, cy: pt.y, r: 0.5, fill: 'none' }, map); anchors[id] = { el: c, k, len: pt.len, y }; return anchors[id]; };
  MILESTONES.forEach((m) => addAnchor(m.id, m.road, m.y, m.dx || 0));
  YEAR_MARKS.forEach(([label, y]) => addAnchor('yr' + label, 'gn', y, EDGE_L - 310 - 12));
  BRIDGES.forEach(([a, b]) => {
    const A = anchors[a].el, B = anchors[b].el;
    el('line', { class: 'bridge', x1: A.getAttribute('cx'), y1: A.getAttribute('cy'), x2: B.getAttribute('cx'), y2: B.getAttribute('cy') }, map);
  });
  MILESTONES.forEach((m) => {
    if (m.status !== 'done' && m.status !== 'now') return;
    const a = anchors[m.id];
    a.pool = el('ellipse', { cx: a.el.getAttribute('cx'), cy: a.el.getAttribute('cy'), rx: 90, ry: 90, fill: PHASES[m.phase].color, opacity: 0, style: 'display: none' }, map);
  });
  ROAD_KEYS.forEach((k) => { tagAnchors[k] = el('circle', { r: 0.5, fill: 'none' }, map); });
  headAnchor = el('circle', { cx: 0, cy: 0, r: 0.5, fill: 'none' }, map);
}

// ---------- 3D layout ----------
let drawFar = () => {};
// half the road's width at a map y: full lanes, then the same cubic curve the 3D road uses into one lane
function roadHalf(y) {
  const full = EDGE_R - 500, one = ONE_R - 500;
  return full + (one - full) * mergeFrac(y);
}
let hY = 0, sceneW = 0, Heff = 0, H = 0, persp = null;
function layoutStage() {
  const W = scene.clientWidth; H = scene.clientHeight;
  const wide = !isPhone();
  document.documentElement.classList.toggle('phone', !wide);
  document.documentElement.classList.toggle('land', !wide && innerWidth > innerHeight);
  const sc0 = document.getElementById('scrub'), head = document.querySelector('.head');
  if (!wide && sc0.parentNode !== head) head.appendChild(sc0);
  if (wide && sc0.parentNode !== scene) scene.insertBefore(sc0, document.getElementById('hint'));
  sceneW = wide ? W - 380 : W;
  Heff = wide ? H : H - panel.offsetHeight;
  // on a phone the horizon sits clear below the header, with room for the BCI words above the light
  const hEye = wide ? Math.max(178, H * 0.28) : Math.max(head.getBoundingClientRect().bottom - scene.getBoundingClientRect().top + (innerWidth > innerHeight ? 56 : 84), Heff * 0.3);
  const dPersp = Math.round(Heff * 0.95);
  stage.style.width = sceneW + 'px';
  stage.style.height = Heff + 'px';
  stage.style.perspective = dPersp + 'px';
  stage.style.perspectiveOrigin = `50% ${hEye}px`;
  // a sideways phone is short: the road narrows to suit the height instead of spreading flat across the width
  const pw = Math.min(sceneW * (wide ? 0.74 : 0.92), 900, wide ? Infinity : Heff * 1.3);
  // the visible horizon is where the road ends (BCI) as seen from the start, so road end and horizon meet
  // the road runs on forever, so it vanishes at eye level; the 3D map covers the near part, a flat strip the rest
  const yb = Heff + pw * 0.2, zFar = (4000 + FAR) / 1000 * pw, sFar = dPersp / (dPersp + zFar);
  hY = hEye;
  const yFar = hEye + (yb - hEye) * sFar, cxr = sceneW / 2;
  const fr = document.getElementById('farRoad');
  fr.setAttribute('width', sceneW); fr.setAttribute('height', Heff);
  // the flat strip is the real road beyond the 3D map, projected with the same perspective, merge curve included
  drawFar = (v) => {
    const yEnd = v - FAR, pts = [];
    for (let i = 0; i <= 60; i++) pts.push(yEnd - 40 * (Math.pow(1.22, i) - 1));
    if (MERGE_Y != null) for (let i = 0; i <= 12; i++) { const y = MERGE_Y + MERGE_LEN * i / 12; if (y < yEnd) pts.push(y); }
    pts.sort((a, b) => b - a);
    const L = [], R = [];
    pts.forEach((y) => {
      const k = dPersp / (dPersp + (v + 4000 - y) / 1000 * pw), sy = hEye + (yb - hEye) * k, half = roadHalf(y) / 1000 * pw * k;
      L.push(`${(cxr - half).toFixed(1)},${(y === yEnd ? sy + 1 : sy).toFixed(1)}`); R.push(`${(cxr + half).toFixed(1)},${(y === yEnd ? sy + 1 : sy).toFixed(1)}`);
    });
    L.push(`${cxr},${hEye}`); R.push(`${cxr},${hEye}`);
    document.getElementById('farFill').setAttribute('points', L.concat(R.slice().reverse()).join(' '));
    // the road's edges are one line, drawn here on screen from your feet to the horizon (merge curve included),
    // so they never thin out or break up into dashes the way a 3D stroke does far away
    const yNear = v + 4000, EL = [], ER = [];
    for (let i = 0; i <= 120; i++) {
      const y = yNear - (yNear - yEnd) * Math.pow(i / 120, 1.6);
      const k = dPersp / (dPersp + (v + 4000 - y) / 1000 * pw), s2 = hEye + (yb - hEye) * k, half = roadHalf(y) / 1000 * pw * k;
      EL.push(`${(cxr - half).toFixed(1)},${s2.toFixed(1)}`); ER.push(`${(cxr + half).toFixed(1)},${s2.toFixed(1)}`);
    }
    document.getElementById('farL').setAttribute('points', EL.concat(L.slice(1)).join(' '));
    document.getElementById('farR').setAttribute('points', ER.concat(R.slice(1)).join(' '));
    // past the final plan the middle lane's dots carry on to the light, drawn here with the very same perspective as the
    // 3D road (spacing and size both shrink with distance), so near and far dots match and simply converge into BCI
    const kAt = (y) => dPersp / (dPersp + (v + 4000 - y) / 1000 * pw);
    const sy = (y) => hEye + (yb - hEye) * kAt(y);
    const lastPlan = Math.min(...MILESTONES.filter((m) => m.id !== 'bci' && !m.ground).map((m) => m.y));
    let dd = '';
    const dot = (cy, r, h) => { dd += `M${(cxr - r).toFixed(2)} ${(cy - h).toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(2 * r).toFixed(2)} 0v${(2 * h).toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${(-2 * r).toFixed(2)} 0z`; };
    let a = Math.floor(lastPlan / 36) * 36 - 36, g0 = 0, r0 = 0, y0s = 0;
    for (let i = 0; i < 3000; a -= 36, i++) {
      const y1 = sy(a), y2 = sy(a - 6), gap = y1 - sy(a - 36);
      const r = Math.max(0.55, 2 / 1000 * pw * kAt(a));
      if (gap < 8) { g0 = gap; r0 = r; y0s = y1; break; }
      if (y1 > Heff + 10) continue;
      dot((y1 + y2) / 2, r, Math.max(0, (y1 - y2) / 2 - r));
    }
    // from here true perspective would pack the dots into a line; instead the gap keeps shrinking by the same ratio
    // so that the dots, smaller and closer each time, arrive at the light
    if (g0) {
      const D = y0s - hEye - 3, q = Math.min(0.998, Math.max(0.5, (D - g0) / (D - 1.2)));
      for (let y = y0s - g0, g = g0 * q, i = 0; i < 600 && y > hEye + 3; i++, y -= g, g *= q) dot(y, Math.max(0.45, r0 * Math.sqrt(g / g0)), 0);
    }
    const fc = document.getElementById('farC'); fc.setAttribute('d', dd);
    // like every other lane dot, these only show once the 3D road reaches the last plan; from far away there is nothing here
    fc.style.opacity = String(Math.max(0, Math.min(1, (lastPlan - yEnd) / 2500)));
    const gr = document.getElementById('farCGrad'); gr.setAttribute('y1', sy(lastPlan)); gr.setAttribute('y2', hEye);

  };
  persp = { d: dPersp, pw, yb, hEye };
  plane.style.width = pw + 'px';
  plane.style.height = pw * (4000 + FAR) / 1000 + 'px';
  plane.style.marginLeft = -pw / 2 + 'px';
  plane.style.bottom = -pw * 0.2 + 'px';
  // flat ground: lying fully down below eye level, it vanishes exactly at the horizon
  plane.style.transform = 'rotateX(90deg)';
  document.getElementById('ground').style.top = hY + 'px';
  const glow = document.getElementById('glow');
  const gr = Math.min(sceneW, H) * 0.22;
  glow.style.width = glow.style.height = gr * 2 + 'px';
  glow.style.left = sceneW / 2 - gr + 'px'; glow.style.top = hY - gr + 'px';
  const fl = document.getElementById('flare');
  fl.style.width = sceneW * 0.7 + 'px'; fl.style.left = sceneW * 0.15 + 'px'; fl.style.top = hY + 'px';
  const hl = document.getElementById('hline');
  hl.style.left = sceneW * 0.05 + 'px'; hl.style.width = sceneW * 0.9 + 'px'; hl.style.top = hY + 'px';
  const beam = document.getElementById('beam'); beam.style.left = sceneW / 2 + 'px'; beam.style.top = hY * 0.58 + 'px'; beam.style.height = hY * 0.42 + 'px';
  const cl = document.getElementById('coreLight'); cl.style.left = sceneW / 2 + 'px'; cl.style.top = hY + 'px';
  ['corona', 'corona2'].forEach((id) => { const c = document.getElementById(id); c.style.left = sceneW / 2 + 'px'; c.style.top = hY + 'px'; });
  const fog = document.getElementById('fog'); fog.style.top = hY + 'px'; fog.style.width = sceneW + 'px'; fog.style.height = (Heff - hY) * 0.45 + 'px';
  const sc = document.getElementById('scrub');
  // on a wide screen the stops sit at the left, clear of the panel; on a phone they stay at the right edge
  sc.classList.toggle('left', wide);
  sc.style.left = wide ? '24px' : 'auto'; sc.style.right = wide ? 'auto' : '14px';
  sc.style.top = (wide ? H * 0.42 : hY + 12) + 'px';
  const hint = document.getElementById('hint');
  hint.textContent = wide ? '스크롤하여 앞으로 이동' : '아래로 끌어 앞으로';
  hint.style.left = wide ? '24px' : 'auto'; hint.style.right = wide ? 'auto' : '14px';
  hint.style.top = (wide ? H * 0.42 + STOPS.length * 30 + 10 : Heff - 44) + 'px';
  if (!wide && !hintTimer) hintTimer = setTimeout(hideHint, 2800);
}
const sceneRect = () => scene.getBoundingClientRect();
const scr = (a) => {
  const { d, pw, yb, hEye } = persp;
  const z = (vy + 4000 - +a.getAttribute('cy')) / 1000 * pw, k = d / (d + z);
  return { x: sceneW / 2 + (+a.getAttribute('cx') / 1000 - 0.5) * pw * k, y: hEye + (yb - hEye) * k };
};

// ---------- travel along the road ----------
let vy = 4000, vyTarget = 4000;
let arrived = false;
function setWindow(v) {
  vy = v;
  map.setAttribute('viewBox', `0 ${v - FAR} 1000 ${4000 + FAR}`);
  drawFar(v);
  cullDashes(v);
  ROAD_KEYS.forEach((k) => { const pt = pointAtY(k, Math.min(7990, v + 3860)); tagAnchors[k].setAttribute('cx', pt.x); tagAnchors[k].setAttribute('cy', pt.y); });
  let on = 0;
  STOPS.forEach(([, sv], i) => { if (Math.abs(sv - v) < Math.abs(STOPS[on][1] - v)) on = i; });
  STOP_BTNS.forEach((b, i) => b.classList.toggle('on', i === on));
}
function travelTo(v) { vyTarget = Math.max(V_END, Math.min(4000, v)); kick(); }
// past the last milestone the road is long and empty, so each step covers more ground
let PATH = [];
const stride = () => {
  const f = vy + 3000;
  for (let i = 0; i < PATH.length - 1; i++) if (f <= PATH[i] && f > PATH[i + 1]) return Math.max(1, (PATH[i] - PATH[i + 1]) / 420);
  return 1;
};
let raf = 0;
function kick() { if (!raf) raf = requestAnimationFrame(step); }
function step() {
  raf = 0;
  const d = vyTarget - vy;
  if (Math.abs(d) < 0.5 || reduce) { setWindow(vyTarget); place(true); return; }
  setWindow(vy + d * 0.14);
  place();
  raf = requestAnimationFrame(step);
}
let hintTimer = 0;
const hideHint = () => { document.getElementById('hint').style.opacity = 0; };
// ctrl/cmd + wheel is the browser's zoom (and a trackpad pinch); leave it to the browser
scene.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey || panel.contains(e.target)) return; e.preventDefault(); travelTo(vyTarget + e.deltaY * 2.2 * stride()); hideHint(); }, { passive: false });
let touchY = null;
scene.addEventListener('touchstart', (e) => { if (panel.contains(e.target)) { touchY = null; return; } touchY = e.touches[0].clientY; }, { passive: true });
// dragging the road down pulls you forward, toward the horizon
scene.addEventListener('touchmove', (e) => { if (touchY == null) return; const y = e.touches[0].clientY; travelTo(vyTarget - (y - touchY) * 6 * stride()); touchY = y; hideHint(); }, { passive: true });
scene.addEventListener('touchend', () => { touchY = null; });
addEventListener('keydown', (e) => { if (e.key === 'ArrowUp' || e.key === 'PageUp') travelTo(vyTarget - 500 * stride()); if (e.key === 'ArrowDown' || e.key === 'PageDown') travelTo(vyTarget + 500 * stride()); });
const STOP_BTNS = STOPS.map(([label], i) => {
  const b = h('button', '', document.getElementById('scrub')); b.type = 'button';
  b.append(document.createTextNode(label)); h('i', '', b);
  b.addEventListener('click', () => { travelTo(STOPS[i][1]); hideHint(); });
  return b;
});

// ---------- markers & labels ----------
let marks = {}, yrEls = {}, tagEls = {}, bciBtn, bciSub, cometEl, bciDX = null;
function buildOverlay() {
  ov.textContent = '';
  marks = {};
  MILESTONES.forEach((m) => {
    if (m.id === 'bci') return;
    if (m.ground) {
      const c = h('button', 'rchip', ov); c.type = 'button'; c.textContent = m.short; h('span', '', c).textContent = m.when;
      c.addEventListener('click', () => select(m.id));
      marks[m.id] = { chip: c, m };
      return;
    }
    const col = TONE[m.status];
    const b = h('button', `mk m-${m.status}${m.span ? ' span' : ''}`, ov); b.type = 'button'; b.style.color = col;
    b.setAttribute('aria-label', `${m.title}, ${m.when}, ${STATUS_TEXT[m.status]}`);
    const parts = {};
    parts.halo = h('span', 'halo', b); parts.halo.style.background = col;
    parts.halo.style.opacity = m.status === 'now' ? .7 : m.status === 'done' ? .3 : .08;
    if (MERGES.includes(m.id)) parts.ring = h('span', 'ring', b);
    if (m.status === 'now') parts.pulse = h('span', 'pulse', b);
    parts.core = h('span', 'core', b);
    const hollow = m.status === 'next' || m.status === 'far';
    parts.core.style.background = hollow ? 'var(--night)' : m.status === 'now' ? GRAD : PEARL;
    if (m.status === 'done') parts.core.style.boxShadow = '0 0 10px 2px rgba(231,194,122,.55), 0 0 26px 8px rgba(185,138,62,.22)';
    if (m.status === 'now') parts.core.style.boxShadow = '0 0 10px 1px rgba(230,190,110,.45)';
    parts.core.style.border = m.status === 'done' ? '1.5px solid #fff' : '0';
    if (hollow) { parts.core.style.background = m.status === 'far' ? 'rgba(201,176,131,.45)' : 'rgba(226,201,148,.7)'; parts.core.style.boxShadow = '0 0 8px 1px rgba(212,180,115,.3)'; }
    parts.sel = h('span', 'sel', b);
    b.addEventListener('click', () => select(m.id));
    const lb = h('div', 'lb ' + m.status + ' ' + m.side, ov);
    const t = h('span', 't', lb); t.textContent = m.short;
    const w = h('span', 'w', lb);
    if (m.status === 'now') { const s1 = h('b', '', w); s1.textContent = '진행 중'; s1.style.fontWeight = 600; s1.style.color = ACCENT; w.append(' · ' + m.when); } else w.textContent = m.when;
    lb.addEventListener('click', () => select(m.id));
    marks[m.id] = { b, lb, t, w, parts, m, dim: 1 };
  });
  YEAR_MARKS.forEach(([label, , kind]) => { const d = h('div', 'yr yr-' + kind, ov); d.textContent = kind === 't' && isPhone() ? '오늘' : label; yrEls[label] = d; });
  ROAD_KEYS.forEach((k) => { const d = h('div', 'tag', ov); d.textContent = PHASES[k].name; d.style.color = PHASES[k].color; tagEls[k] = d; });
  bciBtn = h('button', 'bci-btn', ov); bciBtn.type = 'button'; bciBtn.setAttribute('aria-label', 'BCI'); [...'BCI'].forEach((c) => { h('span', '', bciBtn).textContent = c; });
  bciSub = h('div', 'bci-sub', ov); bciSub.textContent = '생각으로 대화하는 GNOM'; bciSub.addEventListener('click', () => select('bci'));
  bciBtn.addEventListener('click', () => select('bci'));
  cometEl = h('div', 'comet', ov);
  markSelected();
}
const sz = (e, d) => { if (e) { e.style.width = d + 'px'; e.style.height = d + 'px'; } };
function place(settled) {
  const s = sceneRect();
  const depth = (y) => Math.max(0, Math.min(1, (y - hY) / (Heff - hY)));
  const pending = [];
  MILESTONES.forEach((m) => {
    if (m.id === 'bci') return;
    const mk = marks[m.id], p = scr(anchors[m.id].el, s);
    const inWin = m.y <= vy + 4000 && p.y >= hY - 2 && p.y <= Heff + 30;
    const k = depth(p.y);
    if (m.ground) {
      mk.chip.style.display = inWin ? '' : 'none';
      if (inWin) mk.chip.style.transform = `translate(${p.x}px, ${p.y - 9}px)`;
      return;
    }
    mk.b.style.display = inWin ? '' : 'none';
    const under = isPhone() && panel.classList.contains('detail') && p.y > H * 0.48 - 12;
    const showLabel = inWin && !under && (k > 0.12 || m.status === 'now');
    mk.lb.style.display = showLabel ? '' : 'none';
    if (!inWin) return;
    const r = Math.max(3, 13 * k);
    mk.b.style.transform = `translate(${p.x}px, ${p.y}px)`;
    sz(mk.parts.halo, r * 5); sz(mk.parts.ring, r * 3.8); sz(mk.parts.pulse, r * 2.8); sz(mk.parts.core, m.status === 'done' ? r * 1.6 : m.status === 'now' ? r * 2 : r * 0.9); sz(mk.parts.sel, r * 4.2);
    if (!showLabel) return;
    const fs = Math.max(11.5, Math.min(16, 11 + 6 * k));
    mk.t.style.fontSize = fs + 'px';
    mk.w.style.fontSize = Math.max(10.5, fs * 0.8) + 'px';
    mk.w.style.display = k > 0.3 || m.status === 'now' ? '' : 'none';
    mk.lb.style.opacity = String(Math.min(1, 0.75 + k) * mk.dim);
    pending.push({ mk, p, off: r + 10, side: m.side === 'l' ? -1 : 1, stack: m.stack || 0 });
  });
  // read every label's size once, after all the writes, then place them
  pending.map((q) => ({ q, lw: q.mk.lb.offsetWidth, lh: q.mk.lb.offsetHeight })).forEach(({ q, lw, lh }) => {
    let x = q.side > 0 ? q.p.x + q.off : q.p.x - q.off - lw;
    q.mk.lb.style.transform = `translate(${x}px, ${q.p.y - lh / 2 + q.stack * (lh + 6)}px)`;
  });
  // nearer labels win; a farther label that would overlap one is hidden (its light stays)
  const kept = [];
  MILESTONES.filter((m) => marks[m.id] && marks[m.id].lb && marks[m.id].lb.style.display !== 'none')
    .map((m) => ({ m, r: marks[m.id].lb.getBoundingClientRect() }))
    // labels of work in progress claim their place first; anything they would cover steps aside
    .sort((a, b) => (b.m.status === 'now') - (a.m.status === 'now') || b.r.top - a.r.top)
    .forEach(({ m, r }) => {
      const pad = 3;
      const hit = kept.some((q) => r.left < q.right + pad && q.left < r.right + pad && r.top < q.bottom + pad && q.top < r.bottom + pad);
      if (hit) marks[m.id].lb.style.display = 'none'; else kept.push(r);
    });
  // a marker whose label is hidden takes no taps (far points pile up near the horizon)
  MILESTONES.forEach((m) => { const mk = marks[m.id]; if (mk && mk.b) mk.b.style.pointerEvents = mk.lb.style.display === 'none' ? 'none' : 'auto'; });
  YEAR_MARKS.forEach(([label, y, kind]) => {
    const d = yrEls[label], p = scr(anchors['yr' + label].el, s);
    const vis = y <= vy + 4000 && p.y > hY + 8 && p.y < Heff - 8 && depth(p.y) > (kind === 'q' ? 0.3 : 0.04);
    d.style.display = vis ? '' : 'none';
    if (!vis) return;
    // every time mark sits just outside the right edge of the road, where fewer labels are, and never moves sideways;
    // under a milestone label a quarter gives way and a year only dims
    d.classList.add('r');
    d.style.transform = `translate(${sceneW - p.x}px, ${p.y - d.offsetHeight / 2}px)`;
    const r = d.getBoundingClientRect();
    const q = kept.some((k) => r.left < k.right + 3 && k.left < r.right + 3 && r.top < k.bottom + 3 && k.top < r.bottom + 3);
    d.style.opacity = q ? (isPhone() || kind === 'q' ? 0 : .35) : 1;
  });
  // road names and the R&D chip give way to milestone labels
  const taken = MILESTONES.filter((m) => marks[m.id] && marks[m.id].lb && marks[m.id].lb.style.display !== 'none').map((m) => marks[m.id].lb.getBoundingClientRect())
    .concat(MILESTONES.filter((m) => marks[m.id] && marks[m.id].b && marks[m.id].b.style.display !== 'none').map((m) => marks[m.id].b.getBoundingClientRect()));
  const hits = (r) => taken.some((t) => r.left < t.right && t.left < r.right && r.top < t.bottom && t.top < r.bottom);
  ROAD_KEYS.forEach((k) => {
    const d = tagEls[k], p = scr(tagAnchors[k], s);
    // past the merge the lanes are one road; their names step aside
    d.style.display = MERGE_Y != null && +tagAnchors[k].getAttribute('cy') < MERGE_Y + MERGE_LEN ? 'none' : '';
    d.style.transform = `translate(${p.x - d.offsetWidth / 2}px, ${Math.min(p.y, Heff - 24) - 8}px)`;
    d.style.opacity = hits(d.getBoundingClientRect()) ? .18 : 1;
  });
  MILESTONES.filter((m) => m.ground).forEach((m) => {
    const c = marks[m.id].chip;
    if (c.style.display === 'none') return;
    const sub = c.querySelector('span'); sub.style.display = '';
    if (hits(c.getBoundingClientRect())) sub.style.display = 'none';
  });
  // BCI sits on the horizon where the road ends; it never moves, it only grows as you get closer
  const by = hY;
  const u = Math.max(0, Math.min(1, (4000 - vy) / (4000 - V_END)));
  const near = u * u * 0.35;
  const grow = 1 + near * 5;
  const dy = by - hY;
  // the horizon is wherever the road ends, so it comes down to meet you as you travel
  document.getElementById('glow').style.transform = `translateY(${dy}px) scale(${grow})`;
  document.getElementById('flare').style.transform = `translateY(${dy}px) scaleX(${1 + near * 1.2})`;
  document.getElementById('flare').style.opacity = String(0.7 + near);
  // the point stays a point; its rings widen as you come closer
  document.getElementById('coreLight').style.transform = `translateY(${dy}px) scale(${1 + near * 1.6})`;
  // the rings grow by size, not by scale, so their line stays hair-thin
  const ring1 = 11 * (1 + near * 6), ring2 = 11 * (1.9 + near * 10);
  [['corona', ring1], ['corona2', ring2]].forEach(([id, rr]) => { const c = document.getElementById(id); c.style.width = c.style.height = 2 * rr + 'px'; c.style.margin = `${-rr}px 0 0 ${-rr}px`; c.style.transform = `translateY(${dy}px)`; });
  document.getElementById('beam').style.transform = `translateY(${dy}px) scale(${1 + near * 2.5})`;
  document.getElementById('beam').style.transformOrigin = '50% 100%';
  // letters sit close together; shift the word so the C, not the word's middle, stands over the light
  const bfs = 11 + near * 14;
  if (bciDX == null) { bciBtn.style.fontSize = '200px'; const c = bciBtn.children[1].getBoundingClientRect(), w = bciBtn.getBoundingClientRect(); bciDX = (c.left + c.width / 2 - w.left - w.width / 2) / 200; }
  bciBtn.style.fontSize = bfs + 'px';
  bciBtn.style.left = sceneW / 2 - bciDX * bfs + 'px'; bciBtn.style.top = (by - Math.max(22, ring1 + 14)) + 'px';
  // at first only the white light; the name and what it means come out of it as you get closer
  const show = (a, b) => Math.max(0, Math.min(1, (u - a) / (b - a)));
  scene.classList.toggle('near-bci', u > 0.8);
  bciBtn.style.opacity = show(0.45, 0.8); bciBtn.style.pointerEvents = show(0.45, 0.8) > 0.3 ? 'auto' : 'none';
  bciSub.style.opacity = show(0.7, 0.98); bciSub.style.pointerEvents = show(0.7, 0.98) > 0.3 ? 'auto' : 'none';
  bciSub.style.left = sceneW / 2 + 'px'; bciSub.style.top = (by - Math.max(22, ring1 + 14) - bfs * 1.6) + 'px';
  bciSub.style.fontSize = (12 + near * 10) + 'px';
  const rays = document.getElementById('rays'), bloom = document.getElementById('bloom'), fin = document.getElementById('finale');
  const cx0 = sceneW / 2;
  [rays, bloom].forEach((e) => { e.style.left = cx0 + 'px'; e.style.top = by + 'px'; });
  fin.style.width = sceneW + 'px';
  if (false) {
    arrived = true;
    scene.classList.add('arrived'); rays.classList.add('on'); fin.classList.add('on');
    bloom.classList.remove('go'); void bloom.offsetWidth; bloom.classList.add('go');
    if (reduce) bloom.style.opacity = .22;
  } else if (vy > -2050 && arrived) {
    arrived = false;
    scene.classList.remove('arrived'); rays.classList.remove('on'); fin.classList.remove('on'); bloom.classList.remove('go'); bloom.style.opacity = 0;
  }
}

// ---------- intro: light runs up each road to where we are now ----------
let introDone = reduce;
// the light on every lane is the time already travelled: it runs up to today
function lastNowLen(k) { return pointAtY(k, TODAY_Y).len; }
function setProgress(u) {
  const lens = Object.fromEntries(ROAD_KEYS.map((k) => [k, lastNowLen(k) * u]));
  ROAD_KEYS.forEach((k) => {
    // full brightness until just before today, then it softens into the today line
    const end = 8000 - lens[k];
    lits[k].grads.forEach((g) => { g.setAttribute('y1', end + 160); g.setAttribute('y2', end - 20); });
  });
  MILESTONES.forEach((m) => {
    if (m.status !== 'done' && m.status !== 'now') return;
    const a = anchors[m.id], lit = a.len <= (lens[a.k] || 0) + 1 || m.status === 'now';
    const mk = marks[m.id];
    if (mk) { mk.b.style.opacity = lit ? 1 : .3; mk.dim = lit ? 1 : .4; }
    if (a.pool) a.pool.setAttribute('opacity', 0);
  });
  const pt = paths.cx.getPointAtLength(Math.max(0, lens.cx));
  headAnchor.setAttribute('cx', pt.x); headAnchor.setAttribute('cy', pt.y);
  const p = scr(headAnchor, sceneRect());
  cometEl.style.transform = `translate(${p.x}px, ${p.y}px)`;
  cometEl.style.opacity = u > 0 && u < 1 ? 1 : 0;
  place();
}
function runIntro() {
  setProgress(1);
  cometEl.style.opacity = 0;
  if (introDone) return;
  introDone = true;
}

// ---------- panel ----------
let selected = null;
function markSelected() { Object.values(marks).forEach(({ b, m }) => { if (b) b.classList.toggle('is-sel', m.id === selected); }); }
function rowBtn(m) {
  const b = h('button', 'row ' + m.status); b.type = 'button';
  const col = TONE[m.status];
  const d = h('span', 'rd', b); d.style.background = m.status === 'now' ? GRAD : col; d.style.color = col;
  h('span', 'rt', b).textContent = m.title;
  h('span', 'rw', b).textContent = m.when;
  b.addEventListener('click', () => select(m.id));
  return b;
}
function renderSummary() {
  inner.textContent = '';
  h('div', 'sum-h', inner).textContent = '진행 중';
  MILESTONES.filter((m) => m.status === 'now').sort((a, b) => b.y - a.y).forEach((m) => inner.appendChild(rowBtn(m)));
  h('div', 'sum-h', inner).textContent = '다음';
  // the next three plans on the road, nearest first
  MILESTONES.filter((m) => m.status === 'next' && !m.ground && m.id !== 'bci').sort((a, b) => b.y - a.y).slice(0, 3).forEach((m) => inner.appendChild(rowBtn(m)));
  h('div', 'p-hint', inner).textContent = '도로 위 지점이나 항목을 눌러 세부 내용 보기';
}
function renderDetail(m) {
  const ph = PHASES[m.phase];
  inner.textContent = '';
  const back = h('button', 'back', inner); back.type = 'button'; back.textContent = '← 전체'; back.addEventListener('click', () => select(null));
  const phase = h('div', 'p-phase', inner); phase.style.color = ph.color; phase.append(h('i'), document.createTextNode(m.phase === 'rnd' || m.phase === 'bci' ? ph.name : PHASES[m.road].name));
  h('h2', 'p-title', inner).textContent = m.title;
  const meta = h('div', 'p-meta', inner);
  const pill = h('span', 'pill ' + m.status, meta); pill.textContent = STATUS_TEXT[m.status];
  if (m.status === 'now') pill.style.background = GRAD;
  if (m.when !== STATUS_TEXT[m.status]) meta.append(m.when);
  if (m.desc) h('p', 'p-desc', inner).textContent = m.desc;
  if (m.subs.length) {
    const ul = h('ul', 'subs', inner); ul.style.setProperty('--c', m.status === 'now' ? ACCENT : TONE.done);
    m.subs.forEach(([t, w, st]) => {
      const li = h('li', st, ul); h('span', 'dot', li);
      const tx = h('div', 't', li); tx.textContent = t;
      const meta2 = [w, st === 'done' ? '완료' : st === 'now' ? '진행 중' : ''].filter(Boolean).join(' · ');
      if (meta2) h('span', 'd', tx).textContent = meta2;
    });
  }
}
// the window position that puts map point y at screen height sy
function vyToShow(y, sy) {
  const { d, pw, yb, hEye } = persp;
  const k = Math.max(0.0001, (sy - hEye) / (yb - hEye));
  return y + (d / k - d) * 1000 / pw - 4000;
}
function select(id) {
  selected = id;
  markSelected();
  const m = id && byId[id];
  if (m) renderDetail(m); else renderSummary();
  panel.scrollTop = 0;
  if (isPhone()) panel.classList.toggle('detail', !!m);
  // bring the chosen milestone into the near part of the view
  if (m && started) travelTo(m.id === 'bci' ? V_END : isPhone() ? vyToShow(m.y, hY + (H * 0.48 - hY) * 0.6) : m.y - 3000);
}

// ---------- stars ----------
const cv = document.getElementById('stars'), c2 = cv.getContext('2d');
let stars = [];
function sizeStars() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; c2.setTransform(dpr, 0, 0, dpr, 0, 0);
  const n = Math.round(cv.clientWidth * cv.clientHeight / 9000);
  stars = Array.from({ length: n }, () => ({ x: Math.random() * cv.clientWidth, yr: Math.random(), r: Math.random() * 1.1 + 0.2, a: Math.random() * 0.6 + 0.15, f: Math.random() * 2 + 0.5, p: Math.random() * 6 }));
}
function drawStars(t = 0) {
  const top = hY - 6;
  c2.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
  for (const s of stars) {
    const y = s.yr * top;
    const tw = reduce ? 1 : 0.55 + 0.45 * Math.sin(t / 2600 * s.f + s.p);
    c2.globalAlpha = 0.5 * s.a * tw * Math.min(1, (top - y) / 80 + 0.15);
    c2.fillStyle = '#f5ead2';
    c2.beginPath(); c2.arc(s.x, y, s.r, 0, Math.PI * 2); c2.fill();
  }
}
function loop(t) { drawStars(t); requestAnimationFrame(loop); }

// ---------- boot ----------
let started = false;
// seen from the start, plans fill the road from the nearest one to just short of the horizon,
// each gap on screen a little shorter than the one before
function spreadOut() {
  const { d, pw, yb, hEye } = persp;
  const yS = (y) => hEye + (yb - hEye) * d / (d + (8000 - y) / 1000 * pw);
  const yMap = (sy) => 8000 - d * ((yb - hEye) / (sy - hEye) - 1) * 1000 / pw;
  // plans take their place on the road by date: the same date stands on the same row, whatever the lane;
  // plans with no date yet ('이후', '구상') follow in the order they are listed on the map
  const when = (m) => { const t = m.when.match(/(\d{4})\.(\d{2})(?:\.(\d{2}))?/); return t ? +t[1] + (+t[2] - 1) / 12 + (t[3] ? (+t[3] - 1) / 365 : 0) : null; };
  const plans = MILESTONES.filter((m) => m.id !== 'bci' && !m.ground && !m.span && m.y < Y0);
  const keyOf = (m) => (when(m) != null ? 't' + when(m).toFixed(4) : 'y' + m.y);
  const order = (m) => (when(m) != null ? [0, when(m)] : [1, -m.y]);
  const keys = [...new Set(plans.slice().sort((a, b) => { const p = order(a), q = order(b); return p[0] - q[0] || p[1] - q[1]; }).map(keyOf))];
  // dated plans stand in proportion to their dates (launch = slot 0, last date = slot nD); undated ones follow one slot each
  const tLaunch = when(byId.open), datedKeys = keys.filter((k) => k[0] === 't'), nD = datedKeys.length;
  const tLast = +datedKeys[nD - 1].slice(1);
  const slotOf = (k) => (k[0] === 't' ? (+k.slice(1) - tLaunch) / (tLast - tLaunch) * nD : nD + 1 + keys.filter((q) => q[0] === 'y').indexOf(k));
  const ys = keys.map((_, i) => -i);
  // the nearest plans stand a little above the bottom edge on any screen height, so their labels stay in view
  const y0 = yMap(Math.min(yS(Y0), Heff - 60));
  const n = ys.length, r = 0.75, top = yS(y0), last = hEye + (yb - hEye) * 0.02;
  const g = (top - last) * (1 - r) / (1 - Math.pow(r, n));
  const slotY = (sl) => yMap(top - g * (1 - Math.pow(r, sl)) / (1 - r));
  const targets = keys.map((k) => slotY(slotOf(k)));
  BCI_Y = Math.round(targets[n - 1] - (targets[n - 2] - targets[n - 1]) * 1.5);
  // the journey ends with the last plan just ahead and BCI at its brightest behind it
  V_END = Math.round(targets[n - 1]) - 4000 + 1400;
  byId.bci.y = BCI_Y;
  STOPS[STOPS.length - 1][1] = V_END;
  PATH = [8000, y0, ...targets, BCI_Y];
  const groundAfter = byId.rnd && byId.token;
  MILESTONES.forEach((m) => {
    if (m.id === 'bci' || m.ground || m.span) return;
    m.y = m.y >= Y0 ? Math.round(y0) : Math.round(targets[keys.indexOf(keyOf(m))]);
  });
  if (groundAfter) byId.rnd.y = byId.token.y;
  // the lanes become one road just before the research lab
  // like a highway merge: the lanes start drifting in after the in-house model and are one road just before the lab
  MERGE_Y = byId.lab ? byId.lab.y + 300 : null;
  if (MERGE_Y != null && byId.model) MERGE_LEN = Math.max(1200, byId.model.y - 300 - MERGE_Y);
  // plans that share a lane and a date share a point; their labels stack instead of covering each other
  MILESTONES.forEach((m, i) => { m.stack = MILESTONES.slice(0, i).filter((q) => q.id !== 'bci' && !q.ground && q.road === m.road && q.y === m.y && q.side === m.side).length; });
  // each boundary sits between the farthest plan dated before it and the nearest plan dated after it;
  // plans with no date yet ('이후', '구상') count as after 2028
  const dated = MILESTONES.filter((m) => m.id !== 'bci' && !m.ground && !m.span).map((m) => {
    const t = m.when.match(/(\d{4})\.(\d{2})(?:\.(\d{2}))?/);
    return { y: m.y, t: t ? +t[1] + (+t[2] - 1) / 12 + (t[3] ? (+t[3] - 1) / 365 : 0) : 2028.5 };
  });
  // time on the road: a date sits between the nearest dated milestones around it, in proportion to the days
  // (a month or a range counts from its first day)
  const days = MILESTONES.filter((m) => m.id !== 'bci' && !m.ground && !m.span).map((m) => {
    const d = m.when.match(/(\d{4})\.(\d{2})(?:\.(\d{2}))?/);
    return d && { y: m.y, t: +d[1] + (+d[2] - 1) / 12 + (d[3] ? (+d[3] - 1) / 365 : 0) };
  }).filter(Boolean);
  const yAt = (t) => {
    const prev = days.filter((q) => q.t <= t).sort((a, b) => b.t - a.t || a.y - b.y)[0];
    const next = days.filter((q) => q.t > t).sort((a, b) => a.t - b.t || b.y - a.y)[0];
    if (prev && next) return Math.round(prev.y + (next.y - prev.y) * (t - prev.t) / (next.t - prev.t));
    // past the last dated plan: carry on at the pace of the last two dated rows, but stay short of the next undated plan
    const [p1, p0] = days.slice().sort((a, b) => b.t - a.t).filter((q, i, arr) => i === 0 || q.t < arr[0].t).slice(0, 2);
    const nextUndated = Math.max(...dated.filter((q) => q.t >= t).map((q) => q.y));
    const pace = p0 && p1.t > p0.t ? (p1.y - p0.y) / (p1.t - p0.t) : -8000;
    // rows are spaced by order, not by time, so a few weeks past the last date stays close to it
    return Math.round(Math.max(p1.y + pace * (t - p1.t), p1.y - (p1.y - nextUndated) * 0.15));
  };
  YEAR_MARKS.forEach((ym) => { ym[1] = yAt(ym[3]); });
  const now = new Date(), tNow = now.getFullYear() + now.getMonth() / 12 + (now.getDate() - 1) / 365;
  TODAY_Y = yAt(tNow);
  YEAR_MARKS.push([`오늘 ${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`, TODAY_Y, 't']);
  // ongoing work runs from launch to the 2028 line; its label sits a little ahead of today
  MILESTONES.filter((m) => m.span).forEach((m) => {
    m.from = Math.round(y0); m.to = YEAR_MARKS.find((ym) => ym[0] === '2028')[1];
    m.y = Math.round(TODAY_Y - (TODAY_Y - byId.admin.y) * 0.55);
  });
  // each stop brings its boundary (a year line, or the first research plan) into view just ahead
  const ahead = (y) => Math.round(y - 4000 + 700);
  STOPS[1][1] = ahead(YEAR_MARKS.find((ym) => ym[0] === '2027')[1]);
  STOPS[2][1] = ahead(YEAR_MARKS.find((ym) => ym[0] === '2028')[1]);
  // R&D: the first plan with no date yet past the listed ones
  STOPS[3][1] = ahead(Math.max(...MILESTONES.filter((m) => m.status === 'far' && !m.ground && m.id !== 'bci').map((m) => m.y)));
}
function layout(first) {
  layoutStage(); sizeStars(); drawStars(0);
  if (first) { spreadOut(); drawMap(); buildOverlay(); }
  setWindow(vy);
  place();
  if (first) runIntro(); else setProgress(1);
}
let rt;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => layout(false), 150); });
document.getElementById('grab').addEventListener('click', () => { if (panel.classList.contains('detail')) select(null); else panel.classList.toggle('open'); });
select(null);
// the finale ends on where we stand today, so it works as a compass
document.getElementById('finaleNow').append(Object.assign(document.createElement('div'), { textContent: '지금 우리는' }), Object.assign(document.createElement('span'), { textContent: MILESTONES.filter((m) => m.status === 'now').map((m) => m.title).join(' · ') }));
document.getElementById('finaleBack').addEventListener('click', () => travelTo(4000));
// opening: the road is there from the start; the gold lines run up it from your feet to the horizon
function drawGold() {
  const farC = document.getElementById('farC');
  goldG.setAttribute('clip-path', 'url(#goldClip)');
  farC.style.opacity = 0;
  const t0 = performance.now(), dur = 2200, { d, pw, yb, hEye } = persp;
  // sweep evenly up the screen, from the bottom edge to the horizon, and turn that into a point on the road
  const mapAt = (sy) => vy + 4000 - (d * (yb - hEye) / Math.max(0.5, sy - hEye) - d) * 1000 / pw;
  // everything that sits on the road waits in the dark until the line gets there
  const waiting = MILESTONES.filter((m) => marks[m.id] && marks[m.id].b).map((m) => ({ y: m.y, els: [marks[m.id].b, marks[m.id].lb] }))
    .concat(YEAR_MARKS.map(([label, y]) => ({ y, els: [yrEls[label]] })));
  scene.classList.add('gold-intro');
  waiting.forEach((w) => w.els.forEach((e) => e.classList.add('unlit')));
  const finish = () => {
    goldG.removeAttribute('clip-path'); farC.style.opacity = '';
    waiting.forEach((w) => w.els.forEach((e) => e.classList.remove('unlit')));
    setTimeout(() => scene.classList.remove('gold-intro'), 800);
  };
  const tick = (now) => {
    const u = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - u, 2), reach = mapAt(Heff - (Heff - hEye) * e);
    goldRect.setAttribute('y', reach);
    waiting.forEach((w) => { if (w.y >= reach) w.els.forEach((el) => el.classList.remove('unlit')); });
    farC.style.opacity = String(Math.max(0, (u - 0.8) / 0.2));
    if (u < 1) requestAnimationFrame(tick); else finish();
  };
  requestAnimationFrame(tick);
  // a background tab may not run frames; never leave anything hidden
  setTimeout(finish, dur + 300);
}
const once = () => {
  if (started) return; started = true;
  layout(true);
  if (!reduce) { requestAnimationFrame(loop); drawGold(); }
};
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(once);
setTimeout(once, 1500);

}

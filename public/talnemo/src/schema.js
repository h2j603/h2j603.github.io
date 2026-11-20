// 프리셋 스키마. 이 파일의 DEFAULTS 가 변수 목록의 정본이다(CONFIG).
// 프리셋 JSON = DEFAULTS 위에 덮어쓰는 부분값. 서체 계열 성질은 여기 하드코딩하지 않고 옵션으로 둔다.
// 단위: 폰트 유닛(UPM 1000).

export const DEFAULTS = {
  meta: { id: 'base', name: '기본', note: '' },
  font: { upm: 1000, ascender: 880, descender: -120, frameTop: 840, frameH: 900, sidebearing: 50 },

  stroke: {
    weight: 70,          // 전체 굵기(균일)
    contrast: 0,         // 획 대비. 0 = 균일 굵기. 가로획만 가늘어진다
    cap: 'square',       // square | butt | round
    miterLimit: 4,
    fillet: 0,           // 안쪽 모서리 둥글리기 반지름. 0 = 끔. 교차부 + 꺾임 안쪽
  },

  // 자소 크기(초성 기준)
  cons: {
    w: 300, h: 300,      // 자음 상자 너비·높이
    squareRef: 'h',      // ㅇ·ㅁ 한 변의 공통 기준: h | w | min | bar(가로모음 가로줄 폭)
    ngCho: 'same',       // 초성 ㅇ 기준: same(공통 따름) | h | w | min | bar
    mCho: 'same',        // 초성 ㅁ 기준
    mSquare: true,       // ㅁ 정사각형 규칙. false 면 다른 자음처럼 상자 비율(너비×높이)을 따른다
    strokeMin: 1,        // 획수 기반 크기: 1획 자음 배율(4획 = 1). 1 = 끔. ㅇ은 예외
    strokeAxis: 'both',  // 획수 크기를 적용할 방향: both | w | h
    ngShape: 'ring',     // ㅇ 모양: ring(고리) | dot(점)
    ngRound: true,       // ㅇ·ㅎ 정원 유지. false 면 ㅇ 폭 = 다른 자음 폭(cons.w), 높이 = ㅇ 기준 → 타원. ㅎ 원도 상자 폭에 맞춘 타원
    ngDot: 0.5,          // 점 ㅇ 지름(상자 한 변 대비)
    pairW: 1.5,          // 겹자음 전체 너비 = w × pairW
    pairGap: 30,         // 겹자음 두 자소 사이
  },
  jong: { scaleW: 1, scaleH: 1, squareRef: 'same', ngShape: 'same' },   // 종성 크기 = 초성 크기 × scale, 종성 ㅇ·ㅁ 기준

  vowel: {
    stem: 640,           // 세로모음 기둥 길이
    branch: 110,         // 곁줄기 길이
    branchY: 150,        // 곁줄기 높이(기둥 위끝에서)
    branchGap: 90,       // ㅑ·ㅕ 두 곁줄기 간격
    dbl: 110,            // ㅐ·ㅔ 두 기둥 간격
    bar: 340,            // 가로모음 가로줄 길이
    tick: 80,            // 가로모음 꼭지 길이
    tickX: 0.5,          // 꼭지 위치(가로줄 비율)
    tickGap: 120,        // ㅛ·ㅠ 꼭지 간격
    dblThin: 0,          // 두 기둥 모음(ㅐㅒㅔㅖㅙㅞ) 기둥 가로 너비 가늘게: 기둥 굵기 × (1 − 값). 곁줄기·가로줄은 그대로. 0 = 끔
  },

  // 배치 규칙. 세로(V)·가로(H)·복합(C) 모음 분류마다 따로 둔다
  place: {
    gapCV: 50,           // 초성–세로모음 간격(겹침 허용: 음수)
    gapCH: 50,           // 초성–가로모음 간격
    gapVJ: 60,           // 위 덩어리–종성 간격
    vY: 0,               // 세로모음 위끝 높이(초성 윗선 기준, 음수=위로)
    hAlign: 'left',      // 가로모음 위 초성 정렬: left | center
    jongX: 'cho',        // 종성 x 기준: cho | center | stem | right | vowel(홀자 중앙 아래) | lastStem(들숨: 마지막 기둥 오른끝, 곁줄기 제외)
    pairOverhang: false, // jongX=vowel 일 때 겹받침 뒤 자소가 오른쪽으로 나간다
    jongY: 'cho',        // 종성 y 기준: cho(초성·가로모음 아래) | vowel(모음 전체 아래) | fixed(모음 길이와 무관: 세로 = 기둥 아래, 가로·섞임 = ㅜ 꼭지 아래)
    stemSpanJong: false, // 받침이 있으면 기둥을 종성 아래끝까지 늘인다
    branchIn: 0,         // ㅓㅕㅔㅖ 들임(유닛): 기둥을 왼쪽으로 옮기는 양. 0 = 곁줄기만큼 자리를 더 잡음, 곁줄기 길이 = 기둥이 ㅣ 자리
    euBase: 'gap',       // ㅡ 위치: gap(초–가로모음 간격) | stem(가로줄 아래끝 = 초성+세로모음 아래끝, 아의 아랫단)
    compoundStem: 'fixed', // 복합모음 기둥: fixed | bar(가로줄까지)
    hBarY: 'flow',       // 가로모음 가로줄 높이: flow(꼭지 따라 ㅗ·ㅜ·ㅡ 가 다름) | fixed(모두 ㅡ 가로줄 높이)
  },

  // 틀
  frame: {
    align: 'top',        // 정렬 기준: top | center | bottom
    width: 'proportional', // proportional | fixed | group(모임꼴별: 세로·가로·섞임 모음마다 한 너비)
    fixedAdvance: 1000,
    groupW: { V: 870, H: 590, C: 990 }, // width=group 일 때 모임꼴 너비. 왼쪽 여백 = font.sidebearing
    fit: 1,              // 탈네모 축: 0 맞춤(네모틀에 맞게 줄임) ↔ 1 고정(자소 크기 고정)
    fitBox: 760,         // 맞춤 틀 한 변
  },

  // 다벌식 규칙: 조건이 맞으면 해당 자리 자소의 크기·위치를 바꾼다(JSON 추가만으로 계열 확장)
  // { when: { jong: true|false, vclass: 'V'|'H'|'C', cho: 'ㄱ…', jung: 'ㅏ…', jongJamo: 'ㄳ…' },
  //   slot: 'cho'|'jung'|'jong', scaleW, scaleH, dx, dy, stem,   ← 자리별 크기·위치
  //   place: { jongX, jongY, gapVJ, … } }                          ← 배치 규칙 조건부 덮어쓰기(slot 없이도 됨)
  rules: [],

  // 받침 위치 예외: 받침이 있을 때만 종성을 평행이동(유닛, y는 +위). V 세로모음(섞임 포함) · H 가로모음. 받침 없는 글자(오·아)는 예외 없음
  shift: { V: { jongX: 0, jongY: 0 }, H: { jongX: 0, jongY: 0 } },

  // 실험(장식 변형). 기본 꺼짐. 탈네모 축과 섞지 않는다
  exp: { seed: 1, jitter: 0, rotate: 0 },
};

// 슬라이더 목록. src: set = 사용자가 정함 / auto = 다른 값에서 자동으로 나옴(화면에 표시만)
export const CONTROLS = [
  { g: '틀', k: 'frame.fit', min: 0, max: 1, step: 0.01, label: '맞춤 ↔ 고정' },
  { g: '틀', k: 'frame.align', opts: ['top', 'center', 'bottom'], label: '정렬 기준' },
  { g: '틀', k: 'frame.width', opts: ['proportional', 'fixed', 'group'], label: '폭' },
  { g: '틀', k: 'frame.fixedAdvance', min: 500, max: 1400, step: 10, label: '고정폭' },
  { g: '틀', k: 'frame.groupW.V', min: 400, max: 1400, step: 10, label: '모임꼴 너비 세로' },
  { g: '틀', k: 'frame.groupW.H', min: 400, max: 1400, step: 10, label: '모임꼴 너비 가로' },
  { g: '틀', k: 'frame.groupW.C', min: 400, max: 1400, step: 10, label: '모임꼴 너비 섞임' },
  { g: '획', k: 'stroke.weight', min: 10, max: 180, step: 1, label: '굵기' },
  { g: '획', k: 'stroke.contrast', min: 0, max: 0.8, step: 0.01, label: '대비' },
  { g: '획', k: 'stroke.cap', opts: ['square', 'butt', 'round'], label: '끝' },
  { g: '획', k: 'stroke.fillet', min: 0, max: 120, step: 1, label: '안쪽 모서리 둥글리기' },
  { g: '자음', k: 'cons.w', min: 120, max: 500, step: 5, label: '자음 너비' },
  { g: '자음', k: 'cons.h', min: 120, max: 500, step: 5, label: '자음 높이' },
  { g: '자음', k: 'cons.squareRef', opts: ['h', 'w', 'min', 'bar'], label: 'ㅇㅁ 기준' },
  { g: '자음', k: 'cons.ngCho', opts: ['same', 'h', 'w', 'min', 'bar'], label: '초성 ㅇ 기준' },
  { g: '자음', k: 'cons.mSquare', opts: [true, false], label: 'ㅁ 정사각형' },
  { g: '자음', k: 'cons.mCho', opts: ['same', 'h', 'w', 'min', 'bar'], label: '초성 ㅁ 기준' },
  { g: '자음', k: 'cons.strokeMin', min: 0.4, max: 1, step: 0.01, label: '획수 크기(1획 배율)' },
  { g: '자음', k: 'cons.strokeAxis', opts: ['both', 'w', 'h'], label: '획수 크기 방향' },
  { g: '자음', k: 'cons.ngShape', opts: ['ring', 'dot'], label: 'ㅇ 모양' },
  { g: '자음', k: 'cons.ngRound', opts: [true, false], label: 'ㅇ 정원' },
  { g: '자음', k: 'cons.ngDot', min: 0.15, max: 1, step: 0.01, label: '점 ㅇ 크기' },
  { g: '자음', k: 'jong.squareRef', opts: ['same', 'h', 'w', 'min', 'bar'], label: '종성 ㅇㅁ 기준' },
  { g: '자음', k: 'jong.ngShape', opts: ['same', 'ring', 'dot'], label: '종성 ㅇ 모양' },
  { g: '자음', k: 'cons.pairW', min: 1, max: 2.2, step: 0.01, label: '겹자음 너비' },
  { g: '자음', k: 'cons.pairGap', min: -40, max: 120, step: 1, label: '겹자음 간격' },
  { g: '자음', k: 'jong.scaleW', min: 0.4, max: 1.4, step: 0.01, label: '종성 너비' },
  { g: '자음', k: 'jong.scaleH', min: 0.4, max: 1.4, step: 0.01, label: '종성 높이' },
  { g: '모음', k: 'vowel.stem', min: 200, max: 1000, step: 5, label: '기둥' },
  { g: '모음', k: 'vowel.branch', min: 30, max: 300, step: 1, label: '곁줄기' },
  { g: '모음', k: 'vowel.branchY', min: 0, max: 600, step: 1, label: '곁줄기 높이' },
  { g: '모음', k: 'vowel.branchGap', min: 40, max: 300, step: 1, label: '곁줄기 간격' },
  { g: '모음', k: 'vowel.dbl', min: 40, max: 300, step: 1, label: '두 기둥 간격' },
  { g: '모음', k: 'vowel.bar', min: 120, max: 700, step: 5, label: '가로줄' },
  { g: '모음', k: 'vowel.tick', min: 20, max: 250, step: 1, label: '꼭지' },
  { g: '모음', k: 'vowel.tickX', min: 0, max: 1, step: 0.01, label: '꼭지 위치' },
  { g: '모음', k: 'vowel.tickGap', min: 40, max: 300, step: 1, label: '꼭지 간격' },
  { g: '모음', k: 'vowel.dblThin', min: 0, max: 0.5, step: 0.01, label: '이중모음 기둥 가늘게' },
  { g: '배치', k: 'place.gapCV', min: -100, max: 200, step: 1, label: '초–세로모음' },
  { g: '배치', k: 'place.gapCH', min: -100, max: 200, step: 1, label: '초–가로모음' },
  { g: '배치', k: 'place.gapVJ', min: -100, max: 200, step: 1, label: '위–종성' },
  { g: '배치', k: 'place.vY', min: -200, max: 200, step: 1, label: '세로모음 높이' },
  { g: '배치', k: 'place.hAlign', opts: ['left', 'center'], label: '가로모음 정렬' },
  { g: '배치', k: 'place.jongX', opts: ['cho', 'center', 'stem', 'right', 'vowel', 'lastStem'], label: '종성 x' },
  { g: '배치', k: 'place.jongY', opts: ['cho', 'vowel', 'fixed'], label: '종성 y' },
  { g: '배치', k: 'place.pairOverhang', opts: [false, true], label: '겹받침 오른쪽으로' },
  { g: '배치', k: 'place.stemSpanJong', opts: [false, true], label: '기둥 받침까지' },
  { g: '배치', k: 'place.branchIn', min: 0, max: 300, step: 1, label: 'ㅓ 들임' },
  { g: '배치', k: 'place.euBase', opts: ['gap', 'stem'], label: 'ㅡ 위치' },
  { g: '배치', k: 'place.compoundStem', opts: ['fixed', 'bar'], label: '복합모음 기둥' },
  { g: '배치', k: 'place.hBarY', opts: ['flow', 'fixed'], label: 'ㅗㅜㅡ 가로줄 높이' },
  { g: '실험', k: 'exp.jitter', min: 0, max: 80, step: 1, label: '흔들림' },
  { g: '실험', k: 'exp.rotate', min: 0, max: 20, step: 0.5, label: '회전' },
  { g: '실험', k: 'exp.seed', min: 1, max: 99, step: 1, label: '시드' },
];

export const SHIFT_CASES = [['V', '세로·섞임모음+받침'], ['H', '가로모음+받침']];
export const shiftCase = (vclass) => (vclass === 'H' ? 'H' : 'V');
for (const [c] of SHIFT_CASES) for (const a of ['X', 'Y']) {
  CONTROLS.push({ g: '위치', k: `shift.${c}.jong${a}`, shiftCase: c, min: -300, max: 300, step: 1, label: '종성 ' + a.toLowerCase() });
}

// 저장값에서 스키마에 없는 키를 버린다(옛 저장값이 지운 변수를 되살리지 않게)
export function pruneUnknown(p, base = DEFAULTS) {
  const out = {};
  for (const [k, v] of Object.entries(p || {})) {
    if (!(k in base)) continue;
    out[k] = isObj(base[k]) && isObj(v) ? pruneUnknown(v, base[k]) : v;
  }
  return out;
}

export function getPath(o, k) { return k.split('.').reduce((a, b) => a?.[b], o); }
export function setPath(o, k, v) {
  const ks = k.split('.'); let t = o;
  for (let i = 0; i < ks.length - 1; i++) t = t[ks[i]] ??= {};
  t[ks[ks.length - 1]] = v;
}

function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
export function merge(base, over) {
  const out = structuredClone(base);
  for (const [k, v] of Object.entries(over || {})) out[k] = isObj(v) && isObj(out[k]) ? merge(out[k], v) : structuredClone(v);
  return out;
}

// 프리셋 검사: 스키마에 없는 키를 쓰면 오류(오타로 조용히 무시되는 걸 막는다)
export function validatePreset(p, base = DEFAULTS, path = '') {
  const errs = [];
  for (const [k, v] of Object.entries(p)) {
    const here = path ? path + '.' + k : k;
    if (!(k in base)) { errs.push('알 수 없는 키: ' + here); continue; }
    if (isObj(base[k]) && isObj(v)) errs.push(...validatePreset(v, base[k], here));
  }
  return errs;
}

export function resolvePreset(p) {
  const errs = validatePreset(p);
  if (errs.length) throw new Error(errs.join('\n'));
  return merge(DEFAULTS, p);
}

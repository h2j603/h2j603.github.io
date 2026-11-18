// 자소 골격 정의. 모양 "종류"만 담고 크기는 담지 않는다(크기는 배치 규칙 몫).
// 자음 골격 좌표는 정규화(0~1, y-아래). 프리미티브:
//   {t:'line', pts}      열린 획
//   {t:'square', box}    정사각형 — 매핑된 상자 안 최대 정사각형(ㅁ 구조 제약)
//   {t:'circle', box}    정원 — 매핑된 상자 안 최대 원(ㅇ·ㅎ 구조 제약)
// square·circle 은 비균등 확대·회전을 받아도 정사각형·정원으로 다시 그려진다.

export const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'.split('');
export const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'.split('');
export const JONG = 'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'.split('');

export const CHO_NAMES = 'g kk n d tt r m b pp s ss ng j jj ch k t p h'.split(' ');
export const JUNG_NAMES = 'a ae ya yae eo e yeo ye o wa wae oe yo u wo we wi yu eu yi i'.split(' ');
export const JONG_NAMES = 'g kk gs n nj nh d l lg lm lb ls lt lp lh m b bs s ss ng j ch k t p h'.split(' ');

const L = (...pts) => ({ t: 'line', pts });

export const SIMPLE = {
  'ㄱ': [L([0, 0], [1, 0], [1, 1])],
  'ㄴ': [L([0, 0], [0, 1], [1, 1])],
  'ㄷ': [L([1, 0], [0, 0], [0, 1], [1, 1])],
  'ㄹ': [L([0, 0], [1, 0], [1, .5], [0, .5], [0, 1], [1, 1])],
  'ㅁ': [{ t: 'square', box: [0, 0, 1, 1] }],
  'ㅂ': [L([0, 0], [0, 1], [1, 1], [1, 0]), L([0, .5], [1, .5])],
  'ㅅ': [L([0, 1], [.5, 0], [1, 1])],
  'ㅇ': [{ t: 'circle', box: [0, 0, 1, 1] }],
  'ㅈ': [L([0, 0], [1, 0]), L([0, 1], [.5, 0], [1, 1])],
  'ㅊ': [L([.5, 0], [.5, .22]), L([0, .22], [1, .22]), L([0, 1], [.5, .22], [1, 1])],
  'ㅋ': [L([0, 0], [1, 0], [1, 1]), L([0, .5], [1, .5])],
  'ㅌ': [L([1, 0], [0, 0], [0, 1], [1, 1]), L([0, .5], [1, .5])],
  'ㅍ': [L([0, 0], [1, 0]), L([0, 1], [1, 1]), L([.25, 0], [.25, 1]), L([.75, 0], [.75, 1])],
  'ㅎ': [L([.5, 0], [.5, .16]), L([0, .16], [1, .16]), { t: 'circle', box: [0, .3, 1, 1] }],
};

// 홑자음 획수(한글 쓰기 순서 기준). 획수 기반 크기 규칙에 쓴다
export const STROKES = { 'ㄱ': 1, 'ㄴ': 1, 'ㄷ': 2, 'ㄹ': 3, 'ㅁ': 3, 'ㅂ': 4, 'ㅅ': 2, 'ㅇ': 1, 'ㅈ': 2, 'ㅊ': 3, 'ㅋ': 2, 'ㅌ': 3, 'ㅍ': 4, 'ㅎ': 3 };

// 겹자음·겹받침: 홑자음 둘을 나란히
export const PAIR = {
  'ㄲ': 'ㄱㄱ', 'ㄸ': 'ㄷㄷ', 'ㅃ': 'ㅂㅂ', 'ㅆ': 'ㅅㅅ', 'ㅉ': 'ㅈㅈ',
  'ㄳ': 'ㄱㅅ', 'ㄵ': 'ㄴㅈ', 'ㄶ': 'ㄴㅎ', 'ㄺ': 'ㄹㄱ', 'ㄻ': 'ㄹㅁ', 'ㄼ': 'ㄹㅂ',
  'ㄽ': 'ㄹㅅ', 'ㄾ': 'ㄹㅌ', 'ㄿ': 'ㄹㅍ', 'ㅀ': 'ㄹㅎ', 'ㅄ': 'ㅂㅅ',
};

// 정원·정사각형 프리미티브만으로 된 자소: 너비를 높이에서 끌어온다(자동 축)
export const SQUARE_JAMO = new Set(['ㅁ', 'ㅇ']);

// 모음 분류: V 세로 / H 가로 / C 복합
export const VCLASS = {};
'ㅏㅐㅑㅒㅓㅔㅕㅖㅣ'.split('').forEach(v => VCLASS[v] = 'V');
'ㅗㅛㅜㅠㅡ'.split('').forEach(v => VCLASS[v] = 'H');
'ㅘㅙㅚㅝㅞㅟㅢ'.split('').forEach(v => VCLASS[v] = 'C');

// 복합 모음 = 가로 부분 + 세로 부분
export const COMPOUND = {
  'ㅘ': ['ㅗ', 'ㅏ'], 'ㅙ': ['ㅗ', 'ㅐ'], 'ㅚ': ['ㅗ', 'ㅣ'],
  'ㅝ': ['ㅜ', 'ㅓ'], 'ㅞ': ['ㅜ', 'ㅔ'], 'ㅟ': ['ㅜ', 'ㅣ'], 'ㅢ': ['ㅡ', 'ㅣ'],
};

// 세로 모음 골격 (절대 유닛, y-아래, 원점=상자 왼쪽 위의 골격 기준)
// v: {stem, branch, branchY, branchGap, dbl}
//   stem 기둥 길이, branch 곁줄기 길이, branchY 곁줄기 높이(위에서), branchGap ㅑ·ㅕ 두 곁줄기 간격, dbl ㅐ·ㅔ 두 기둥 간격
export function verticalVowel(ch, v) {
  const { stem: S, branch: B, branchY: y, branchGap: g, dbl: D } = v;
  const two = [y - g / 2, y + g / 2];
  switch (ch) {
    case 'ㅣ': return { w: 0, prims: [L([0, 0], [0, S])] };
    case 'ㅏ': return { w: B, prims: [L([0, 0], [0, S]), L([0, y], [B, y])] };
    case 'ㅑ': return { w: B, prims: [L([0, 0], [0, S]), ...two.map(t => L([0, t], [B, t]))] };
    case 'ㅓ': return { w: B, prims: [L([B, 0], [B, S]), L([0, y], [B, y])] };
    case 'ㅕ': return { w: B, prims: [L([B, 0], [B, S]), ...two.map(t => L([0, t], [B, t]))] };
    case 'ㅐ': return { w: D, prims: [L([0, 0], [0, S]), L([D, 0], [D, S]), L([0, y], [D, y])] };
    case 'ㅒ': return { w: D, prims: [L([0, 0], [0, S]), L([D, 0], [D, S]), ...two.map(t => L([0, t], [D, t]))] };
    case 'ㅔ': return { w: B + D, prims: [L([B, 0], [B, S]), L([B + D, 0], [B + D, S]), L([0, y], [B, y])] };
    case 'ㅖ': return { w: B + D, prims: [L([B, 0], [B, S]), L([B + D, 0], [B + D, S]), ...two.map(t => L([0, t], [B, t]))] };
  }
  throw new Error('세로 모음 아님: ' + ch);
}

// 가로 모음 골격. h: {bar, tick, tickX, tickGap}
//   bar 가로줄 길이, tick 꼭지 길이, tickX 꼭지 위치(가로줄 비율), tickGap ㅛ·ㅠ 꼭지 간격
//   반환 높이는 tick. 가로줄 y: ㅗㅛ=tick, ㅜㅠ=0, ㅡ=0
export function horizontalVowel(ch, h) {
  const { bar: W, tick: T, tickX, tickGap: g } = h;
  const x = W * tickX;
  const xs2 = [x - g / 2, x + g / 2];
  switch (ch) {
    case 'ㅡ': return { w: W, h: 0, barY: 0, prims: [L([0, 0], [W, 0])] };
    case 'ㅗ': return { w: W, h: T, barY: T, prims: [L([0, T], [W, T]), L([x, 0], [x, T])] };
    case 'ㅛ': return { w: W, h: T, barY: T, prims: [L([0, T], [W, T]), ...xs2.map(a => L([a, 0], [a, T]))] };
    case 'ㅜ': return { w: W, h: T, barY: 0, prims: [L([0, 0], [W, 0]), L([x, 0], [x, T])] };
    case 'ㅠ': return { w: W, h: T, barY: 0, prims: [L([0, 0], [W, 0]), ...xs2.map(a => L([a, 0], [a, T]))] };
  }
  throw new Error('가로 모음 아님: ' + ch);
}

export function decompose(code) {
  const s = code - 0xAC00;
  if (s < 0 || s > 11171) return null;
  return { cho: CHO[Math.floor(s / 588)], jung: JUNG[Math.floor((s % 588) / 28)], jong: s % 28 ? JONG[s % 28 - 1] : null };
}

export function compose(cho, jung, jong) {
  return String.fromCharCode(0xAC00 + CHO.indexOf(cho) * 588 + JUNG.indexOf(jung) * 28 + (jong ? JONG.indexOf(jong) + 1 : 0));
}

export function glyphName(slot, ch) {
  if (slot === 'cho') return 'cho.' + CHO_NAMES[CHO.indexOf(ch)];
  if (slot === 'jung') return 'jung.' + JUNG_NAMES[JUNG.indexOf(ch)];
  return 'jong.' + JONG_NAMES[JONG.indexOf(ch)];
}

export function jamoUnicode(slot, ch) {
  if (slot === 'cho') return 0x1100 + CHO.indexOf(ch);
  if (slot === 'jung') return 0x1161 + JUNG.indexOf(ch);
  return 0x11A8 + JONG.indexOf(ch);
}

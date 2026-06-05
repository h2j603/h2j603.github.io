/**
 * 작품의 size 문자열을 실제 mm 치수로 정규화.
 *
 * 지원하는 표기:
 *   - ISO 표준: "A0"–"A6", "B0"–"B5" (대소문자 무관)
 *   - 직접 치수: "210×270mm", "420 x 594 mm", "210x270" (단위 생략 허용)
 *
 * 알 수 없거나 빈 문자열(웹 작품 등)은 null을 반환 — 호출자가 디지털 기본 크기를
 * 따로 잡아 사용한다.
 */

export interface Dimensions {
  /** 너비 (mm) */
  w: number;
  /** 높이 (mm) */
  h: number;
  /** longest edge (mm) — 폭 비례 산정용 */
  longest: number;
  /** 종횡비 (w / h) — 카드 aspect-ratio용 */
  ratio: number;
}

/** ISO 216 (A/B 시리즈) mm 치수 — 짧은 변 × 긴 변. */
const ISO_SIZES: Record<string, [number, number]> = {
  A0: [841, 1189],
  A1: [594, 841],
  A2: [420, 594],
  A3: [297, 420],
  A4: [210, 297],
  A5: [148, 210],
  A6: [105, 148],
  B0: [1000, 1414],
  B1: [707, 1000],
  B2: [500, 707],
  B3: [353, 500],
  B4: [250, 353],
  B5: [176, 250],
};

const STD_RE = /^([AB])\s*([0-6])$/i;
const DIM_RE = /^(\d+(?:\.\d+)?)\s*[×x*]\s*(\d+(?:\.\d+)?)\s*(?:mm)?$/i;

export function parseSize(raw: string | undefined | null): Dimensions | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // ISO 표준
  const std = STD_RE.exec(s);
  if (std) {
    const key = (std[1].toUpperCase() + std[2]) as keyof typeof ISO_SIZES;
    const tup = ISO_SIZES[key];
    if (tup) {
      const [w, h] = tup;
      return finalize(w, h);
    }
  }

  // 직접 치수
  const dim = DIM_RE.exec(s);
  if (dim) {
    const a = parseFloat(dim[1]);
    const b = parseFloat(dim[2]);
    if (a > 0 && b > 0) return finalize(a, b);
  }

  return null;
}

function finalize(w: number, h: number): Dimensions {
  return {
    w,
    h,
    longest: Math.max(w, h),
    ratio: w / h,
  };
}

/**
 * 태그 색상 — 자유형 태그에 결정적(해시) 색 부여.
 * 블록 배경 = 옅은 틴트(bg), #라벨 = 진한 동색(fg).
 * 팔레트는 사이트 톤(저채도 파스텔) 6색 — 태그가 늘어도 순환.
 */
export const TAG_PALETTE = [
  { bg: '#efe4ff', fg: '#8b4dde' }, // 보라
  { bg: '#eee4dc', fg: '#7a5c47' }, // 브라운
  { bg: '#e2eedd', fg: '#4e7a44' }, // 그린
  { bg: '#f6eecb', fg: '#8a7322' }, // 옐로
  { bg: '#dde9f4', fg: '#3e6b96' }, // 블루
  { bg: '#f6dfe8', fg: '#a04e72' }, // 핑크
] as const;

/** 같은 태그는 빌드·순서와 무관하게 항상 같은 색 (문자 해시). */
export function tagColor(tag: string): (typeof TAG_PALETTE)[number] {
  let h = 0;
  for (const ch of tag) h = (h * 31 + (ch.codePointAt(0) ?? 0)) % 99991;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

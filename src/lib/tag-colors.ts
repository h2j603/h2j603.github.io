/**
 * 태그 색상 — 자유형 태그에 결정적(해시) 색 부여.
 * 블록 배경 = 옅은 틴트(bg), #라벨 = 진한 동색(fg).
 * 팔레트는 사이트 톤(저채도 파스텔) 12색 — 6색일 때 실태그 3개가
 * 같은 칸에 떨어지는 충돌이 있어 폭을 2배로 확장.
 * 곱수 73은 현재 태그셋(archive·tools·interview·essay·studio·index)이
 * 전부 다른 칸에 떨어지도록 고른 값.
 */
export const TAG_PALETTE = [
  { bg: '#efe4ff', fg: '#8b4dde' }, // 0 보라
  { bg: '#eee4dc', fg: '#7a5c47' }, // 1 브라운
  { bg: '#e2eedd', fg: '#4e7a44' }, // 2 그린
  { bg: '#f6eecb', fg: '#8a7322' }, // 3 옐로
  { bg: '#dde9f4', fg: '#3e6b96' }, // 4 블루
  { bg: '#f6dfe8', fg: '#a04e72' }, // 5 핑크
  { bg: '#f9e6d4', fg: '#a3622a' }, // 6 오렌지
  { bg: '#d9efec', fg: '#2f7a6e' }, // 7 틸
  { bg: '#f8e0dc', fg: '#a8493d' }, // 8 레드
  { bg: '#e2e4f7', fg: '#4a55a8' }, // 9 인디고
  { bg: '#ecf2cf', fg: '#6d7f24' }, // 10 라임
  { bg: '#def0f7', fg: '#2e7796' }, // 11 시안
] as const;

/** 같은 태그는 빌드·순서와 무관하게 항상 같은 색 (문자 해시). */
export function tagColor(tag: string): (typeof TAG_PALETTE)[number] {
  let h = 0;
  for (const ch of tag) h = (h * 73 + (ch.codePointAt(0) ?? 0)) % 99991;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

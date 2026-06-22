/**
 * 태그 색상 — 자유형 태그에 결정적(해시) **hue 오프셋**을 부여.
 * 실제 색은 빌드 타임에 고정하지 않는다: CSS에서 활성 팔레트(--stripe-a)의
 * hue를 이 오프셋만큼 돌려 런타임에 파생한다 (.tag-chip 규칙). 따라서
 * 로드마다 바뀌는 랜덤 팔레트를 태그칩도 그대로 따라간다.
 *
 * 12칸(30°)으로 나눠 실태그가 서로 다른 칸에 떨어지게 한다. 곱수 73은
 * 현재 태그셋(archive·tools·interview·essay·studio·index)이 전부 다른
 * 칸에 떨어지도록 고른 값 — 기존 분포를 그대로 유지.
 */
const TAG_STEPS = 12; // 30°씩 — 한 바퀴를 12칸으로

/** 같은 태그는 빌드·순서·팔레트와 무관하게 항상 같은 hue 오프셋(도). */
export function tagHue(tag: string): number {
  let h = 0;
  for (const ch of tag) h = (h * 73 + (ch.codePointAt(0) ?? 0)) % 99991;
  return (h % TAG_STEPS) * (360 / TAG_STEPS);
}

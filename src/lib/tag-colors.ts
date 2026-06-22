/**
 * 태그 색상 — 자유형 태그에 결정적(해시) **hue 오프셋**을 부여.
 * 실제 색은 빌드 타임에 고정하지 않는다: CSS에서 활성 팔레트(--stripe-a)의
 * hue를 이 오프셋만큼 돌려 런타임에 파생한다 (.tag-chip 규칙). 따라서
 * 로드마다 바뀌는 랜덤 팔레트를 태그칩도 그대로 따라간다.
 *
 * 전체 360°를 돌리면 보색까지 튀어 "테마와 무관한 색"으로 보이므로, 테마색
 * 기준 **±SPREAD/2°의 좁은 호** 안에서만 변주한다 → 전부 같은 색 계열(유사색)
 * 이되 태그별로 구분된다. 12칸으로 나누고(곱수 73은 실태그 archive·tools·
 * interview·essay·studio·index가 서로 다른 칸에 떨어지도록 고른 값) 그 칸을
 * 호 위에 펼친다. 폭을 좁히면 차분, 넓히면 또렷.
 */
const TAG_STEPS = 12;
const SPREAD = 100; // 호 너비(도) — 테마색 ±50° 안에서 변주

/** 같은 태그는 빌드·순서·팔레트와 무관하게 항상 같은 hue 오프셋(도, 부호 있음). */
export function tagHue(tag: string): number {
  let h = 0;
  for (const ch of tag) h = (h * 73 + (ch.codePointAt(0) ?? 0)) % 99991;
  const step = h % TAG_STEPS; // 0..11
  // 호 위에 균등 배치: step 0 → -SPREAD/2, step 11 → +SPREAD/2 (테마색이 중앙)
  return Math.round(-SPREAD / 2 + step * (SPREAD / (TAG_STEPS - 1)));
}

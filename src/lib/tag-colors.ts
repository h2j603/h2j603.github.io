/**
 * 태그 색상 — 자유형 태그에 결정적(해시) **앵커 + hue 오프셋**을 부여.
 * 실제 색은 빌드 타임에 고정하지 않는다: CSS에서 활성 팔레트의 두 색
 * (--stripe-a / --stripe-b) 중 앵커가 가리키는 색의 hue를 오프셋만큼 돌려
 * 런타임에 파생한다 (.tag-chip 규칙). 로드마다 바뀌는 랜덤 팔레트를 그대로 탄다.
 *
 * - 앵커: 해시 짝/홀로 두 그룹 → 절반은 stripe-a(예: 보라) 계열, 절반은
 *   stripe-b(예: 갈) 계열. 팔레트의 두 색을 모두 쓴다.
 * - 오프셋: 각 앵커색 기준 ±SPREAD/2°의 **좁은 호** 안에서만 변주 → 같은
 *   가족(유사색)이되 태그별로 구분. (12칸을 호 위에 균등 배치)
 * 폭(SPREAD)을 좁히면 차분, 넓히면 또렷.
 */
const TAG_STEPS = 12;
const SPREAD = 40; // 각 앵커 가족의 호 너비(도) — ±20°

function hashOf(tag: string): number {
  let h = 0;
  for (const ch of tag) h = (h * 73 + (ch.codePointAt(0) ?? 0)) % 99991;
  return h;
}

/** 태그가 속한 앵커 — 'a'=stripe-a 계열, 'b'=stripe-b 계열. */
export function tagAnchor(tag: string): 'a' | 'b' {
  return hashOf(tag) % 2 === 0 ? 'a' : 'b';
}

/** 앵커색 hue에 더할 오프셋(도, 부호 있음). 앵커와 약하게 decorrelate(상위 비트). */
export function tagHue(tag: string): number {
  const step = Math.floor(hashOf(tag) / 2) % TAG_STEPS; // 0..11
  return Math.round(-SPREAD / 2 + step * (SPREAD / (TAG_STEPS - 1)));
}

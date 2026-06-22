/**
 * 태그 색상 — 두 테마색(--stripe-a / --stripe-b) **사이 hue를 균등 분할**해
 * 각 태그에 한 지점을 준다. 실제 색은 빌드 타임에 고정하지 않는다: CSS에서
 * color-mix(in oklch, stripe-a N%, stripe-b)로 두 색을 보간한 뒤 그 hue만 뽑아
 * 역할별 L/C(배경=옅은 틴트, 글자=진한 동색)를 입힌다 (.tag-chip 규칙). 따라서
 * 로드마다 바뀌는 랜덤 팔레트의 두 색을 그대로 따라간다.
 *
 * 전체 태그를 정렬해 0..100%(stripe-a 비중)로 균등 배치 → 첫 태그=stripe-b쪽,
 * 끝 태그=stripe-a쪽, 사이는 일정 간격. 같은 태그는 memo·컬렉션 어디서나 동일.
 * 빌드 타임에 전체 목록으로 한 번 만든다.
 */
export function buildTagMixMap(tags: string[]): Map<string, number> {
  const uniq = [...new Set(tags)].sort();
  const n = uniq.length;
  const map = new Map<string, number>();
  uniq.forEach((t, i) => {
    const frac = n <= 1 ? 0.5 : i / (n - 1); // 0..1, 균등
    map.set(t, Math.round(frac * 100)); // stripe-a 비중 %
  });
  return map;
}

// 컬러 팔레트 스와치 — 클릭하면 다음 팔레트로 순환.
// 초기 팔레트는 head 인라인 스크립트가 로드마다 무작위로 지정(data-palette).
// 여기선 그 값을 기점으로 순환만 — CSS의 :root[data-palette]가 stripe 두 색을
// 갈아끼우고, 스와치 표면(var(--stripe-a/b))도 자동 갱신된다.
// 목록은 global.css 프리셋 + head 인라인 배열과 일치해야 한다.
var PALETTES = ['original', 'blue', 'gold'];

export function initPalette() {
  var swatch = document.querySelector('.palette-swatch');
  if (!swatch) return;
  swatch.addEventListener('click', function () {
    var root = document.documentElement;
    var cur = PALETTES.indexOf(root.dataset.palette);
    root.dataset.palette = PALETTES[(cur + 1) % PALETTES.length];
  });
}

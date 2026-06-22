// 테마 팔레트 — 1분마다 다음 색으로 순환(시간 기준). 초기값은 head 인라인이
// 첫 페인트 전 지정(깜빡임 방지), 여기선 분 경계마다 갱신해 페이지를 열어둔
// 채로도 라이브로 바뀐다. epoch-분 기준이라 인라인과 결정적으로 일치한다.
// 목록은 global.css 프리셋 + head 인라인 배열과 일치해야 한다.
var PALETTES = ['original', 'blue', 'gold'];

function pick() {
  return PALETTES[Math.floor(Date.now() / 60000) % PALETTES.length];
}

export function initPalette() {
  function apply() {
    document.documentElement.dataset.palette = pick();
  }
  apply(); // 인라인과 동기화
  // 다음 분 경계에 맞춰 첫 갱신 후 1분 간격 유지
  setTimeout(function () {
    apply();
    setInterval(apply, 60000);
  }, 60000 - (Date.now() % 60000));
}

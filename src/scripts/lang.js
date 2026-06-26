// 한·영 토글 — 띠 위 칩(.lang-toggle)이 .three-col[data-lang]을 바꾼다.

export function initLang() {
  var langToggle = document.querySelector('.lang-toggle');
  var threeCol = document.querySelector('.three-col');
  if (!langToggle) return;
  // 현재 언어를 .three-col에 반영 → 작품 본문 + About 서랍이
  // 그 언어만 1단으로 표시됨 (양쪽 컬럼 모두 포함하려고 center 대신 three-col)
  function applyLang(lang) {
    // 문서 언어도 동기화 — 스크린리더 발음·SEO가 보이는 언어를 따르게
    document.documentElement.lang = lang;
    if (threeCol) threeCol.setAttribute('data-lang', lang);
    // About 서랍(.three-col 밖 형제 레이어)도 같은 언어 규칙을 타게
    var drawer = document.querySelector('.about-drawer');
    if (drawer) drawer.setAttribute('data-lang', lang);
    // 표 제목 — data-ko/en 스왑 (게시 행은 <a>, 미게시 잠긴 행은 <span>)
    document.querySelectorAll('table.sontable [data-ko]').forEach(function (el) {
      el.textContent = el.getAttribute('data-' + lang) || '';
    });
  }
  applyLang(langToggle.getAttribute('data-lang') || 'ko'); // 초기 동기화
  langToggle.addEventListener('click', function () {
    var cur = langToggle.getAttribute('data-lang') || 'ko';
    var next = cur === 'ko' ? 'en' : 'ko';
    langToggle.setAttribute('data-lang', next);
    langToggle.textContent = next === 'ko' ? 'EN' : 'KO';
    applyLang(next);
  });
}

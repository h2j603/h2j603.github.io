// 미게시(locked) 행 클릭 — 줄무늬 띠가 그 행을 채우며 아래서 올라와
// '비공개 / private'를 찍었다가 후퇴한다. 사이트 커튼(About) 모티프의 행 단위
// 에코 — 단 펼침은 여전히 불가(카드 없음). 띠는 행의 bounding box에 맞춰
// body에 fixed로 띄워 표 레이아웃을 건드리지 않는다.

var RISE_HOLD = 900; // 다 차오른 뒤 멈춰 라벨을 보여주는 시간(ms)
var FALL_DONE = 1320; // 후퇴까지 끝나 정리하는 시점(ms)

function play(row) {
  if (row.dataset.striping === '1') return; // 재생 중 재클릭 무시
  row.dataset.striping = '1';

  var r = row.getBoundingClientRect();
  var el = document.createElement('div');
  el.className = 'row-stripe';
  el.style.left = r.left + 'px';
  el.style.top = r.top + 'px';
  el.style.width = r.width + 'px';
  el.style.height = r.height + 'px';

  var lang = document.querySelector('.three-col');
  lang = lang ? lang.getAttribute('data-lang') : 'ko';
  var label = document.createElement('span');
  label.className = 'row-stripe-label';
  label.textContent = lang === 'en' ? 'private' : '비공개';
  el.appendChild(label);

  document.body.appendChild(el);
  requestAnimationFrame(function () { el.classList.add('rise'); });
  setTimeout(function () {
    el.classList.remove('rise');
    el.classList.add('fall');
  }, RISE_HOLD);
  setTimeout(function () {
    el.remove();
    row.dataset.striping = '';
  }, FALL_DONE);
}

export function initLocked() {
  document.querySelectorAll('table.sontable tr[data-locked="true"]').forEach(function (row) {
    row.addEventListener('click', function (e) {
      // 행 안의 링크(연도→위키 등)는 본래 동작 유지 — 띠 안 띄움
      if (e.target.closest('a')) return;
      play(row);
    });
  });
}

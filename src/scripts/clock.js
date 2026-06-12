// 하단 콜로폰 시계 — 빌드 시각 옆에 현재 시각(KST, 초 단위) 병기.
// 시계는 콘텐츠라 JS 타이머 유지 (점멸은 CSS link-blink로 이전됨).

export function initClock() {
  var clockEls = document.querySelectorAll('.now-clock');
  if (!clockEls.length) return;
  function tickClock() {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    function g(t) {
      var p = parts.find(function (x) { return x.type === t; });
      return p ? p.value : '';
    }
    var s = g('year') + '.' + g('month') + '.' + g('day') + ' ' + g('hour') + ':' + g('minute') + ':' + g('second');
    clockEls.forEach(function (el) { el.textContent = s; });
  }
  tickClock();
  setInterval(tickClock, 1000); // 초 단위
}

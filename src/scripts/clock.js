// 하단 콜로폰 시계 — 빌드 시각 옆에 현재 시각(KST, 초 단위) 병기.
// 시계는 콘텐츠라 JS 타이머 유지 (점멸은 CSS link-blink로 이전됨).
//
// 각 자릿수를 .t-digit span으로 깔고, 매초 갱신 때 값이 '바뀐 자리'에만
// pop-in 애니메이션(.is-animating)을 재생한다 — 초 1의 자리는 매초, 윗자리는
// 가끔 → 잔잔한 캐스케이드. 첫 렌더는 정적(로드 시 조용히).

export function initClock() {
  var clockEls = document.querySelectorAll('.now-clock');
  if (!clockEls.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  // 단일 자리 재생 — 클래스를 떼고 리플로우로 강제 후 다시 붙여 애니메이션 재시작.
  function pop(el) {
    el.classList.remove('is-animating');
    void el.offsetWidth; // 리플로우 — 다음 프레임에 애니메이션 다시 돈다
    el.classList.add('is-animating');
  }

  // .now-clock 별로 자릿수 span 상태를 들고 있는다 (span + 현재 글자).
  var groups = [];
  clockEls.forEach(function (el) {
    el.textContent = '';
    groups.push({ el: el, slots: [] });
  });

  function nowString() {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    function g(t) {
      var p = parts.find(function (x) { return x.type === t; });
      return p ? p.value : '';
    }
    return g('year') + '.' + g('month') + '.' + g('day') + ' ' + g('hour') + ':' + g('minute') + ':' + g('second');
  }

  function render(first) {
    var s = nowString();
    groups.forEach(function (grp) {
      // 자릿수 맞추기 (길이는 상수지만 방어적으로)
      while (grp.slots.length < s.length) {
        var span = document.createElement('span');
        span.className = 't-digit';
        grp.el.appendChild(span);
        grp.slots.push({ span: span, ch: null });
      }
      while (grp.slots.length > s.length) {
        grp.el.removeChild(grp.slots.pop().span);
      }
      for (var i = 0; i < s.length; i++) {
        var slot = grp.slots[i];
        var ch = s.charAt(i);
        if (slot.ch === ch) continue;        // 안 바뀐 자리는 그대로 (팝 없음)
        slot.span.textContent = ch;
        slot.ch = ch;
        if (!first && !reduce.matches) pop(slot.span); // 바뀐 글리프만 팝인
      }
    });
  }

  render(true);                               // 첫 렌더 — 애니메이션 없이 즉시
  setInterval(function () { render(false); }, 1000); // 초 단위, 바뀐 자리만 팝
}

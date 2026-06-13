// 표 아코디언 + URL hash 동기화 + 모바일 섹션 페이저.
//
// hash 문법 (하나의 네임스페이스를 셋이 나눠 씀):
//   #<slug>               작품 펼침 (Portfolio 섹션)
//   #notepad #collection  모바일 섹션 (데스크탑은 data-section을 무시 — 무해)
//   (없음)                Portfolio 기본, 아코디언 닫힘
// → 새로고침·공유 링크에서도 모바일 섹션 상태가 유지된다.
import { isMobileView, anchorY, glideScrollBy } from './util.js';

var SECTION_HASHES = ['portfolio', 'notepad', 'collection'];

var cards = [];
var centerContent = null; // 카드 저장소 (.center .content)
var centerEl = null;
var threeCol = null;
var accSlug = null; // 현재 열린 slug
var accRow = null;  // 현재 detail <tr>

export function accClose() {
  if (!accRow) return;
  var tr = document.querySelector('tr[data-slug="' + accSlug + '"]');
  // 패널 제거로 생기는 레이아웃 점프 보정 — 닫힌 행을 화면상 제자리에 고정.
  // (다른 행으로 전환할 때도 이 핀이 점프를 막는다)
  var pinTop = tr && centerEl ? tr.getBoundingClientRect().top : null;
  var card = accRow.querySelector('.work-card');
  if (card && centerContent) centerContent.appendChild(card); // 저장소로 복귀
  if (accRow.parentNode) accRow.parentNode.removeChild(accRow);
  if (tr) tr.setAttribute('data-active', 'false');
  if (tr && centerEl && pinTop !== null) {
    var after = tr.getBoundingClientRect().top;
    if (after !== pinTop) centerEl.scrollTop += after - pinTop;
  }
  accRow = null;
  accSlug = null;
}

function accOpen(slug) {
  var tr = document.querySelector('tr[data-slug="' + slug + '"]');
  var card = document.getElementById(slug);
  if (!tr || !card) return;
  accClose();
  var detail = document.createElement('tr');
  detail.className = 'accordion-detail';
  var td = document.createElement('td');
  td.colSpan = 4;
  var panel = document.createElement('div');
  panel.className = 'accordion-panel';
  panel.appendChild(card);
  td.appendChild(panel);
  detail.appendChild(td);
  tr.parentNode.insertBefore(detail, tr.nextSibling);
  tr.setAttribute('data-active', 'true');
  accSlug = slug;
  accRow = detail;
  // 점멸 위상 동기화 — DOM 이동으로 재시작된 카드 링크의 link-blink를
  // 문서 로드 기준 전역 박자(1.4s, global.css와 짝)에 다시 맞춘다
  var phase = -(performance.now() % 1400);
  panel.querySelectorAll('.card-body a, .card-link').forEach(function (a) {
    a.style.animationDelay = phase + 'ms';
  });
  if (isMobileView()) {
    // 모바일: 펼친 행이 보이게 부드럽게 스크롤
    tr.scrollIntoView({ block: 'start', behavior: 'smooth' });
  } else {
    // 데스크탑 시점 이동 — 행을 화면 상단 ~22% 지점(anchorY)으로 글라이드.
    // (브라우저 smooth scrollTo는 호출 시점의 스크롤 한계로 clamp돼서,
    //  패널이 자라며 생기는 공간을 못 따라감 → 수동 글라이드 사용)
    glideScrollBy(centerEl, tr.getBoundingClientRect().top - anchorY(), 500);
  }
}

// 모바일 섹션 전환 — 상태는 .three-col[data-section] 하나, 표시는 mobile.css.
// 공간 배치(좌→우)와 같은 순서 — 슬라이드 방향 계산에 쓴다.
var SECTION_ORDER = ['notepad', 'portfolio', 'collection'];

function setSection(name) {
  if (!threeCol || threeCol.getAttribute('data-section') === name) return;
  var from = SECTION_ORDER.indexOf(threeCol.getAttribute('data-section'));
  var to = SECTION_ORDER.indexOf(name);
  threeCol.setAttribute('data-section', name);
  if (isMobileView()) {
    window.scrollTo(0, 0); // 새 섹션은 머리띠부터
    // 들어오는 섹션이 이동 방향에서 살짝 밀려 들어옴 (mobile.css keyframes와 짝).
    // 같은 방향 연속 전환에도 재생되게 속성 제거 → reflow → 재부여로 리셋.
    threeCol.removeAttribute('data-slide');
    void threeCol.offsetWidth;
    threeCol.setAttribute('data-slide', to > from ? 'from-right' : 'from-left');
  }
}

// hash를 바꾸고 적용 — 화살표·스와이프 공용.
// (replaceState는 hashchange를 안 쏘므로 applyHash 직접 호출)
function goSection(name) {
  history.replaceState(null, '', name === 'portfolio' ? location.pathname : '#' + name);
  applyHash();
}

// URL hash ↔ 아코디언·섹션 동기화 (직접 진입, 뒤로가기, home 링크 대응).
// 클릭 핸들러는 replaceState 후 직접 적용하므로 여기선 hashchange·초기 진입 처리.
export function applyHash() {
  var h = (location.hash || '').replace(/^#/, '');
  if (SECTION_HASHES.indexOf(h) !== -1) {
    accClose();
    setSection(h);
    return;
  }
  var hasSlug = h && cards.some(function (c) { return c.id === h; });
  if (hasSlug) {
    setSection('portfolio'); // 작품 hash 직접 진입 — 표가 있는 섹션으로
    if (accSlug !== h) accOpen(h);
  } else {
    accClose();
    setSection('portfolio');
  }
}

export function initAccordion() {
  cards = Array.from(document.querySelectorAll('.work-card'));
  centerContent = document.querySelector('.three-col .center .content');
  centerEl = document.querySelector('.three-col .center');
  threeCol = document.querySelector('.three-col');

  // 표 행 클릭 — 블록(행) 전체가 토글 단위 (메모 블록과 같은 어법).
  // 연도 등 외부 링크는 본연의 동작대로 통과.
  document.querySelectorAll('table.sontable tr[data-slug]').forEach(function (tr) {
    tr.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (a && !(a.getAttribute('href') || '').startsWith('#')) return;
      e.preventDefault();
      var slug = tr.getAttribute('data-slug');
      if (accSlug === slug) {
        accClose();
        if (location.hash) history.replaceState(null, '', location.pathname);
      } else {
        accOpen(slug);
        history.replaceState(null, '', '#' + slug);
      }
    });
  });

  // 모바일 섹션 페이저 — 머리띠 양옆 화살표.
  document.querySelectorAll('.path-arrow').forEach(function (btn) {
    btn.addEventListener('click', function () {
      goSection(btn.getAttribute('data-go'));
    });
  });

  // ── 스와이프 — 좌우 플릭으로도 섹션 이동 (화살표와 같은 경로).
  // 세로 스크롤이 우세한 제스처는 무시하고, 핀치 줌(멀티터치)·About 서랍
  // 열림 중엔 발동하지 않는다. passive라 스크롤 성능에 영향 없음.
  var touchX = 0, touchY = 0, touchValid = false;
  document.addEventListener('touchstart', function (e) {
    touchValid = e.touches.length === 1 && isMobileView() &&
      !document.querySelector('.stripe-top.open');
    if (touchValid) {
      touchX = e.touches[0].clientX;
      touchY = e.touches[0].clientY;
    }
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!touchValid || e.touches.length > 0) return; // 두 번째 손가락 남음 = 핀치
    touchValid = false;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchX;
    var dy = t.clientY - touchY;
    // 발동 조건: 가로 56px 이상 + 가로가 세로의 1.4배 이상 우세
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    var cur = threeCol ? threeCol.getAttribute('data-section') : 'portfolio';
    var i = SECTION_ORDER.indexOf(cur);
    var next = SECTION_ORDER[i + (dx < 0 ? 1 : -1)]; // 왼쪽 플릭 = 오른쪽 섹션
    if (next) goSection(next); // 양끝 밖은 무시 (Notepad 왼쪽/Collection 오른쪽 없음)
  }, { passive: true });

  window.addEventListener('hashchange', applyHash);
  applyHash();
}

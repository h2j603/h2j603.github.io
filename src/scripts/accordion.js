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
function setSection(name) {
  if (!threeCol || threeCol.getAttribute('data-section') === name) return;
  threeCol.setAttribute('data-section', name);
  if (isMobileView()) window.scrollTo(0, 0); // 새 섹션은 머리띠부터
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

  // 모바일 섹션 페이저 — 머리띠 양옆 화살표. hash를 바꾸고 적용한다
  // (replaceState는 hashchange를 안 쏘므로 applyHash 직접 호출).
  document.querySelectorAll('.path-arrow').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var go = btn.getAttribute('data-go');
      history.replaceState(null, '', go === 'portfolio' ? location.pathname : '#' + go);
      applyHash();
    });
  });

  window.addEventListener('hashchange', applyHash);
  applyHash();
}

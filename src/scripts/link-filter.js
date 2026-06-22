// 우측 태그 드롭다운 — 선택 태그만 표시, 사이 hr·교차 틴트 재계산.

export function initLinkFilter() {
  var tagFilterEl = document.getElementById('linkTagFilter');
  if (!tagFilterEl) return;
  var clearBtn = document.getElementById('linkFilterClear');
  function applyLinkFilter() {
    var v = tagFilterEl.value;
    var shown = 0;
    // 상태 표시 — 활성 태그 칩 강조 + 해제 칩 노출(필터 걸렸을 때만)
    if (clearBtn) clearBtn.hidden = !v;
    document.querySelectorAll('.link-list .tag-chip[data-tag]').forEach(function (c) {
      c.classList.toggle('tag-active', !!v && c.getAttribute('data-tag') === v);
    });
    document.querySelectorAll('.link-list a.link-item').forEach(function (a) {
      var tags = (a.getAttribute('data-tags') || '').split(',').filter(Boolean);
      var show = !v || tags.indexOf(v) !== -1;
      a.hidden = !show;
      // 항목 사이 hr만 관리 — 필터 줄 아래 hr은 앞 형제가 label이라 제외
      var hr = a.previousElementSibling;
      if (hr && hr.tagName === 'HR' && hr.previousElementSibling && hr.previousElementSibling.tagName === 'A') {
        hr.hidden = !(show && shown > 0);
      }
      if (show) {
        a.classList.toggle('row-a', shown % 2 === 0);
        a.classList.toggle('row-b', shown % 2 === 1);
        shown++;
      }
    });
  }
  tagFilterEl.addEventListener('change', applyLinkFilter);

  // 해제 칩 — 전체로 되돌림
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      tagFilterEl.value = '';
      applyLinkFilter();
    });
  }

  // 태그 칩 클릭 → 그 태그로 드롭다운 필터 설정(같은 태그 재클릭 시 전체로 토글).
  // 칩이 link-item(<a>) 안에 있으므로 링크 이동은 막는다.
  document.querySelectorAll('.link-list .tag-chip[data-tag]').forEach(function (chip) {
    chip.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var t = chip.getAttribute('data-tag');
      tagFilterEl.value = tagFilterEl.value === t ? '' : t;
      applyLinkFilter();
    });
  });
}

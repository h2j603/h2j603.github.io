// 텍스트 후처리 — @멘션 표시 + 한글 글리프 baseline 보정용 래핑.

// @로 시작하는 링크 텍스트 → mention 클래스 (인물 아이콘 + 갈색)
function markMentions() {
  var sel = '.intro a, .work-card .card-body a, .work-card .card-link';
  document.querySelectorAll(sel).forEach(function (a) {
    var t = (a.textContent || '').trim();
    if (t.charAt(0) === '@') a.classList.add('mention');
  });
}

// 한글 char만 .ko span으로 감싸기 (영문 baseline에 맞춰 미세 위치 조정용)
var KO_RE = /[ㄱ-힝]/;

function wrapKoreanIn(root) {
  var skip = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, IFRAME: 1, TEXTAREA: 1 };
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: function (n) {
      var p = n.parentNode;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (skip[p.nodeName]) return NodeFilter.FILTER_REJECT;
      if (p.classList && p.classList.contains('ko')) return NodeFilter.FILTER_REJECT;
      if (!KO_RE.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  var nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(function (node) {
    var text = node.nodeValue;
    var frag = document.createDocumentFragment();
    var buf = '';
    var isKo = false;
    function flush() {
      if (!buf) return;
      if (isKo) {
        var span = document.createElement('span');
        span.className = 'ko';
        span.textContent = buf;
        frag.appendChild(span);
      } else {
        frag.appendChild(document.createTextNode(buf));
      }
      buf = '';
    }
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var ko = KO_RE.test(ch);
      if (ko !== isKo) {
        flush();
        isKo = ko;
      }
      buf += ch;
    }
    flush();
    node.parentNode.replaceChild(frag, node);
  });
}

export function initText() {
  markMentions();
  wrapKoreanIn(document.body);
}

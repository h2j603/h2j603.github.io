// 텍스트 후처리 — @멘션 표시 + 한글 글리프 baseline 보정용 래핑.

// @로 시작하는 링크 텍스트 → mention 클래스 (인물 아이콘 + 갈색)
function markMentions() {
  var sel = '.intro a, .work-card .card-body a, .work-card .card-link';
  document.querySelectorAll(sel).forEach(function (a) {
    var t = (a.textContent || '').trim();
    if (t.charAt(0) === '@') a.classList.add('mention');
  });
}

// 한글 char는 .ko, 영문(라틴 letter) char는 .en span으로 감싼다 — 두 폰트의
// baseline 차이를 CSS(.ko/.en top)로 보정하기 위한 래핑. 숫자·문장부호·공백은
// 중립이라 감싸지 않는다(번호·연도·시간 등 영향 없음). .lang-toggle·.now-clock은
// JS가 textContent를 갱신해 래핑이 덮어써지므로 제외.
var KO_RE = /[ㄱ-힝]/;
var EN_RE = /[A-Za-z]/;
function charClass(ch) {
  return KO_RE.test(ch) ? 'ko' : EN_RE.test(ch) ? 'en' : 'x';
}

function wrapScripts(root) {
  var skip = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, IFRAME: 1, TEXTAREA: 1 };
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: function (n) {
      var p = n.parentNode;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (skip[p.nodeName]) return NodeFilter.FILTER_REJECT;
      if (p.classList && (p.classList.contains('ko') || p.classList.contains('en'))) {
        return NodeFilter.FILTER_REJECT;
      }
      if (p.closest && p.closest('.lang-toggle, .now-clock')) return NodeFilter.FILTER_REJECT;
      if (!KO_RE.test(n.nodeValue) && !EN_RE.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  var nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(function (node) {
    var text = node.nodeValue;
    var frag = document.createDocumentFragment();
    var buf = '';
    var cur = null;
    function flush() {
      if (!buf) return;
      if (cur === 'ko' || cur === 'en') {
        var span = document.createElement('span');
        span.className = cur;
        span.textContent = buf;
        frag.appendChild(span);
      } else {
        frag.appendChild(document.createTextNode(buf));
      }
      buf = '';
    }
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var c = charClass(ch);
      if (c !== cur) {
        flush();
        cur = c;
      }
      buf += ch;
    }
    flush();
    node.parentNode.replaceChild(frag, node);
  });
}

export function initText() {
  markMentions();
  wrapScripts(document.body);
}

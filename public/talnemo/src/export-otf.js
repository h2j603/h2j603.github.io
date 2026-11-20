// CFF(OTF) 내보내기. opentype.js 를 인자로 받는다(브라우저·Node 공용).
// 자소는 로컬 좌표 그대로(components 없이), 음절은 외곽선을 펼쳐 넣는다.
import { CHO, JUNG, JONG, glyphName, jamoUnicode } from './jamo.js?v=1e8ad57';
import { layoutSyllable, layoutJamo } from './layout.js?v=1e8ad57';
import { localPart } from './export-ufo.js?v=1e8ad57';
import { mergeContours } from './merge.js?v=1e8ad57';

export function buildOTF(opentype, P, chars, pc) {
  const { Path, Glyph, Font } = opentype;
  const pathOf = contours => {
    const p = new Path();
    for (const c of contours) {
      for (const k of c) {
        if (k[0] === 'M') p.moveTo(k[1], k[2]);
        else if (k[0] === 'L') p.lineTo(k[1], k[2]);
        else if (k[0] === 'C') p.curveTo(k[1], k[2], k[3], k[4], k[5], k[6]);
      }
      p.close();
    }
    return p;
  };

  const glyphs = [
    new Glyph({ name: '.notdef', advanceWidth: 500, path: new Path() }),
    new Glyph({ name: 'space', unicode: 0x20, advanceWidth: 300, path: new Path() }),
  ];

  for (const [slot, list] of [['cho', CHO], ['jung', JUNG], ['jong', JONG]]) {
    for (const ch of list) {
      const { contours, advance } = localPart(layoutJamo(P, slot, ch), pc);
      glyphs.push(new Glyph({ name: glyphName(slot, ch), unicode: jamoUnicode(slot, ch), advanceWidth: advance, path: pathOf(contours) }));
    }
  }

  const seen = new Set();
  for (const ch of chars) {
    const g = layoutSyllable(P, ch);
    if (!g) continue;
    const name = 'uni' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    if (seen.has(name)) continue;
    seen.add(name);
    glyphs.push(new Glyph({
      name, unicode: ch.codePointAt(0), advanceWidth: g.advance,
      path: pathOf(g.parts.flatMap(p => pc && p.kinds ? mergeContours(p.contours, p.kinds, pc) : p.contours)),
    }));
  }

  const font = new Font({
    familyName: 'Talnemo ' + P.meta.id, styleName: 'Regular',
    unitsPerEm: P.font.upm, ascender: P.font.ascender, descender: P.font.descender,
    glyphs,
  });
  return compactCmap(font.toArrayBuffer());
}

const BE = (arr, off) => ((arr[off] << 24) >>> 0) + (arr[off + 1] << 16) + (arr[off + 2] << 8) + arr[off + 3];

function sum32(arr, off, len) {
  let s = 0;
  for (let i = 0; i < len; i += 4) s = (s + BE(arr, off + i)) >>> 0;
  return s;
}

const tagAt = (dv, off) => String.fromCharCode(dv.getUint8(off), dv.getUint8(off + 1), dv.getUint8(off + 2), dv.getUint8(off + 3));

// opentype.js 는 글자마다 cmap format 4 세그먼트를 만든다. 매핑이 8,000자를 넘으면
// 길이 필드(uint16)가 넘쳐 cmap 이 깨진다. 이어지는 같은 delta 세그먼트를 합쳐 다시 쓴다.
function compactCmap(ab) {
  const file = new Uint8Array(ab);
  const dv = new DataView(ab);
  const numTables = dv.getUint16(4);
  let cmapRec = -1, cmapOff = 0, cmapLen = 0, headOff = 0;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + 16 * i;
    const tag = tagAt(dv, rec);
    if (tag === 'cmap') { cmapRec = rec; cmapOff = dv.getUint32(rec + 8); cmapLen = dv.getUint32(rec + 12); }
    if (tag === 'head') headOff = dv.getUint32(rec + 8);
  }
  if (cmapRec < 0 || dv.getUint16(cmapOff + 2) !== 1) return ab; // 서브테이블 하나일 때만
  const sub = cmapOff + dv.getUint32(cmapOff + 8);
  if (dv.getUint16(sub) !== 4) return ab;
  const segX2 = dv.getUint16(sub + 6);
  if (16 + 4 * segX2 <= 65535) return ab; // 넘치지 않으면 그대로

  const endBase = sub + 14, startBase = endBase + segX2 + 2, deltaBase = startBase + segX2, roBase = deltaBase + segX2;
  const runs = [];
  for (let i = 0; i < segX2 / 2; i++) {
    if (dv.getUint16(roBase + 2 * i) !== 0) return ab; // glyphIdArray 를 쓰면 손대지 않는다
    const start = dv.getUint16(startBase + 2 * i), end = dv.getUint16(endBase + 2 * i), delta = dv.getInt16(deltaBase + 2 * i);
    const last = runs[runs.length - 1];
    if (last && last.end + 1 === start && last.delta === delta) last.end = end;
    else runs.push({ start, end, delta });
  }

  const m = runs.length;
  const out = new Uint8Array(28 + 8 * m);
  const od = new DataView(out.buffer);
  od.setUint16(2, 1);
  od.setUint16(4, 3); od.setUint16(6, 1); od.setUint32(8, 12);
  od.setUint16(12, 4); od.setUint16(14, 16 + 8 * m); od.setUint16(16, 0); od.setUint16(18, 2 * m);
  const sr = 2 * 2 ** Math.floor(Math.log2(m));
  od.setUint16(20, sr); od.setUint16(22, Math.floor(Math.log2(m))); od.setUint16(24, 2 * m - sr);
  let p = 26;
  for (const r of runs) { od.setUint16(p, r.end); p += 2; }
  od.setUint16(p, 0); p += 2;
  for (const r of runs) { od.setUint16(p, r.start); p += 2; }
  for (const r of runs) { od.setInt16(p, r.delta); p += 2; }
  for (const r of runs) { od.setUint16(p, 0); p += 2; }

  file.set(out, cmapOff);
  file.fill(0, cmapOff + out.length, cmapOff + cmapLen);
  dv.setUint32(cmapRec + 12, out.length);
  dv.setUint32(cmapRec + 4, sum32(file, cmapOff, out.length));
  dv.setUint32(headOff + 8, 0);
  dv.setUint32(headOff + 8, (0xB1B0AFBA - sum32(file, 0, file.length)) >>> 0);
  return ab;
}

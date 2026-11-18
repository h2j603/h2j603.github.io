// 무압축(store) zip 작성기. 브라우저·Node 공용. 외부 라이브러리 없음.
const enc = new TextEncoder();

const TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  TABLE[i] = c >>> 0;
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// files = {경로: 문자열|Uint8Array} → zip 바이트
export function makeZip(files) {
  const entries = [];
  let size = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = typeof content === 'string' ? enc.encode(content) : content;
    const nameBytes = enc.encode(name);
    entries.push({ nameBytes, data, crc: crc32(data), offset: size });
    size += 30 + nameBytes.length + data.length;
  }
  const cdSize = entries.reduce((a, e) => a + 46 + e.nameBytes.length, 0);
  const out = new Uint8Array(size + cdSize + 22);
  const dv = new DataView(out.buffer);
  let p = 0;
  const u16 = v => { dv.setUint16(p, v, true); p += 2; };
  const u32 = v => { dv.setUint32(p, v, true); p += 4; };

  for (const e of entries) {
    u32(0x04034b50);
    u16(20); u16(0x0800); u16(0); u16(0); u16(0x0021); // 버전·UTF-8·무압축·시각·날짜(1980-01-01)
    u32(e.crc); u32(e.data.length); u32(e.data.length);
    u16(e.nameBytes.length); u16(0);
    out.set(e.nameBytes, p); p += e.nameBytes.length;
    out.set(e.data, p); p += e.data.length;
  }

  const cdStart = p;
  for (const e of entries) {
    u32(0x02014b50);
    u16(20); u16(20); u16(0x0800); u16(0); u16(0); u16(0x0021);
    u32(e.crc); u32(e.data.length); u32(e.data.length);
    u16(e.nameBytes.length); u16(0); u16(0); u16(0); u16(0); u32(0);
    u32(e.offset);
    out.set(e.nameBytes, p); p += e.nameBytes.length;
  }

  const cdEnd = p;
  u32(0x06054b50);
  u16(0); u16(0);
  u16(entries.length); u16(entries.length);
  u32(cdEnd - cdStart); u32(cdStart); u16(0);
  return out;
}

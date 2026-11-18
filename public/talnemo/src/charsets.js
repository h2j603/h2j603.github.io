// 내보낼 글자 집합.

// 표본: 겹자음·겹받침·복합모음·드문 조합을 고루 넣은 33자(중복 제거)
export const SAMPLE = [...new Set('가고과의각곡꿈똠없닭앎핥뷁쀍왜다람쥐헌쳇바퀴에타고파세벌식탈네모꼴')].join('');

// 현대 한글 11,172자 전부(가~힣)
export function all11172() {
  let s = '';
  for (let i = 0; i < 11172; i++) s += String.fromCharCode(0xAC00 + i);
  return s;
}

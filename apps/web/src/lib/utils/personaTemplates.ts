export const personaTemplates = {
  ages: ['20대 초반', '20대 후반', '30대 초반', '30대 중반', '40대', '50대'],
  heights: {
    male: ['170cm', '175cm', '180cm', '185cm', '190cm'],
    female: ['155cm', '160cm', '165cm', '170cm', '175cm'],
    other: ['160cm', '165cm', '170cm', '175cm', '180cm'],
  },
  occupations: [
    '자영업자',
    '회사원',
    '대학생',
    '고등학생',
    '프리랜서',
    '교사',
    '의사',
    '디자이너',
    '개발자',
    '작가',
    '예술가',
    '요리사',
    '변호사',
  ],
  personalities: [
    '다정하고 상냥한',
    '쿨하고 차가운',
    '활발하고 명랑한',
    '조용하고 차분한',
    '장난스럽고 재치있는',
    '진지하고 성실한',
    '감성적이고 로맨틱한',
    '시크하고 도도한',
  ],
  bodyTypes: {
    male: [
      '건강한 근육질 체형',
      '날씬하고 마른 체형',
      '탄탄한 운동선수 체형',
      '평범한 보통 체형',
    ],
    female: [
      '가늘고 예쁜 마른 체형',
      '건강한 슬림 체형',
      '통통한 귀여운 체형',
      '글래머러스한 체형',
    ],
    other: [
      '날씬한 체형',
      '평범한 체형',
      '건강한 체형',
      '탄탄한 체형',
    ],
  },
  scents: [
    '달콤쌉싸름한 커피향',
    '은은한 꽃향기',
    '상쾌한 비누향',
    '따뜻한 바닐라향',
    '청량한 민트향',
    '부드러운 베이비파우더향',
    '시트러스 향',
    '머스크 향',
  ],
  hobbies: [
    '독서',
    '영화 감상',
    '음악 듣기',
    '운동',
    '요리',
    '게임',
    '여행',
    '그림 그리기',
    '사진 촬영',
    '춤',
  ],
};

function getRandomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function generateRandomPersona(gender: 'male' | 'female' | 'other' = 'other'): string {
  const age = getRandomItem(personaTemplates.ages);
  const height = getRandomItem(personaTemplates.heights[gender]);
  const occupation = getRandomItem(personaTemplates.occupations);
  const personality = getRandomItem(personaTemplates.personalities);
  const bodyType = getRandomItem(personaTemplates.bodyTypes[gender]);
  const scent = getRandomItem(personaTemplates.scents);
  const hobby1 = getRandomItem(personaTemplates.hobbies);
  let hobby2 = getRandomItem(personaTemplates.hobbies);
  while (hobby2 === hobby1) {
    hobby2 = getRandomItem(personaTemplates.hobbies);
  }

  return `나이: ${age}
키: ${height}
직업: ${occupation}
외모: ${bodyType}
성격: ${personality} 성격
체향: ${scent}
좋아하는 것: ${hobby1}, ${hobby2}
기타 설정: `;
}

#!/usr/bin/env node

/**
 * OpenRouter API 검증 스크립트
 * 목적: Euryale 70B 모델이 정상적으로 호출되는지 확인
 *
 * 사용법:
 *   node apps/api/scripts/verify-euryale-model.mjs
 *
 * 환경변수:
 *   OPENROUTER_API_KEY - OpenRouter API 키 (필수)
 */

import OpenAI from 'openai';

const EURYALE_MODEL_SLUG = 'sao10k/l3.3-euryale-70b';

async function verifyEuryaleModel() {
  console.log('🔍 Euryale 70B 모델 검증 시작...\n');

  // 1. 환경변수 확인
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY 환경변수가 설정되지 않았습니다.');
    console.error('   .env 파일을 확인하거나 다음과 같이 실행하세요:');
    console.error('   OPENROUTER_API_KEY=your-key node verify-euryale-model.mjs\n');
    process.exit(1);
  }

  console.log('✅ OpenRouter API 키 확인 완료');
  console.log(`📦 테스트 모델: ${EURYALE_MODEL_SLUG}\n`);

  // 2. OpenAI 클라이언트 생성
  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'https://github.com/your-org/mini-whif', // 실제 도메인으로 교체
      'X-Title': 'Mini-Whif NSFW Model Test',
    },
  });

  // 3. 테스트 메시지 전송
  try {
    console.log('📤 테스트 메시지 전송 중...');

    const startTime = Date.now();

    const response = await client.chat.completions.create({
      model: EURYALE_MODEL_SLUG,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant specialized in creative roleplay.',
        },
        {
          role: 'user',
          content: 'Hello! Please introduce yourself in one sentence.',
        },
      ],
      max_tokens: 100,
      temperature: 0.8,
    });

    const duration = Date.now() - startTime;

    // 4. 응답 검증
    if (!response.choices || response.choices.length === 0) {
      throw new Error('응답에 choices가 없습니다.');
    }

    const message = response.choices[0].message;
    if (!message || !message.content) {
      throw new Error('응답 메시지가 비어있습니다.');
    }

    // 5. 성공 출력
    console.log('\n✅ Euryale 70B 모델 호출 성공!\n');
    console.log('📊 응답 정보:');
    console.log(`   - 모델: ${response.model || EURYALE_MODEL_SLUG}`);
    console.log(`   - 응답 시간: ${duration}ms`);
    console.log(`   - 토큰 사용량: ${response.usage?.total_tokens || 'N/A'} tokens`);
    console.log(`     (입력: ${response.usage?.prompt_tokens || 'N/A'}, 출력: ${response.usage?.completion_tokens || 'N/A'})`);
    console.log(`   - Finish reason: ${response.choices[0].finish_reason}\n`);
    console.log('💬 AI 응답:');
    console.log(`   "${message.content.trim()}"\n`);

    console.log('🎉 검증 완료! Euryale 모델이 정상적으로 작동합니다.');
    console.log('   이제 마이그레이션을 실행해도 안전합니다.\n');

    process.exit(0);
  } catch (error) {
    // 6. 에러 처리
    console.error('\n❌ Euryale 모델 호출 실패\n');

    if (error.status === 401) {
      console.error('   원인: API 키가 유효하지 않습니다.');
      console.error('   해결: OPENROUTER_API_KEY 환경변수를 확인하세요.');
    } else if (error.status === 404) {
      console.error('   원인: 모델을 찾을 수 없습니다.');
      console.error(`   해결: OpenRouter에서 "${EURYALE_MODEL_SLUG}" 모델이 존재하는지 확인하세요.`);
      console.error('        https://openrouter.ai/models');
    } else if (error.status === 429) {
      console.error('   원인: Rate limit 초과');
      console.error('   해결: 잠시 후 다시 시도하세요.');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('   원인: 네트워크 연결 오류');
      console.error('   해결: 인터넷 연결을 확인하세요.');
    } else {
      console.error(`   에러 메시지: ${error.message}`);
      if (error.response?.data) {
        console.error(`   상세 정보: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }

    console.error('\n⚠️  마이그레이션을 중단하고 문제를 해결하세요.\n');
    process.exit(1);
  }
}

// 스크립트 실행
verifyEuryaleModel();

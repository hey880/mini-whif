import { Code, ConnectError } from '@connectrpc/connect';

/**
 * 프로토타입 오염 방지를 위한 안전한 JSON 파싱
 *
 * __proto__, constructor, prototype 등 위험한 키를 검증하여
 * 프로토타입 오염 공격을 방지합니다.
 *
 * @param jsonString - 파싱할 JSON 문자열
 * @param fieldName - 필드명 (에러 메시지용)
 * @returns 파싱된 객체
 * @throws ConnectError - JSON이 유효하지 않거나 위험한 키를 포함하는 경우
 */
export function safeJSONParse(jsonString: string, fieldName: string): any {
  try {
    const parsed = JSON.parse(jsonString);

    // 프로토타입 오염 방지: 위험한 키 검증
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

    function hasDangerousKeys(obj: any, path = ''): string | null {
      if (typeof obj !== 'object' || obj === null) return null;

      for (const key of Object.keys(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        // 위험한 키 발견
        if (dangerousKeys.includes(key)) {
          return currentPath;
        }

        // 중첩 객체 재귀 검사
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          const nestedResult = hasDangerousKeys(obj[key], currentPath);
          if (nestedResult) return nestedResult;
        }
      }

      return null;
    }

    const dangerousPath = hasDangerousKeys(parsed);
    if (dangerousPath) {
      throw new ConnectError(
        `Invalid ${fieldName}: contains forbidden key "${dangerousPath}"`,
        Code.InvalidArgument
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof ConnectError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new ConnectError(
        `Invalid ${fieldName}: malformed JSON - ${error.message}`,
        Code.InvalidArgument
      );
    }

    throw new ConnectError(
      `Failed to parse ${fieldName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      Code.InvalidArgument
    );
  }
}

/**
 * 안전한 JSON 파싱 (선택적 필드용)
 *
 * jsonString이 비어있거나 null인 경우 defaultValue를 반환합니다.
 *
 * @param jsonString - 파싱할 JSON 문자열 (선택적)
 * @param fieldName - 필드명 (에러 메시지용)
 * @param defaultValue - 기본값
 * @returns 파싱된 객체 또는 기본값
 */
export function safeJSONParseOptional<T = any>(
  jsonString: string | undefined | null,
  fieldName: string,
  defaultValue: T
): T | any {
  if (!jsonString) return defaultValue;
  return safeJSONParse(jsonString, fieldName);
}

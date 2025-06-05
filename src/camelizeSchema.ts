/**
 * Schema의 property 이름들을 camelCase로 변환합니다.
 * JSON Schema, OpenAPI 스펙 등에 사용할 수 있습니다.
 *
 * 이 함수는 다음과 같은 변환을 수행합니다:
 * - 객체의 키를 snake_case, kebab-case에서 camelCase로 변환
 * - 중첩된 객체와 배열을 재귀적으로 처리
 * - required 배열의 문자열 값들도 camelCase로 변환
 * - operationId, name 등 특정 키의 문자열 값도 변환
 *
 * @param schema - 변환할 스키마 객체 (JSON Schema, OpenAPI 스펙 등)
 * @returns camelCase로 변환된 스키마 객체
 *
 * @example
 * ```typescript
 * // 기본 객체 변환
 * const schema = {
 *   user_name: { type: 'string' },
 *   user_age: { type: 'number' }
 * };
 * const result = camelizeSchema(schema);
 * // { userName: { type: 'string' }, userAge: { type: 'number' } }
 *
 * // OpenAPI 스펙 변환
 * const openApiSchema = {
 *   paths: {
 *     '/users': {
 *       get: {
 *         operationId: 'get_users',
 *         parameters: [{
 *           name: 'user_id',
 *           in: 'query'
 *         }]
 *       }
 *     }
 *   }
 * };
 * const camelized = camelizeSchema(openApiSchema);
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: Schema 타입이 다양하므로 any 사용 필요
export function camelizeSchema(schema: any): any {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map((item) => {
      return typeof item === "object" ? camelizeSchema(item) : item;
    });
  }

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const result: any = {};

  for (const [key, value] of Object.entries(schema)) {
    const transformedKey = toCamelCase(key);

    if (Array.isArray(value)) {
      // required 배열과 같은 특별한 경우만 문자열 변환
      if (key === "required") {
        result[transformedKey] = value.map((item) =>
          typeof item === "string" ? toCamelCase(item) : item,
        );
      } else {
        result[transformedKey] = value.map((item) =>
          typeof item === "object" ? camelizeSchema(item) : item,
        );
      }
    } else if (value && typeof value === "object") {
      result[transformedKey] = camelizeSchema(value);
    } else if (typeof value === "string" && shouldTransformStringValue(key)) {
      // 특정 문자열 값들도 변환 (operationId, name 등)
      result[transformedKey] = toCamelCase(value);
    } else {
      result[transformedKey] = value;
    }
  }

  return result;
}

/**
 * 특정 키의 문자열 값을 변환해야 하는지 확인합니다.
 *
 * OpenAPI 스펙에서 operationId나 parameter name 등 특정 필드의 문자열 값들도
 * camelCase로 변환해야 하는 경우가 있습니다. 이 함수는 해당 키들을 식별합니다.
 *
 * @param key - 확인할 객체의 키 이름
 * @returns 해당 키의 문자열 값을 변환해야 하면 true, 아니면 false
 *
 * @example
 * ```typescript
 * shouldTransformStringValue('operationId'); // true
 * shouldTransformStringValue('name'); // true
 * shouldTransformStringValue('description'); // false
 * ```
 */
function shouldTransformStringValue(key: string): boolean {
  const transformableKeys = [
    "operationId", // OpenAPI operationId
    "name", // parameter name 등
  ];
  return transformableKeys.includes(key);
}

/**
 * 문자열을 camelCase로 변환합니다.
 *
 * snake_case, kebab-case 등의 문자열을 camelCase로 변환합니다.
 * camelcase-keys 패키지의 변환 로직을 모방하여 구현되었습니다.
 * 이미 camelCase인 문자열은 그대로 반환합니다.
 *
 * @param str - 변환할 문자열
 * @returns camelCase로 변환된 문자열
 *
 * @example
 * ```typescript
 * toCamelCase('user_name'); // 'userName'
 * toCamelCase('user-age'); // 'userAge'
 * toCamelCase('user_full_name'); // 'userFullName'
 * toCamelCase('already-camelCase'); // 'alreadyCamelCase'
 * toCamelCase('userName'); // 'userName' (변경 없음)
 * toCamelCase('API_KEY'); // 'apiKey'
 * ```
 */
function toCamelCase(str: string): string {
  // 이미 camelCase인 경우 그대로 반환
  if (!/[_-]/.test(str)) {
    return str;
  }

  return str
    .replace(/[_-]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

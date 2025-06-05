/**
 * 두 숫자를 더한 결과를 반환합니다.
 *
 * @param a - 첫 번째 숫자
 * @param b - 두 번째 숫자
 * @returns 두 숫자의 합
 *
 * @example
 * ```typescript
 * const result = add(5, 3);
 * console.log(result); // 8
 *
 * // 소수점 계산
 * const decimal = add(1.5, 2.3);
 * console.log(decimal); // 3.8
 *
 * // 음수 계산
 * const negative = add(-5, 10);
 * console.log(negative); // 5
 * ```
 */
export function add(a: number, b: number) {
  return a + b;
}

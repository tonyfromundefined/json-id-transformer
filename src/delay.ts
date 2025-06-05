/**
 * 지정된 시간(밀리초) 동안 대기하는 Promise를 반환합니다.
 *
 * @param ms - 대기할 시간(밀리초)
 * @returns 지정된 시간 후에 resolve되는 Promise<void>
 *
 * @example
 * ```typescript
 * // 1초 대기
 * await delay(1000);
 * console.log('1초 후 실행됩니다');
 *
 * // 함수 체이닝에서 사용
 * delay(500).then(() => {
 *   console.log('500ms 후 실행됩니다');
 * });
 * ```
 */
export function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

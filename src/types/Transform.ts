/** biome-ignore-all lint/suspicious/noExplicitAny: complex type */
// 경로를 파싱해서 해당 위치에 @필드 추가하고 원본을 string으로 변경
type TransformPath<
  T,
  Path extends string,
  Prefix extends string = "@",
> = Path extends `$.${infer Rest}` ? ApplyTransform<T, Rest, Prefix> : T;

type ApplyTransform<
  T,
  Path extends string,
  Prefix extends string = "@",
> = Path extends `${
  infer Key // 배열 와일드카드: items[*].author
}[*].${infer Rest}`
  ? {
      [K in keyof T]: K extends Key
        ? T[K] extends readonly any[]
          ? ApplyTransform<T[K][number], Rest>[]
          : T[K]
        : T[K];
    }
  : // 배열 와일드카드 마지막: items[*]
    Path extends `${infer Key}[*]`
    ? {
        [K in keyof T | `${Prefix}${Key & string}`]: K extends `${Prefix}${Key}`
          ? T[Key & keyof T]
          : K extends Key
            ? string[]
            : K extends keyof T
              ? T[K]
              : never;
      }
    : // 중첩 객체: user.name
      Path extends `${infer Key}.${infer Rest}`
      ? {
          [K in keyof T]: K extends Key
            ? T[K] extends object
              ? ApplyTransform<T[K], Rest>
              : T[K]
            : T[K];
        }
      : // 단순 필드: id
        {
          [K in
            | keyof T
            | `${Prefix}${Path & string}`]: K extends `${Prefix}${Path}`
            ? T[Path & keyof T]
            : K extends Path
              ? string
              : K extends keyof T
                ? T[K]
                : never;
        };

// 모든 경로 적용
export type Transform<
  Input,
  Schema extends Record<`$.${string}`, any>,
  Prefix extends string = "@",
> = keyof Schema extends never
  ? Input
  : keyof Schema extends infer Path
    ? Path extends `$.${string}`
      ? Transform<
          TransformPath<Input, Path, Prefix>,
          Omit<Schema, Path>,
          Prefix
        >
      : Input
    : Input;

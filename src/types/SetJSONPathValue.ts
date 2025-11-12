/** biome-ignore-all lint/suspicious/noExplicitAny: complex type */

// 배열 와일드카드 [*]를 지원하는 DeepSetPath
type DeepSetPath<T, Path extends string, Value> = Path extends `[*].${
  infer Rest // [*].rest 패턴 처리
}`
  ? T extends readonly any[]
    ? DeepSetPath<T[number], Rest, Value>[]
    : never
  : // key[*].rest 패턴 처리
    Path extends `${infer Key}[*].${infer Rest}`
    ? Key extends keyof T
      ? T[Key] extends readonly any[]
        ? {
            [K in keyof T]: K extends Key
              ? DeepSetPath<T[Key][number], Rest, Value>[]
              : T[K];
          }
        : never
      : T & {
          [K in Key]: DeepSetPath<{}, Rest, Value>[];
        }
    : // key[*] 패턴 (마지막이 배열)
      Path extends `${infer Key}[*]`
      ? Key extends keyof T
        ? T[Key] extends readonly any[]
          ? {
              [K in keyof T]: K extends Key ? Value[] : T[K];
            }
          : {
              [K in keyof T]: K extends Key ? Value[] : T[K];
            }
        : T & {
            [K in Key]: Value[];
          }
      : // 일반 key.rest 패턴
        Path extends `${infer Key}.${infer Rest}`
        ? Key extends keyof T
          ? {
              [K in keyof T]: K extends Key
                ? T[K] extends object
                  ? DeepSetPath<T[K], Rest, Value>
                  : DeepSetPath<{}, Rest, Value>
                : T[K];
            }
          : T & {
              [K in Key]: DeepSetPath<{}, Rest, Value>;
            }
        : // 마지막 키 처리
          Path extends keyof T
          ? {
              [K in keyof T]: K extends Path ? Value : T[K];
            }
          : T & {
              [K in Path]: Value;
            };

// JSONPath wrapper
export type SetJSONPathValue<
  T,
  Path extends string,
  Value,
> = Path extends `$.${infer Rest}`
  ? DeepSetPath<T, Rest, Value>
  : DeepSetPath<T, Path, Value>;

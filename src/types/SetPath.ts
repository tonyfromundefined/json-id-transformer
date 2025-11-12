export type SetPath<
  T,
  Path extends string,
  Value,
> = Path extends `${infer Key}.${infer Rest}`
  ? Key extends `${number}`
    ? T extends readonly any[]
      ? SetPath<T[number], Rest, Value>[]
      : never
    : Key extends keyof T
      ? {
          [K in keyof T]: K extends Key
            ? T[K] extends object
              ? SetPath<T[K], Rest, Value>
              : SetPath<{}, Rest, Value>
            : T[K];
        }
      : T & {
          [K in Key]: SetPath<{}, Rest, Value>;
        }
  : Path extends `${number}`
    ? T extends readonly any[]
      ? Value[]
      : never
    : Path extends keyof T
      ? {
          [K in keyof T]: K extends Path ? Value : T[K];
        }
      : T & {
          [K in Path]: Value;
        };

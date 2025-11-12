/** biome-ignore-all lint/suspicious/noExplicitAny: complex type */

/**
 * Transforms a single JSONPath by parsing it and adding original ID fields.
 * Strips the leading `$.` from the path and delegates to ApplyTransform.
 *
 * @template T - The type to transform
 * @template Path - The JSONPath string (e.g., "$.users[*].id")
 * @template Prefix - The prefix for original ID fields (default: "@")
 */
type TransformPath<
  T,
  Path extends string,
  Prefix extends string,
> = Path extends `$.${infer Rest}` ? ApplyTransform<T, Rest, Prefix> : T;

/**
 * Recursively applies transformation to a type based on a path pattern.
 * Handles four cases:
 * 1. Array wildcard with nested path: "items[*].id" -> transforms id in array items
 * 2. Array wildcard at end: "items[*]" -> transforms entire array to string[]
 * 3. Nested object path: "user.name" -> recursively transform nested object
 * 4. Simple field: "id" -> adds original ID field with prefix and changes field to string
 *
 * @template T - The type to transform
 * @template Path - The remaining path after stripping `$.`
 * @template Prefix - The prefix for original ID fields (default: "@")
 *
 * @example
 * // Case 1: Array wildcard with nested path
 * // Path: "items[*].id"
 * // { items: Array<{ id: number }> } -> { items: Array<{ id: string, "@id": number }> }
 *
 * @example
 * // Case 4: Simple field
 * // Path: "id"
 * // { id: number } -> { id: string, "@id": number }
 */
type ApplyTransform<
  T,
  Path extends string,
  Prefix extends string,
> = Path extends `${
  infer Key // Case 1: Array wildcard with nested path - items[*].id
}[*].${infer Rest}`
  ? {
      [K in keyof T]: K extends Key
        ? T[K] extends readonly any[]
          ? ApplyTransform<T[K][number], Rest, Prefix>[]
          : T[K]
        : T[K];
    }
  : // Case 2: Array wildcard at end - items[*]
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
    : // Case 3: Nested object path - user.name
      Path extends `${infer Key}.${infer Rest}`
      ? {
          [K in keyof T]: K extends Key
            ? T[K] extends object
              ? ApplyTransform<T[K], Rest, Prefix>
              : T[K]
            : T[K];
        }
      : // Case 4: Simple field - id
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

/**
 * Main transformation type that applies all JSONPath transformations from a schema.
 * Recursively processes each path in the schema, transforming ID fields to strings
 * and adding original ID fields with the specified prefix.
 *
 * @template Input - The input type to transform
 * @template Schema - A record mapping JSONPath strings to their typenames
 * @template Prefix - The prefix for original ID fields (default: "@")
 *
 * @example
 * // Transform a simple object with user IDs
 * type Input = {
 *   users: Array<{ id: number; name: string }>;
 * };
 *
 * type Schema = {
 *   "$.users[*].id": "User";
 * };
 *
 * type Result = Transform<Input, Schema>;
 * // Result: {
 * //   users: Array<{
 * //     id: string;
 * //     "@id": number;
 * //     name: string;
 * //   }>;
 * // }
 *
 * @example
 * // Transform with custom prefix
 * type Result = Transform<Input, Schema, "original_">;
 * // Result: {
 * //   users: Array<{
 * //     id: string;
 * //     "original_id": number;
 * //     name: string;
 * //   }>;
 * // }
 */
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

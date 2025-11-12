/**
 * Base error class for all transformation-related errors
 */
export class TransformationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TransformationError";
  }
}

/**
 * Error thrown when batchIds function fails
 */
export class BatchIdsError extends TransformationError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "BatchIdsError";
  }
}

/**
 * Error thrown when batchIds returns array with mismatched length
 */
export class BatchIdsMismatchError extends TransformationError {
  constructor(
    public readonly expected: number,
    public readonly received: number,
  ) {
    super(
      `batchIds returned ${received} results, expected ${expected}. Each input ID must have a corresponding result (use null for unmapped IDs).`,
    );
    this.name = "BatchIdsMismatchError";
  }
}

/**
 * Error thrown when JSONPath expression is invalid or fails to parse
 */
export class InvalidJSONPathError extends TransformationError {
  constructor(
    public readonly path: string,
    cause?: unknown,
  ) {
    super(`Invalid JSONPath expression: "${path}"`, cause);
    this.name = "InvalidJSONPathError";
  }
}

/**
 * Error thrown when PathTypeMapFn function fails
 */
export class PathTypeMapFnError extends TransformationError {
  constructor(
    public readonly path: string,
    public readonly idValue: string,
    cause?: unknown,
  ) {
    super(
      `PathTypeMapFn failed for path "${path}" with ID value "${idValue}"`,
      cause,
    );
    this.name = "PathTypeMapFnError";
  }
}

/**
 * Error thrown when JSON Pointer is invalid
 */
export class InvalidJSONPointerError extends TransformationError {
  constructor(
    public readonly pointer: string,
    cause?: unknown,
  ) {
    super(`Invalid JSON Pointer: "${pointer}"`, cause);
    this.name = "InvalidJSONPointerError";
  }
}

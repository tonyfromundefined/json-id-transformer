import jsonPointer from "json-pointer";
import { JSONPath } from "jsonpath-plus";
import {
  BatchIdsError,
  BatchIdsMismatchError,
  InvalidJSONPathError,
  InvalidJSONPointerError,
  PathTypeMapFnError,
} from "./errors";
import type { Transform } from "./types";

export type Nullable<T> = T | null | undefined;

/**
 * Defines the return type for `PathTypeMap` entries, specifying the typename of an ID.
 * It is a string representing the type name (e.g., "User", "Post").
 */
export type PathTypeMapReturn = string;

/**
 * A map where keys are JSONPath expressions pointing directly to ID properties,
 * and values define the typename of the ID.
 * A function can also be provided to dynamically determine the typename.
 */
export type PathTypeMap = Record<string, PathTypeMapReturn | PathTypeMapFn>;

/**
 * A function that dynamically determines the type of an ID based on the value, parent object, and path.
 * @param {string} value - The ID value.
 * @param {unknown} parentObj - The parent object containing the ID property.
 * @param {string} path - The JSONPath to the ID property.
 * @returns {PathTypeMapReturn} The typename for the ID.
 */
export type PathTypeMapFn = (
  value: string,
  parentObj: unknown,
  path: string,
) => PathTypeMapReturn;

/**
 * An asynchronous function that takes an array of ID entries ({ id, typename })
 * and returns a Promise resolving to an array of transformed IDs (or null/undefined if not mapped).
 */
export type BatchIdsFn = (
  entries: Array<{ id: string; typename: string }>,
) => Promise<Array<Nullable<string>>>;

/**
 * Type guard to check if a value is a string or number
 */
function isValidIdType(value: unknown): value is string | number {
  return typeof value === "string" || typeof value === "number";
}

/**
 * Transforms IDs within a JSON object based on a provided path-to-type mapping and a batch ID transformation function.
 *
 * This function traverses the input JSON object, identifies IDs based on the `pathTypeMap`,
 * and then uses the `batchIds` function to transform these IDs.
 * It supports nested objects, dynamic type mapping, and optional retention of original IDs.
 *
 * @template $$Input - The type of the input JSON object.
 * @param {$$Input} input - The JSON object whose IDs are to be transformed.
 * @param {object} options - Configuration options for ID transformation.
 *
 * @param {PathTypeMap} options.pathTypeMap - A map where keys are JSONPath expressions pointing directly to ID properties,
 *                                            and values define the typename of the ID.
 *                                            A function can also be provided to dynamically determine the typename based on the ID value.
 * @param {BatchIdsFn} options.batchIds - An asynchronous function that takes an array of ID entries ({ id, typename })
 *                                        and returns a Promise resolving to an array of transformed IDs (or null/undefined if not mapped).
 * @param {string} [options.originalIdPrefix] - Optional prefix for storing original IDs (defaults to '@').
 *                                              Original IDs are always preserved, this only controls the prefix.
 *                                              For example, '@' results in '@id', 'original_' results in 'original_id'.
 * @param {boolean} [options.mutate] - If true, mutates the input object instead of creating a clone (defaults to false).
 *                                     Use with caution as this modifies the original object.
 * @returns {Promise<Transform<$$Input, $$PathTypeMap, $$OriginalIdPrefix>>} A Promise that resolves to the JSON object with transformed IDs.
 *
 * @throws {InvalidJSONPathError} When a JSONPath expression is invalid
 * @throws {PathTypeMapFnError} When a PathTypeMapFn function throws an error
 * @throws {BatchIdsError} When the batchIds function fails
 * @throws {BatchIdsMismatchError} When batchIds returns an array with mismatched length
 * @throws {InvalidJSONPointerError} When a JSON Pointer operation fails
 */
export async function transformJsonIds<
  $$Input extends object,
  $$PathTypeMap extends PathTypeMap,
  $$OriginalIdPrefix extends string = "@",
>(
  input: $$Input,
  options: {
    /**
     * A map where keys are JSONPath expressions pointing directly to ID properties,
     * and values define the typename of the ID.
     * A function can also be provided to dynamically determine the typename based on the ID value and parent object.
     *
     * @example
     * // Static mapping - paths point directly to ID properties
     * {
     *   pathTypeMap: {
     *     "$.users[*].id": "User",
     *     "$.posts[*].authorId": "User",
     *     "$.posts[*].id": "Post",
     *   }
     * }
     * @example
     * // Dynamic mapping based on parent object properties
     * {
     *   pathTypeMap: {
     *     "$.items[*].id": (idValue, parentObj) =>
     *       (parentObj as { type: string }).type === "user" ? "User" : "Post",
     *   }
     * }
     */
    pathTypeMap: $$PathTypeMap;

    /**
     * An asynchronous function that takes an array of ID entries ({ id, typename })
     * and returns a Promise resolving to an array of transformed IDs (or null/undefined if not mapped).
     *
     * @example
     * // Example batchIds function
     * async (entries) => {
     *   const idMap = {
     *     "User#123": "mapped_456",
     *     "Post#111": "mapped_222",
     *   };
     *   return entries.map((entry) => idMap[`${entry.typename}#${entry.id}`] || null);
     * }
     */
    batchIds: BatchIdsFn;

    /**
     * Specifies the prefix for storing the original ID in a separate field.
     * If provided, the original ID value will be stored with this prefix.
     * (Default: `@`)
     *
     * @example
     * // originalIdPrefix: undefined (uses default '@')
     * // Before transformation: { id: 123, name: 'john' }
     * // After transformation: { id: 'abc123_User', '@id': 123, name: 'john' }
     *
     * @example
     * // originalIdPrefix: 'original_'
     * // Before transformation: { id: 123, name: 'john' }
     * // After transformation: { id: 'abc123_User', 'original_id': 123, name: 'john' }
     *
     * @example
     * // originalIdPrefix: '__'
     * // Before transformation: { authorId: 123, name: 'john' }
     * // After transformation: { authorId: 'abc123_User', '__authorId': 123, name: 'john' }
     */
    originalIdPrefix?: $$OriginalIdPrefix;

    /**
     * If true, mutates the input object instead of creating a clone.
     * This can improve performance for large objects but modifies the original.
     * (Default: false)
     *
     * @example
     * const input = { users: [{ id: 123 }] };
     * await transformJsonIds(input, { ..., mutate: true });
     * // input is now modified
     */
    mutate?: boolean;
  },
): Promise<Transform<$$Input, $$PathTypeMap, $$OriginalIdPrefix>> {
  // Clone or use the input directly based on mutate option
  const fullJson = options.mutate ? input : structuredClone(input);

  // Use Map to deduplicate IDs: key is "typename:id", value is the batch entry
  const idsBatchMap = new Map<
    string,
    {
      id: string; // String representation of the ID for transformation
      originalId: string | number; // Original ID value to preserve
      typename: string;
      pointers: string[]; // All JSON Pointers that reference this ID
    }
  >();

  // Cache for parent objects to avoid redundant parsing
  const parentCache = new Map<string, unknown>();

  // Helper function to get parent object with caching
  const getParentObject = (idPtr: string): unknown => {
    const idPtrArray = jsonPointer.parse(idPtr);
    if (idPtrArray.length === 0) {
      throw new InvalidJSONPointerError(idPtr);
    }

    idPtrArray.pop(); // Remove the property name (last segment)
    const parentPtr = jsonPointer.compile(idPtrArray);

    if (!parentCache.has(parentPtr)) {
      try {
        const parentObj = jsonPointer.get(fullJson, parentPtr);
        parentCache.set(parentPtr, parentObj);
      } catch (error) {
        throw new InvalidJSONPointerError(
          parentPtr,
          error instanceof Error ? error : undefined,
        );
      }
    }

    return parentCache.get(parentPtr);
  };

  // Iterate over each JSONPath defined in the pathTypeMap
  for (const jsonPath in options.pathTypeMap) {
    let pointers: string[];

    // Execute JSONPath with error handling
    try {
      const result = JSONPath({
        path: jsonPath,
        json: fullJson,
        flatten: true,
        wrap: false,
        resultType: "pointer",
      });

      // JSONPath returns different types based on results
      if (typeof result === "string") {
        pointers = [result];
      } else if (Array.isArray(result)) {
        pointers = result;
      } else {
        pointers = [];
      }
    } catch (error) {
      throw new InvalidJSONPathError(
        jsonPath,
        error instanceof Error ? error : undefined,
      );
    }

    // Process each pointer found by JSONPath
    for (const idPtr of pointers) {
      // Skip if the pointer is null or undefined
      if (idPtr === null || idPtr === undefined) {
        continue;
      }

      // Retrieve the ID value directly from the full JSON using its JSON Pointer
      let idValue: unknown;
      try {
        idValue = jsonPointer.get(fullJson, idPtr);
      } catch (error) {
        throw new InvalidJSONPointerError(
          idPtr,
          error instanceof Error ? error : undefined,
        );
      }

      // Skip if no ID value is found
      if (idValue === null || idValue === undefined) {
        continue;
      }

      // Type guard: skip if it's not a string or number
      if (!isValidIdType(idValue)) {
        continue;
      }

      // Convert ID to string if it's a number
      const idString = typeof idValue === "string" ? idValue : String(idValue);

      // Get parent object with caching
      const parentObj = getParentObject(idPtr);

      // Determine the typename based on pathTypeMapValue
      const pathTypeMapValue = options.pathTypeMap[jsonPath];
      let typename: string;

      // If pathTypeMapValue is a function, execute it with error handling
      if (typeof pathTypeMapValue === "function") {
        try {
          typename = pathTypeMapValue(idString, parentObj, jsonPath);
        } catch (error) {
          throw new PathTypeMapFnError(
            jsonPath,
            idString,
            error instanceof Error ? error : undefined,
          );
        }
      } else {
        typename = pathTypeMapValue;
      }

      // Create unique key for deduplication
      const dedupeKey = `${typename}:${idString}`;

      // Add to map (deduplicates automatically)
      if (idsBatchMap.has(dedupeKey)) {
        // Add this pointer to existing entry
        idsBatchMap.get(dedupeKey)!.pointers.push(idPtr);
      } else {
        // Create new entry
        idsBatchMap.set(dedupeKey, {
          id: idString,
          originalId: idValue,
          typename,
          pointers: [idPtr],
        });
      }
    }
  }

  // Convert map to array for batch processing
  const idsToBatch = Array.from(idsBatchMap.values());

  // Early return if no IDs to transform
  if (idsToBatch.length === 0) {
    return fullJson as Transform<$$Input, $$PathTypeMap, $$OriginalIdPrefix>;
  }

  // Batch transform all collected IDs using the provided batchIds function
  let batchedIds: Array<Nullable<string>>;
  try {
    batchedIds = await options.batchIds(
      idsToBatch.map(({ id, typename }) => ({ id, typename })),
    );
  } catch (error) {
    throw new BatchIdsError(
      "batchIds function failed",
      error instanceof Error ? error : undefined,
    );
  }

  // Validate that batchIds returned the correct number of results
  if (batchedIds.length !== idsToBatch.length) {
    throw new BatchIdsMismatchError(idsToBatch.length, batchedIds.length);
  }

  // Apply the transformed IDs back to the full JSON object
  for (let i = 0; i < idsToBatch.length; i++) {
    const { pointers, originalId } = idsToBatch[i];
    const mappedId = batchedIds[i];

    // If a mapped ID is returned (not null or undefined), update the JSON
    if (mappedId !== null && mappedId !== undefined) {
      // Update all pointers that reference this ID
      for (const idPtr of pointers) {
        try {
          jsonPointer.set(fullJson, idPtr, mappedId);
        } catch (error) {
          throw new InvalidJSONPointerError(
            idPtr,
            error instanceof Error ? error : undefined,
          );
        }

        // Parse the JSON Pointer to get an array of path segments
        const idPtrArray = jsonPointer.parse(idPtr);

        // Extract the actual property name of the ID (e.g., "id", "userId")
        const idPropertyName = idPtrArray.pop();
        if (!idPropertyName) {
          throw new InvalidJSONPointerError(idPtr);
        }

        // Determine the prefix for the original ID property name
        const originalIdPrefix = options.originalIdPrefix ?? "@";
        const originalIdPropertyName = `${originalIdPrefix}${idPropertyName}`;

        // Add the new original ID property name to the path segments
        idPtrArray.push(originalIdPropertyName);

        // Compile the path segments back into a JSON Pointer for the original ID
        const originalIdPtr = jsonPointer.compile(idPtrArray);

        // Set the original ID in the full JSON object at the newly constructed pointer
        try {
          jsonPointer.set(fullJson, originalIdPtr, originalId);
        } catch (error) {
          throw new InvalidJSONPointerError(
            originalIdPtr,
            error instanceof Error ? error : undefined,
          );
        }
      }
    }
  }

  // Return the JSON object with transformed IDs
  return fullJson as Transform<$$Input, $$PathTypeMap, $$OriginalIdPrefix>;
}

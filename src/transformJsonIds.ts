import jsonPointer from "json-pointer";
import { JSONPath } from "jsonpath-plus";
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
 * @param {object} parentObj - The parent object containing the ID property.
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
 * Transforms IDs within a JSON object based on a provided path-to-type mapping and a batch ID transformation function.
 *
 * This function traverses the input JSON object, identifies IDs based on the `pathTypeMap`,
 * and then uses the `batchIds` function to transform these IDs.
 * It supports nested objects, dynamic type mapping, and optional retention of original IDs.
 *
 * @template $$Input - The type of the input JSON object.
 * @param {$$Input} input - The JSON object whose IDs are to be transformed. A deep clone is made to avoid modifying the original object.
 * @param {TransformJsonIdsOptions} options - Configuration options for ID transformation.
 *
 * @param {PathTypeMap} options.pathTypeMap - A map where keys are JSONPath expressions pointing directly to ID properties,
 *                                            and values define the typename of the ID.
 *                                            A function can also be provided to dynamically determine the typename based on the ID value.
 * @param {BatchIdsFn} options.batchIds - An asynchronous function that takes an array of ID entries ({ id, typename })
 *                                        and returns a Promise resolving to an array of transformed IDs (or null/undefined if not mapped).
 * @param {string} [options.originalIdPrefix] - Optional prefix for storing original IDs (defaults to '@').
 *                                              Original IDs are always preserved, this only controls the prefix.
 *                                              For example, '@' results in '@id', 'original_' results in 'original_id'.
 * @returns {Promise<$$Input>} A Promise that resolves to the new JSON object with transformed IDs.
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
  },
): Promise<Transform<$$Input, $$PathTypeMap, $$OriginalIdPrefix>> {
  // Deep clone the input JSON to avoid modifying the original object.
  const fullJson = structuredClone(input);

  // Array to store IDs that need to be batched for transformation.
  const idsToBatch: Array<{
    id: string; // String representation of the ID for transformation
    originalId: string | number; // Original ID value to preserve
    typename: string;
    idPtr: string; // JSON Pointer to the ID property itself
  }> = [];

  // Iterate over each JSONPath defined in the pathTypeMap.
  for (const jsonPath in options.pathTypeMap) {
    JSONPath({
      path: jsonPath,
      json: fullJson,
      callback: (idPtr: string) => {
        // Skip if the pointer is null or undefined.
        if (idPtr === null || idPtr === undefined) {
          return;
        }

        // Retrieve the ID value directly from the full JSON using its JSON Pointer.
        const idValue = jsonPointer.get(fullJson, idPtr);

        // Skip if no ID value is found.
        if (idValue === null || idValue === undefined) {
          return;
        }

        // Convert ID to string if it's a number, skip if it's not a string or number.
        let idString: string;
        if (typeof idValue === "string") {
          idString = idValue;
        } else if (typeof idValue === "number") {
          idString = String(idValue);
        } else {
          return;
        }

        // Extract the parent object by removing the last segment from the pointer.
        const idPtrArray = jsonPointer.parse(idPtr);
        idPtrArray.pop(); // Remove the property name (last segment)
        const parentPtr = jsonPointer.compile(idPtrArray);
        const parentObj = jsonPointer.get(fullJson, parentPtr);

        // Determine the typename based on pathTypeMapValue.
        const pathTypeMapValue = options.pathTypeMap[jsonPath];
        let typename: string;

        // If pathTypeMapValue is a function, execute it to get the typename.
        if (typeof pathTypeMapValue === "function") {
          typename = pathTypeMapValue(idString, parentObj, jsonPath);
        } else {
          typename = pathTypeMapValue;
        }

        // Add the ID to the batch for transformation.
        idsToBatch.push({
          id: idString,
          originalId: idValue, // Store original ID (preserves number type)
          typename,
          idPtr,
        });
      },
      flatten: true, // Flatten the results to get direct pointers
      wrap: false, // Do not wrap results in an array
      resultType: "pointer", // Return JSON Pointers
    });
  }

  // Batch transform all collected IDs using the provided batchIds function.
  const batchedIds = await options.batchIds(
    idsToBatch.map(({ id, typename }) => ({ id, typename })),
  );

  // Apply the transformed IDs back to the full JSON object.
  for (let i = 0; i < idsToBatch.length; i++) {
    const { idPtr } = idsToBatch[i];

    const mappedId = batchedIds[i];

    // If a mapped ID is returned (not null or undefined), update the JSON.
    if (mappedId !== null && mappedId !== undefined) {
      jsonPointer.set(fullJson, idPtr, mappedId);

      // Parse the JSON Pointer to get an array of path segments.
      const idPtrArray = jsonPointer.parse(idPtr);

      // Extract the actual property name of the ID (e.g., "id", "userId").
      // This also removes the last segment from the array.
      const idPropertyName = idPtrArray.pop() as string;

      // Determine the prefix for the original ID property name.
      const originalIdPrefix = options.originalIdPrefix ?? "@";
      const originalIdPropertyName = `${originalIdPrefix}${idPropertyName}`;

      // Add the new original ID property name to the path segments.
      idPtrArray.push(originalIdPropertyName);

      // Compile the path segments back into a JSON Pointer for the original ID.
      // This handles cases where the original ID was a direct string (e.g., "/someId"),
      // by effectively adding the original ID property to the parent object.
      const originalIdPtr = jsonPointer.compile(idPtrArray);

      // Set the original ID in the full JSON object at the newly constructed pointer.
      // Use originalId to preserve the original type (number or string).
      jsonPointer.set(fullJson, originalIdPtr, idsToBatch[i].originalId);
    }
  }

  // Return the JSON object with transformed IDs.
  return fullJson as Transform<$$Input, $$PathTypeMap, $$OriginalIdPrefix>;
}

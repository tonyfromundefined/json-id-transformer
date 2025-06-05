import jsonPointer from "json-pointer";
import { JSONPath } from "jsonpath-plus";

const DEFAULT_ID_PROPERTY_NAME = "id";

export type Nullable<T> = T | null | undefined;

/**
 * Defines the return type for `PathTypeMap` entries, specifying how an ID's type is determined.
 * It can be a simple string (typename) or an object providing more details like `idPropertyName`.
 */
export type PathTypeMapReturn =
  | string
  | {
      /**
       * The type name associated with the ID (e.g., "User", "Post").
       */
      typename: string;

      /**
       * The name of the property that holds the ID within the object (e.g., "id", "userId", "productId").
       * Defaults to "id" if not specified.
       */
      idPropertyName?: string;
    };

/**
 * A map where keys are JSONPath expressions and values define the type of the ID.
 * Values can be a string (typename) or an object with `typename` and `idPropertyName`.
 * A function can also be provided to dynamically determine the typename.
 */
export type PathTypeMap = Record<string, PathTypeMapReturn | PathTypeMapFn>;

/**
 * A function that dynamically determines the type of an ID based on the object and its path.
 * @param {object | string} obj - The object containing the ID, or the ID itself if it's a string.
 * @param {string} path - The JSONPath to the object or ID.
 * @returns {PathTypeMapReturn} The type information for the ID.
 */
export type PathTypeMapFn = (
  obj: object | string,
  path: string,
) => PathTypeMapReturn;

/**
 * An asynchronous function that takes an array of ID entries ({ id, typename })
 * and returns a Promise resolving to an array of transformed IDs (or null/undefined if not mapped).
 */
export type BatchIdsFn = (
  entries: Array<{ id: string; typename: string }>,
) => Promise<Array<Nullable<string>>>;

export type TransformJsonIdsOptions = {
  /**
   * A map where keys are JSONPath expressions and values define the type of the ID.
   * Values can be a string (typename) or an object with `typename` and `idPropertyName`.
   * A function can also be provided to dynamically determine the typename.
   *
   * @example
   * // Static mapping
   * {
   *   pathTypeMap: {
   *     "$.users[*]": "User",
   *     "$.posts[*].author": "User",
   *   }
   * }
   * @example
   * // Dynamic mapping based on object properties
   * {
   *   pathTypeMap: {
   *     "$.items[*]": (obj) => (obj as { type: string }).type === "user" ? "User" : "Post",
   *   }
   * }
   * @example
   * // Mapping with custom ID property name
   * {
   *   pathTypeMap: {
   *     "$.products[*]": { typename: "Product", idPropertyName: "productId" },
   *   }
   * }
   */
  pathTypeMap: PathTypeMap;

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
   * Specifies whether to preserve the original ID in a separate field.
   *
   * If set to `true`, the original ID value will be stored in an additional field
   * prefixed with `@` (e.g., `@id`).
   * If set to a function, the function will be called with the `idPropertyName`
   * to determine the key for storing the original ID.
   *
   * @example
   * // includeOriginalId: true
   * // Before transformation: { id: 123, name: 'john' }
   * // After transformation: { id: 'abc123_User', '@id': 123, name: 'john' }
   *
   * @example
   * // includeOriginalId: (idPropertyName) => `__${idPropertyName}`
   * // Before transformation: { id: 123, name: 'john' }
   * // After transformation: { id: 'abc123_User', __id: 123, name: 'john' }
   */
  includeOriginalId?: true | ((idPropertyName: string) => string);
};

/**
 * Transforms IDs within a JSON object based on a provided path-to-type mapping and a batch ID transformation function.
 *
 * This function traverses the input JSON object, identifies IDs based on the `pathTypeMap`,
 * and then uses the `batchIds` function to transform these IDs.
 * It supports nested objects, dynamic type mapping, and optional retention of original IDs.
 *
 * @template T - The type of the input JSON object.
 * @param {T} input - The JSON object whose IDs are to be transformed. A deep clone is made to avoid modifying the original object.
 * @param {TransformJsonIdsOptions} options - Configuration options for ID transformation.
 *
 * @param {PathTypeMap} options.pathTypeMap - A map where keys are JSONPath expressions and values define the type of the ID.
 *                                            Values can be a string (typename) or an object with `typename` and `idPropertyName`.
 *                                            A function can also be provided to dynamically determine the typename.
 * @param {BatchIdsFn} options.batchIds - An asynchronous function that takes an array of ID entries ({ id, typename })
 *                                        and returns a Promise resolving to an array of transformed IDs (or null/undefined if not mapped).
 * @param {true | ((idPropertyName: string) => string)} [options.includeOriginalId] - Optional.
 *                                                                                   If `true`, the original ID will be preserved in a new field prefixed with `@`.
 *                                                                                   If a function, it will be called with the `idPropertyName` to determine the new field name.
 * @returns {Promise<T>} A Promise that resolves to the new JSON object with transformed IDs.
 */
export async function transformJsonIds<T extends object = object>(
  input: T,
  options: TransformJsonIdsOptions,
): Promise<T> {
  // Deep clone the input JSON to avoid modifying the original object.
  const fullJson = structuredClone(input);

  // Array to store IDs that need to be batched for transformation.
  const idsToBatch: Array<{
    id: string;
    typename: string;
    idPtr: string; // JSON Pointer to the ID property itself
  }> = [];

  // Iterate over each JSONPath defined in the pathTypeMap.
  for (const jsonPath in options.pathTypeMap) {
    JSONPath({
      path: jsonPath,
      json: fullJson,
      callback: (objPtr: string) => {
        let pathTypeMapValue = options.pathTypeMap[jsonPath];

        // Skip if the object pointer is null or undefined.
        if (objPtr === null || objPtr === undefined) {
          return;
        }

        // Retrieve the object from the full JSON using its JSON Pointer.
        const obj: Record<string, unknown> | string = jsonPointer.get(
          fullJson,
          objPtr,
        );

        let typename: string;
        let idPropertyName = DEFAULT_ID_PROPERTY_NAME; // Default ID property name

        // Determine the typename and idPropertyName based on pathTypeMapValue.
        // If pathTypeMapValue is a function, execute it to get the actual value.
        if (typeof pathTypeMapValue === "function") {
          pathTypeMapValue = pathTypeMapValue(obj, jsonPath);
        }

        // If pathTypeMapValue is a string, it's the typename.
        // Otherwise, it's an object containing typename and optionally idPropertyName.
        if (typeof pathTypeMapValue === "string") {
          typename = pathTypeMapValue;
        } else {
          typename = pathTypeMapValue.typename;
          if (pathTypeMapValue.idPropertyName) {
            idPropertyName = pathTypeMapValue.idPropertyName;
          }
        }

        // Extract the ID from the object. If the object itself is a string, use it as the ID.
        const id = typeof obj === "string" ? obj : obj?.[idPropertyName];

        // Skip if no ID is found.
        if (!id) {
          return;
        }

        // Construct the JSON Pointer to the ID property.
        const idPtr =
          typeof obj === "string" ? `${objPtr}` : `${objPtr}/${idPropertyName}`;

        // If the ID is a string, add it to the batch for transformation.
        if (typeof id === "string") {
          idsToBatch.push({
            id,
            typename,
            idPtr,
          });
        }
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

      // If includeOriginalId option is enabled, preserve the original ID.
      if (options.includeOriginalId) {
        // Parse the JSON Pointer to get an array of path segments.
        const idPtrArray = jsonPointer.parse(idPtr);

        // Extract the actual property name of the ID (e.g., "id", "userId").
        // This also removes the last segment from the array.
        const idPropertyName = idPtrArray.pop() as string;

        // Determine the property name for the original ID based on the option.
        const originalIdPropertyName =
          typeof options.includeOriginalId === "function"
            ? options.includeOriginalId(idPropertyName)
            : `@${idPropertyName}`;

        // Add the new original ID property name to the path segments.
        idPtrArray.push(originalIdPropertyName);

        // Compile the path segments back into a JSON Pointer for the original ID.
        // This handles cases where the original ID was a direct string (e.g., "/someId"),
        // by effectively adding the original ID property to the parent object.
        const originalIdPtr = jsonPointer.compile(idPtrArray);

        // Set the original ID in the full JSON object at the newly constructed pointer.
        jsonPointer.set(fullJson, originalIdPtr, idsToBatch[i].id);
      }
    }
  }

  // Return the JSON object with transformed IDs.
  return fullJson;
}

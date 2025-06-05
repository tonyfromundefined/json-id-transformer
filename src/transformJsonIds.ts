import jsonPointer from "json-pointer";
import { JSONPath } from "jsonpath-plus";

export type Nullable<T> = T | null | undefined;

export type PathTypeMapReturn =
  | string
  | {
      typename: string;
      idPropertyName?: string;
    };

export type PathTypeMap = Record<string, PathTypeMapReturn | PathTypeMapFn>;

export type PathTypeMapFn = (
  obj: object | string,
  path: string,
) => PathTypeMapReturn;

export type BatchIdsFn = (
  entries: Array<{ id: string; typename: string }>,
) => Promise<Array<Nullable<string>>>;

export type TransformJsonIdsOptions = {
  pathTypeMap: PathTypeMap;
  batchIds: BatchIdsFn;
};
export type TransformJsonIds = <T extends object = object>(
  input: T,
  options: TransformJsonIdsOptions,
) => Promise<T>;

export const transformJsonIds: TransformJsonIds = async (input, options) => {
  const clonedInput = structuredClone(input);

  const idsToBatch: Array<{
    id: string;
    typename: string;
    pointer: string;
    idPropertyPointer: string;
  }> = [];

  for (const jsonPath in options.pathTypeMap) {
    JSONPath({
      path: jsonPath,
      json: clonedInput,
      callback: (pointer: string) => {
        let pathTypeMapValue = options.pathTypeMap[jsonPath];

        if (pointer === null || pointer === undefined) {
          return;
        }

        const obj: Record<string, unknown> | string = jsonPointer.get(
          input,
          pointer,
        );

        let typename: string;
        let idPropertyName = "id";

        if (typeof pathTypeMapValue === "function") {
          pathTypeMapValue = pathTypeMapValue(obj, jsonPath);
        }

        if (typeof pathTypeMapValue === "string") {
          typename = pathTypeMapValue;
        } else {
          typename = pathTypeMapValue.typename;
          if (pathTypeMapValue.idPropertyName) {
            idPropertyName = pathTypeMapValue.idPropertyName;
          }
        }

        const id = typeof obj === "string" ? obj : obj?.[idPropertyName];

        if (!id) {
          return;
        }

        const idPropertyPointer =
          typeof obj === "string"
            ? `${pointer}`
            : `${pointer}/${idPropertyName}`;

        if (typeof id === "string") {
          idsToBatch.push({
            id,
            typename,
            pointer,
            idPropertyPointer,
          });
        }
      },
      flatten: true,
      wrap: false,
      resultType: "pointer",
    });
  }

  const batchedIds = await options.batchIds(
    idsToBatch.map(({ id, typename }) => ({ id, typename })),
  );

  for (let i = 0; i < idsToBatch.length; i++) {
    const { idPropertyPointer } = idsToBatch[i];
    const mappedId = batchedIds[i];

    if (mappedId !== null && mappedId !== undefined) {
      jsonPointer.set(clonedInput, idPropertyPointer, mappedId);
    }
  }

  return clonedInput;
};

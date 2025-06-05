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

  /**
   * 원본 ID를 별도 필드로 보존할지 여부를 설정합니다.
   *
   * true로 설정하면 ID 변환 시 원본 ID 값을 지정된 키에 추가로 저장합니다. (prefix: `@`)
   * 함수로 설정하면 ID 변환 시 원본 ID 값을 함수의 결과로 지정한 키에 저장합니다.
   *
   * @example
   * // includeOriginalId: true
   * // 변환 전: { id: 123, name: 'john' }
   * // 변환 후: { id: 'abc123_User', '@id': 123, name: 'john' }
   *
   * // includeOriginalId: (idPropertyName) => `__${idPropertyName}`
   * // 변환 전: { id: 123, name: 'john' }
   * // 변환 후: { id: 'abc123_User', __id: 123, name: 'john' }
   */
  includeOriginalId?: true | ((idPropertyName: string) => string);
};
export type TransformJsonIds = <T extends object = object>(
  input: T,
  options: TransformJsonIdsOptions,
) => Promise<T>;

export const transformJsonIds: TransformJsonIds = async (input, options) => {
  const fullJson = structuredClone(input);

  const idsToBatch: Array<{
    id: string;
    typename: string;
    objPointer: string;
    idPropertyPointer: string;
    idPropertyName: string;
  }> = [];

  for (const jsonPath in options.pathTypeMap) {
    JSONPath({
      path: jsonPath,
      json: fullJson,
      callback: (objPointer: string) => {
        let pathTypeMapValue = options.pathTypeMap[jsonPath];

        if (objPointer === null || objPointer === undefined) {
          return;
        }

        const obj: Record<string, unknown> | string = jsonPointer.get(
          fullJson,
          objPointer,
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
            ? `${objPointer}`
            : `${objPointer}/${idPropertyName}`;

        if (typeof id === "string") {
          idsToBatch.push({
            id,
            typename,
            objPointer,
            idPropertyPointer,
            idPropertyName,
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
    const { objPointer, idPropertyPointer, idPropertyName } = idsToBatch[i];

    const mappedId = batchedIds[i];

    if (mappedId !== null && mappedId !== undefined) {
      jsonPointer.set(fullJson, idPropertyPointer, mappedId);

      if (options.includeOriginalId) {
        const originalIdPropertyName =
          typeof options.includeOriginalId === "function"
            ? options.includeOriginalId(idPropertyName)
            : `@${idPropertyName}`;

        const originalIdPointer = `${objPointer}/${originalIdPropertyName}`;
        jsonPointer.set(fullJson, originalIdPointer, idsToBatch[i].id);
      }
    }
  }

  return fullJson;
};

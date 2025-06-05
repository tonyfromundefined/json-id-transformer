import { describe, expect, test, vi } from "vitest";
import {
  type BatchIdsFn,
  type TransformJsonIdsOptions,
  transformJsonIds,
} from "./transformJsonIds";

describe("transformJsonIds", () => {
  const mockBatchIds: BatchIdsFn = async (entries) => {
    const idMap: Record<string, string> = {
      "User#123": "mapped_456",
      "User#789": "mapped_101",
      "Post#111": "mapped_222",
      "Post#333": "mapped_444",
      "Comment#555": "mapped_666",
    };

    return entries.map((entry) => idMap[`${entry.typename}#${entry.id}`]);
  };

  test("ID transformation for a single user object", async () => {
    const input = {
      users: [
        { id: "123", name: "John" },
        { id: "789", name: "Jane" },
      ],
    };

    const expected = {
      users: [
        { id: "mapped_456", name: "John" },
        { id: "mapped_101", name: "Jane" },
      ],
    };

    const result = await transformJsonIds(input, {
      pathTypeMap: {
        "$.users[*]": "User",
      },
      batchIds: mockBatchIds,
    });

    expect(result).toEqual(expected);
  });

  test("ID transformation for nested objects", async () => {
    const input = {
      posts: [
        {
          id: "111",
          title: "Hello World",
          author: "123",
          comments: [{ id: "555", text: "Great post!" }],
        },
      ],
    };

    const expected = {
      posts: [
        {
          id: "mapped_222",
          title: "Hello World",
          author: "mapped_456",
          comments: [
            {
              id: "mapped_666",
              text: "Great post!",
            },
          ],
        },
      ],
    };

    const result = await transformJsonIds(input, {
      pathTypeMap: {
        "$.posts[*]": "Post",
        "$.posts[*].author": "User",
        "$.posts[*].comments[*]": "Comment",
      },
      batchIds: mockBatchIds,
    });
    expect(result).toEqual(expected);
  });

  test("User ID transformation for profile objects", async () => {
    const input = {
      profile: {
        user: "123",
        settings: {
          theme: "dark",
        },
      },
    };

    const expected = {
      profile: {
        user: "mapped_456",
        settings: {
          theme: "dark",
        },
      },
    };

    const result = await transformJsonIds(input, {
      pathTypeMap: {
        "$.profile.user": "User",
      },
      batchIds: mockBatchIds,
    });
    expect(result).toEqual(expected);
  });

  test("Unmapped IDs remain unchanged", async () => {
    const input = {
      users: [{ id: "unknown_id", name: "Unknown" }],
    };

    const expected = {
      users: [{ id: "unknown_id", name: "Unknown" }],
    };

    const result = await transformJsonIds(input, {
      pathTypeMap: {},
      batchIds: mockBatchIds,
    });
    expect(result).toEqual(expected);
  });

  test("Functional pathTypeMap test", async () => {
    const input = {
      items: [
        { id: "123", type: "user", name: "John" },
        { id: "111", type: "post", title: "Hello" },
      ],
    };

    const expected = {
      items: [
        { id: "mapped_456", type: "user", name: "John" },
        { id: "mapped_222", type: "post", title: "Hello" },
      ],
    };

    const result = await transformJsonIds(input, {
      pathTypeMap: {
        "$.items[*]": (obj) =>
          (obj as { type: string }).type === "user" ? "User" : "Post",
      },
      batchIds: mockBatchIds,
    });

    expect(result).toEqual(expected);
  });

  test("Handling null and undefined values", async () => {
    const input = {
      users: [
        { id: "123", name: "John" },
        null,
        { id: null, name: "Jane" },
        { id: undefined, name: "Bob" },
      ],
    };

    const expected = {
      users: [
        { id: "mapped_456", name: "John" },
        null,
        { id: null, name: "Jane" },
        { id: undefined, name: "Bob" },
      ],
    };

    const result = await transformJsonIds(input, {
      pathTypeMap: {
        "$.users[*]": "User",
      },
      batchIds: mockBatchIds,
    });

    expect(result).toEqual(expected);
  });

  test("Verify batchIds function receives correct entries", async () => {
    const mockBatchIdsSpy = vi
      .fn()
      .mockResolvedValue(["mapped_456", "mapped_222"]);

    const spyOptions: TransformJsonIdsOptions = {
      pathTypeMap: {
        "$.users[*]": "User",
        "$.posts[*]": "Post",
      },
      batchIds: mockBatchIdsSpy,
    };

    const input = {
      users: [{ id: "123", name: "John" }],
      posts: [{ id: "111", title: "Hello" }],
    };

    await transformJsonIds(input, spyOptions);

    expect(mockBatchIdsSpy).toHaveBeenCalledWith([
      { id: "123", typename: "User" },
      { id: "111", typename: "Post" },
    ]);
  });

  test("Retain original ID when options.includeOriginalId is true", async () => {
    const input = {
      users: [{ id: "123", name: "John" }],
    };

    const expected = {
      users: [
        {
          id: "mapped_456",
          "@id": "123", // 원본 ID가 @id 필드로 추가되는지 확인
          name: "John",
        },
      ],
    };

    const result = await transformJsonIds(input, {
      pathTypeMap: {
        "$.users[*]": "User", // typename만 지정
      },
      batchIds: mockBatchIds,
      includeOriginalId: true,
    });

    expect(result).toEqual(expected);
  });

  test("Change ID property name using PathTypeMapReturn.idPropertyName", async () => {
    const input = {
      products: [{ productId: "123", name: "Laptop" }],
    };

    const expected = {
      products: [{ productId: "mapped_456", name: "Laptop" }],
    };

    const result = await transformJsonIds(input, {
      pathTypeMap: {
        "$.products[*]": {
          typename: "User",
          idPropertyName: "productId",
        },
      },
      batchIds: mockBatchIds,
    });

    expect(result).toEqual(expected);
  });
  test("Retain original ID when includeOriginalId is true for direct string ID", async () => {
    const input = {
      someId: "123",
    };

    const expected = {
      someId: "mapped_456",
      "@someId": "123",
    };

    const result = await transformJsonIds(input, {
      pathTypeMap: {
        "$.someId": "User",
      },
      batchIds: mockBatchIds,
      includeOriginalId: true,
    });

    expect(result).toEqual(expected);
  });

  test("Use custom original ID property name for direct string ID", async () => {
    const input = {
      anotherId: "789",
    };

    const expected = {
      anotherId: "mapped_101",
      original_anotherId: "789",
    };

    const result = await transformJsonIds(input, {
      pathTypeMap: {
        "$.anotherId": "User",
      },
      batchIds: mockBatchIds,
      includeOriginalId: (idPropertyName) => `original_${idPropertyName}`,
    });

    expect(result).toEqual(expected);
  });
});

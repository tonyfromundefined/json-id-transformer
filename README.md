# JSON ID Transformer

`json-id-transformer` is a flexible utility library designed to batch transform specific IDs within a JSON object. It allows you to specify the location of IDs to be transformed using JSONPath and inject custom ID transformation logic via an external function, making it highly adaptable for integration with various backend systems.

## Features

- ✨ **Type-safe transformations** - Full TypeScript support with accurate type inference
- 🎯 **JSONPath-based targeting** - Precisely specify which IDs to transform using JSONPath expressions
- 🔄 **Batch processing** - Efficiently transform multiple IDs in a single operation
- 🔢 **Number ID support** - Automatically handles both string and number IDs
- 📝 **Original ID preservation** - Always preserves original IDs with customizable prefixes
- 🎨 **Dynamic type mapping** - Determine ID types based on context or ID values
- 🚀 **Zero dependencies** - Lightweight and fast (only `json-pointer` and `jsonpath-plus`)

## Installation

You can install the package using npm or yarn:

```bash
npm install json-id-transformer
# or
yarn add json-id-transformer
```

## Usage

The `transformJsonIds` function takes a JSON object and transformation options, returning a new JSON object with transformed IDs.

```typescript
import { transformJsonIds, type BatchIdsFn, type PathTypeMap } from 'json-id-transformer';

// Example: ID mapping function (simulating calls to a backend API)
const mockBatchIds: BatchIdsFn = async (entries) => {
  const idMap: Record<string, string> = {
    "User#123": "mapped_456",
    "User#789": "mapped_101",
    "Post#111": "mapped_222",
    "Comment#555": "mapped_666",
  };
  return entries.map((entry) => idMap[`${entry.typename}#${entry.id}`] || null);
};

async function main() {
  const inputJson = {
    users: [
      { id: "123", name: "John Doe" },
      { id: "789", name: "Jane Smith" },
    ],
    posts: [
      {
        id: "111",
        title: "My First Post",
        authorId: "123",
        comments: [{ id: "555", text: "Great post!" }],
      },
    ],
    profile: {
      userId: "123",
      settings: { theme: "dark" },
    },
  };

  const pathTypeMap: PathTypeMap = {
    "$.users[*].id": "User", // Transform 'id' field of objects in 'users' array as 'User' type
    "$.posts[*].authorId": "User", // Transform 'authorId' field of each post in 'posts' array as 'User' type
    "$.posts[*].id": "Post", // Transform 'id' field of each post in 'posts' array as 'Post' type
    "$.posts[*].comments[*].id": "Comment", // Transform 'id' field of objects in 'comments' array as 'Comment' type
    "$.profile.userId": "User", // Transform 'userId' field of 'profile' object as 'User' type
  };

  const transformedJson = await transformJsonIds(inputJson, {
    pathTypeMap,
    batchIds: mockBatchIds,
    // originalIdPrefix: "original_", // Optional: defaults to '@' if not specified
  });

  console.log(JSON.stringify(transformedJson, null, 2));

  /*
    Example Output:
    {
      "users": [
        {
          "id": "mapped_456",
          "@id": "123",
          "name": "John Doe"
        },
        {
          "id": "mapped_101",
          "@id": "789",
          "name": "Jane Smith"
        }
      ],
      "posts": [
        {
          "id": "mapped_222",
          "@id": "111",
          "title": "My First Post",
          "authorId": "mapped_456",
          "@authorId": "123",
          "comments": [
            {
              "id": "mapped_666",
              "@id": "555",
              "text": "Great post!"
            }
          ]
        }
      ],
      "profile": {
        "userId": "mapped_456",
        "@userId": "123",
        "settings": {
          "theme": "dark"
        }
      }
    }
  */
}

main();
```

### `transformJsonIds(input, options)`

The main function for transforming IDs within a JSON object.

*   `input`: The original JSON object whose IDs are to be transformed.
*   `options`: Configuration options for the transformation.

#### `options.pathTypeMap: PathTypeMap`

A map where keys are JSONPath expressions pointing directly to ID properties, and values define the typename of the ID to be transformed.

*   **String Value**: Directly specifies the `typename` for the ID at the given JSONPath.
    ```typescript
    {
      // 'id' field of objects in 'users' array will be treated as 'User' type
      "$.users[*].id": "User",
      // 'productId' field of objects in 'products' array will be treated as 'Product' type
      "$.products[*].productId": "Product"
    }
    ```
*   **Function Value**: Used when the `typename` needs to be determined dynamically. The function receives the ID value, the parent object containing the ID, and the JSONPath as arguments.
    ```typescript
    {
      // Determine typename based on parent object properties
      "$.items[*].id": (idValue, parentObj) =>
        (parentObj as { type: string }).type === "user" ? "User" : "Post"
    }
    ```

    ```typescript
    {
      // Use both ID value and parent object for complex logic
      "$.items[*].id": (idValue, parentObj) => {
        const parent = parentObj as { type: string; verified?: boolean };
        if (parent.type === "user" && parent.verified) {
          return "VerifiedUser";
        }
        return parent.type === "user" ? "User" : "Post";
      }
    }
    ```

#### `options.batchIds: BatchIdsFn`

An asynchronous function that performs the actual ID transformation logic. The `transformJsonIds` function collectively passes all extracted IDs (based on `pathTypeMap`) to this function for batch processing.

*   `entries`: An array of the form `Array<{ id: string; typename: string }>`. Contains the ID to be transformed and its type information.
*   **Return Value**: `Promise<Array<Nullable<string>>>`. It should return an array of transformed ID strings, or `null`/`undefined` if an ID is not mapped, matching the order of the `entries` array.

```typescript
// Example: mockBatchIds (in a real scenario, this would typically involve backend API calls for ID transformation)
const mockBatchIds: BatchIdsFn = async (entries) => {
  const idMap: Record<string, string> = {
    "User#123": "mapped_456",
    "Post#111": "mapped_222",
  };
  return entries.map((entry) => idMap[`${entry.typename}#${entry.id}`] || null);
};
```

#### `options.originalIdPrefix?: string`

Configures the prefix for preserving the original ID in a separate field within the transformed object.

**Note**: Original IDs are always preserved. This option only controls the prefix used.

*   Default: `"@"` - The original ID will be stored with `@` prefix (e.g., if `id` is transformed to `mapped_123`, the original `id` will be stored in `@id`).
*   Custom string: Providing a custom string will use that as the prefix for storing the original ID.
    ```typescript
    originalIdPrefix: "original_"
    // The original 'id' field will be stored in 'original_id'.
    // The original 'userId' field will be stored in 'original_userId'.
    ```

    ```typescript
    originalIdPrefix: "__"
    // The original 'id' field will be stored in '__id'.
    ```

### Working with Number IDs

The library automatically handles both string and number IDs. When a number ID is encountered:
- It's converted to a string for the transformation process
- The `batchIds` function receives the ID as a string
- The **original number type is preserved** in the original ID field

```typescript
const input = {
  users: [
    { id: 123, name: "John" },  // number ID
    { id: 789, name: "Jane" },  // number ID
  ],
};

const result = await transformJsonIds(input, {
  pathTypeMap: {
    "$.users[*].id": "User",
  },
  batchIds: async (entries) => {
    // entries[0].id will be "123" (string)
    // entries[1].id will be "789" (string)
    return entries.map(e => `transformed_${e.id}`);
  },
});

// Result:
// {
//   users: [
//     { id: "transformed_123", "@id": 123, name: "John" },  // @id is number
//     { id: "transformed_789", "@id": 789, name: "Jane" },  // @id is number
//   ]
// }
```

### Error Handling

The library provides robust error handling with specific error types for different failure scenarios:

```typescript
import {
  transformJsonIds,
  BatchIdsError,
  BatchIdsMismatchError,
  InvalidJSONPathError,
  PathTypeMapFnError,
  InvalidJSONPointerError,
} from 'json-id-transformer';

try {
  const result = await transformJsonIds(input, options);
} catch (error) {
  if (error instanceof BatchIdsError) {
    // The batchIds function threw an error (e.g., network failure)
    console.error('Failed to transform IDs:', error.cause);
  } else if (error instanceof BatchIdsMismatchError) {
    // batchIds returned wrong number of results
    console.error(`Expected ${error.expected} results, got ${error.received}`);
  } else if (error instanceof PathTypeMapFnError) {
    // Dynamic type function threw an error
    console.error(`Failed to determine type for ${error.idValue} at ${error.path}`);
  } else if (error instanceof InvalidJSONPathError) {
    // JSONPath expression is invalid
    console.error(`Invalid path: ${error.path}`);
  } else if (error instanceof InvalidJSONPointerError) {
    // Internal JSON Pointer error (rare)
    console.error(`Invalid pointer: ${error.pointer}`);
  }
}
```

#### Error Types

- **`BatchIdsError`**: Thrown when the `batchIds` function fails (e.g., network error, API failure)
- **`BatchIdsMismatchError`**: Thrown when `batchIds` returns an array with incorrect length. Each input ID must have a corresponding result (use `null` for unmapped IDs)
- **`PathTypeMapFnError`**: Thrown when a dynamic type determination function throws an error
- **`InvalidJSONPathError`**: Thrown when a JSONPath expression is invalid or fails to parse
- **`InvalidJSONPointerError`**: Thrown when an internal JSON Pointer operation fails (rare, usually indicates a bug)

### Advanced Options

#### `mutate` Option

By default, `transformJsonIds` creates a deep clone of the input to avoid side effects. For large objects, you can use the `mutate` option to modify the input directly:

```typescript
const largeInput = {
  // ... large data structure
};

// Mutate the original object (faster, but modifies input)
await transformJsonIds(largeInput, {
  pathTypeMap: { "$.users[*].id": "User" },
  batchIds: mockBatchIds,
  mutate: true, // ⚠️ Modifies largeInput
});

console.log(largeInput.users[0].id); // Now transformed
```

**Warning**: Using `mutate: true` modifies the original object. Only use this when you don't need to preserve the original data.

### Deduplication

The library automatically deduplicates IDs before calling `batchIds`. If the same ID appears multiple times with the same typename, it will only be transformed once:

```typescript
const input = {
  post: { authorId: "123" },
  comment: { authorId: "123" }, // Same ID
};

// batchIds will only be called once with [{ id: "123", typename: "User" }]
const result = await transformJsonIds(input, {
  pathTypeMap: {
    "$.post.authorId": "User",
    "$.comment.authorId": "User",
  },
  batchIds: async (entries) => {
    console.log(entries.length); // 1 (deduplicated)
    return entries.map(() => "transformed_123");
  },
});

// Both fields get the same transformed value
// result.post.authorId === "transformed_123"
// result.comment.authorId === "transformed_123"
```

This optimization reduces unnecessary API calls and improves performance.

## Development

### Running Tests

Tests are run using Vitest:

```bash
yarn test

# or
npm test
```

# JSON ID Transformer

`json-id-transformer` is a flexible utility library designed to batch transform specific IDs within a JSON object. It allows you to specify the location of IDs to be transformed using JSONPath and inject custom ID transformation logic via an external function, making it highly adaptable for integration with various backend systems.

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
    "$.users[*]": "User", // Transform 'id' field of objects in 'users' array as 'User' type
    "$.posts[*].authorId": "User", // Transform 'authorId' field of each post in 'posts' array as 'User' type
    "$.posts[*]": { typename: "Post", idPropertyName: "id" }, // Transform 'id' field of each post in 'posts' array as 'Post' type
    "$.posts[*].comments[*]": "Comment", // Transform 'id' field of objects in 'comments' array as 'Comment' type
    "$.profile.userId": "User", // Transform 'userId' field of 'profile' object as 'User' type
  };

  const transformedJson = await transformJsonIds(inputJson, {
    pathTypeMap,
    batchIds: mockBatchIds,
    includeOriginalId: true, // Preserve original ID in '@id' field
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

A map where keys are JSONPath expressions and values define the type of the ID to be transformed.

*   **String Value**: Directly specifies the `typename` for the ID at the given JSONPath. The `idPropertyName` defaults to `"id"`.
    ```typescript
    {
      // 'id' field of objects in 'users' array will be treated as 'User' type
      "$.users[*]": "User"
    }
    ```
*   **Object Value**: Allows explicit specification of `typename` along with `idPropertyName`.
    ```typescript
    {
      // 'productId' field of objects in 'products' array will be treated as 'Product' type
      "$.products[*]": { typename: "Product", idPropertyName: "productId" }
    }
    ```
*   **Function Value**: Used when the `typename` needs to be determined dynamically based on the object's content. The function receives the current object and its JSONPath as arguments.
    ```typescript
    {
      "$.items[*]": (obj) => obj.type === "user" ? "User" : "Post"
    }
    ```

    ```typescript
      "$.items[*]": (obj) => (
        obj.type === "user"
          ? { typename: "User", idPropertyName: "userId" }
          : { typename: "Post", idPropertyName: "postId" }
      )
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

#### `options.includeOriginalId?: true | ((idPropertyName: string) => string)`

Configures whether to preserve the original ID in a separate field within the transformed object.

*   `true`: The original ID will be added to a new field prefixed with `@` (e.g., if `id` is transformed to `mapped_123`, the original `id` will be stored in `@id`).
*   `((idPropertyName: string) => string)`: Providing a function allows dynamic determination of the field name for storing the original ID. The function receives the original ID property name (e.g., `"id"`, `"userId"`) as an argument.
    ```typescript
    includeOriginalId: (idPropName) => `original_${idPropName}`
    // The original 'id' field will be stored in 'original_id'.
    ```

## Development

### Running Tests

Tests are run using Vitest:

```bash
yarn test

# or
npm test
```

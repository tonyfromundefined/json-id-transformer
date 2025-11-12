import { describe, expectTypeOf, test } from "vitest";
import type { Transform } from "./Transform";

describe("Transform type", () => {
  test("should transform simple field with default prefix", () => {
    type Input = {
      id: number;
      name: string;
    };

    type Schema = {
      "$.id": "User";
    };

    type Result = Transform<Input, Schema>;

    expectTypeOf<Result>().toEqualTypeOf<{
      id: string;
      "@id": number;
      name: string;
    }>();
  });

  test("should transform array items with nested field", () => {
    type Input = {
      users: Array<{
        id: number;
        name: string;
      }>;
    };

    type Schema = {
      "$.users[*].id": "User";
    };

    type Result = Transform<Input, Schema>;

    expectTypeOf<Result>().toEqualTypeOf<{
      users: Array<{
        id: string;
        "@id": number;
        name: string;
      }>;
    }>();
  });

  test("should transform multiple paths", () => {
    type Input = {
      users: Array<{
        id: number;
        name: string;
      }>;
      posts: Array<{
        id: number;
        authorId: number;
        title: string;
      }>;
    };

    type Schema = {
      "$.users[*].id": "User";
      "$.posts[*].id": "Post";
      "$.posts[*].authorId": "User";
    };

    type Result = Transform<Input, Schema>;

    expectTypeOf<Result>().toEqualTypeOf<{
      users: Array<{
        id: string;
        "@id": number;
        name: string;
      }>;
      posts: Array<{
        id: string;
        "@id": number;
        authorId: string;
        "@authorId": number;
        title: string;
      }>;
    }>();
  });

  test("should transform nested object path", () => {
    type Input = {
      profile: {
        userId: number;
        settings: {
          theme: string;
        };
      };
    };

    type Schema = {
      "$.profile.userId": "User";
    };

    type Result = Transform<Input, Schema>;

    expectTypeOf<Result>().toEqualTypeOf<{
      profile: {
        userId: string;
        "@userId": number;
        settings: {
          theme: string;
        };
      };
    }>();
  });

  test("should use custom prefix", () => {
    type Input = {
      id: number;
      name: string;
    };

    type Schema = {
      "$.id": "User";
    };

    type Result = Transform<Input, Schema, "original_">;

    expectTypeOf<Result>().toEqualTypeOf<{
      id: string;
      original_id: number;
      name: string;
    }>();
  });

  test("should handle deeply nested arrays", () => {
    type Input = {
      posts: Array<{
        id: number;
        comments: Array<{
          id: number;
          text: string;
        }>;
      }>;
    };

    type Schema = {
      "$.posts[*].id": "Post";
      "$.posts[*].comments[*].id": "Comment";
    };

    type Result = Transform<Input, Schema>;

    expectTypeOf<Result>().toEqualTypeOf<{
      posts: Array<{
        id: string;
        "@id": number;
        comments: Array<{
          id: string;
          "@id": number;
          text: string;
        }>;
      }>;
    }>();
  });

  test("should handle string IDs (no transformation needed for type)", () => {
    type Input = {
      id: string;
      name: string;
    };

    type Schema = {
      "$.id": "User";
    };

    type Result = Transform<Input, Schema>;

    expectTypeOf<Result>().toEqualTypeOf<{
      id: string;
      "@id": string;
      name: string;
    }>();
  });

  test("should return Input when Schema is empty", () => {
    type Input = {
      id: number;
      name: string;
    };

    type Schema = Record<never, never>;

    type Result = Transform<Input, Schema>;

    expectTypeOf<Result>().toEqualTypeOf<Input>();
  });
});

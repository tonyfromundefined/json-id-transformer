import { describe, expect, it } from "vitest";
import { camelizeSchema } from "./camelizeSchema";

describe("schemaToCamelCase", () => {
  describe("기본 JSON Schema 사례들", () => {
    it("간단한 객체 스키마를 변환해야 함", () => {
      const input = {
        type: "object",
        properties: {
          user_name: { type: "string" },
          user_age: { type: "number" },
          is_active: { type: "boolean" },
        },
        required: ["user_name", "user_age"],
      };

      const expected = {
        type: "object",
        properties: {
          userName: { type: "string" },
          userAge: { type: "number" },
          isActive: { type: "boolean" },
        },
        required: ["userName", "userAge"],
      };

      const result = camelizeSchema(input);
      expect(result).toEqual(expected);
    });

    it("중첩된 객체 스키마를 변환해야 함", () => {
      const input = {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        properties: {
          user_profile: {
            type: "object",
            properties: {
              personal_info: {
                type: "object",
                properties: {
                  first_name: { type: "string" },
                  last_name: { type: "string" },
                  date_of_birth: { type: "string", format: "date" },
                },
                required: ["first_name", "last_name"],
              },
              contact_details: {
                type: "object",
                properties: {
                  email_address: { type: "string", format: "email" },
                  phone_number: { type: "string" },
                  home_address: {
                    type: "object",
                    properties: {
                      street_address: { type: "string" },
                      postal_code: { type: "string" },
                      country_code: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const expected = {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        properties: {
          userProfile: {
            type: "object",
            properties: {
              personalInfo: {
                type: "object",
                properties: {
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  dateOfBirth: { type: "string", format: "date" },
                },
                required: ["firstName", "lastName"],
              },
              contactDetails: {
                type: "object",
                properties: {
                  emailAddress: { type: "string", format: "email" },
                  phoneNumber: { type: "string" },
                  homeAddress: {
                    type: "object",
                    properties: {
                      streetAddress: { type: "string" },
                      postalCode: { type: "string" },
                      countryCode: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const result = camelizeSchema(input);
      expect(result).toEqual(expected);
    });

    it("배열 스키마를 변환해야 함", () => {
      const input = {
        type: "object",
        properties: {
          user_list: {
            type: "array",
            items: {
              type: "object",
              properties: {
                user_id: { type: "string" },
                display_name: { type: "string" },
                created_at: { type: "string", format: "date-time" },
              },
              required: ["user_id", "display_name"],
            },
          },
          tag_names: {
            type: "array",
            items: { type: "string" },
          },
        },
      };

      const expected = {
        type: "object",
        properties: {
          userList: {
            type: "array",
            items: {
              type: "object",
              properties: {
                userId: { type: "string" },
                displayName: { type: "string" },
                createdAt: { type: "string", format: "date-time" },
              },
              required: ["userId", "displayName"],
            },
          },
          tagNames: {
            type: "array",
            items: { type: "string" },
          },
        },
      };

      const result = camelizeSchema(input);
      expect(result).toEqual(expected);
    });

    it("조건부 스키마 (anyOf, oneOf, allOf)를 변환해야 함", () => {
      const input = {
        type: "object",
        properties: {
          payment_method: {
            oneOf: [
              {
                type: "object",
                properties: {
                  credit_card: {
                    type: "object",
                    properties: {
                      card_number: { type: "string" },
                      expiry_date: { type: "string" },
                      cvv_code: { type: "string" },
                    },
                    required: ["card_number", "expiry_date"],
                  },
                },
              },
              {
                type: "object",
                properties: {
                  bank_transfer: {
                    type: "object",
                    properties: {
                      account_number: { type: "string" },
                      routing_number: { type: "string" },
                    },
                  },
                },
              },
            ],
          },
        },
      };

      const expected = {
        type: "object",
        properties: {
          paymentMethod: {
            oneOf: [
              {
                type: "object",
                properties: {
                  creditCard: {
                    type: "object",
                    properties: {
                      cardNumber: { type: "string" },
                      expiryDate: { type: "string" },
                      cvvCode: { type: "string" },
                    },
                    required: ["cardNumber", "expiryDate"],
                  },
                },
              },
              {
                type: "object",
                properties: {
                  bankTransfer: {
                    type: "object",
                    properties: {
                      accountNumber: { type: "string" },
                      routingNumber: { type: "string" },
                    },
                  },
                },
              },
            ],
          },
        },
      };

      const result = camelizeSchema(input);
      expect(result).toEqual(expected);
    });

    it("복잡한 검증 규칙이 있는 스키마를 변환해야 함", () => {
      const input = {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        properties: {
          api_response: {
            type: "object",
            properties: {
              status_code: {
                type: "integer",
                minimum: 100,
                maximum: 599,
              },
              response_data: {
                type: "object",
                properties: {
                  total_count: { type: "integer", minimum: 0 },
                  page_size: { type: "integer", minimum: 1, maximum: 100 },
                  current_page: { type: "integer", minimum: 1 },
                  has_next_page: { type: "boolean" },
                  items_list: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        item_id: { type: "string", pattern: "^[a-zA-Z0-9-]+$" },
                        created_timestamp: {
                          type: "string",
                          format: "date-time",
                        },
                        last_modified: { type: "string", format: "date-time" },
                      },
                      required: ["item_id", "created_timestamp"],
                    },
                  },
                },
                required: ["total_count", "items_list"],
              },
              error_details: {
                type: "object",
                properties: {
                  error_code: { type: "string" },
                  error_message: { type: "string" },
                  field_errors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field_name: { type: "string" },
                        error_type: { type: "string" },
                        error_description: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
            required: ["status_code"],
          },
        },
      };

      const expected = {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "object",
        properties: {
          apiResponse: {
            type: "object",
            properties: {
              statusCode: {
                type: "integer",
                minimum: 100,
                maximum: 599,
              },
              responseData: {
                type: "object",
                properties: {
                  totalCount: { type: "integer", minimum: 0 },
                  pageSize: { type: "integer", minimum: 1, maximum: 100 },
                  currentPage: { type: "integer", minimum: 1 },
                  hasNextPage: { type: "boolean" },
                  itemsList: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        itemId: { type: "string", pattern: "^[a-zA-Z0-9-]+$" },
                        createdTimestamp: {
                          type: "string",
                          format: "date-time",
                        },
                        lastModified: { type: "string", format: "date-time" },
                      },
                      required: ["itemId", "createdTimestamp"],
                    },
                  },
                },
                required: ["totalCount", "itemsList"],
              },
              errorDetails: {
                type: "object",
                properties: {
                  errorCode: { type: "string" },
                  errorMessage: { type: "string" },
                  fieldErrors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        fieldName: { type: "string" },
                        errorType: { type: "string" },
                        errorDescription: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
            required: ["statusCode"],
          },
        },
      };

      const result = camelizeSchema(input);
      expect(result).toEqual(expected);
    });

    it("OpenAPI 스타일 스키마를 변환해야 함", () => {
      const input = {
        openapi: "3.0.0",
        components: {
          schemas: {
            user_model: {
              type: "object",
              properties: {
                user_id: {
                  type: "string",
                  description: "Unique user identifier",
                },
                profile_data: {
                  $ref: "#/components/schemas/user_profile",
                },
                account_settings: {
                  type: "object",
                  properties: {
                    email_notifications: { type: "boolean" },
                    privacy_level: {
                      type: "string",
                      enum: ["public", "private", "friends_only"],
                    },
                    two_factor_auth: { type: "boolean" },
                  },
                },
              },
              required: ["user_id"],
            },
            user_profile: {
              type: "object",
              properties: {
                display_name: { type: "string" },
                bio_text: { type: "string" },
                profile_image_url: { type: "string", format: "uri" },
                social_links: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      platform_name: { type: "string" },
                      profile_url: { type: "string", format: "uri" },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const expected = {
        openapi: "3.0.0",
        components: {
          schemas: {
            userModel: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "Unique user identifier",
                },
                profileData: {
                  $ref: "#/components/schemas/user_profile",
                },
                accountSettings: {
                  type: "object",
                  properties: {
                    emailNotifications: { type: "boolean" },
                    privacyLevel: {
                      type: "string",
                      enum: ["public", "private", "friends_only"],
                    },
                    twoFactorAuth: { type: "boolean" },
                  },
                },
              },
              required: ["userId"],
            },
            userProfile: {
              type: "object",
              properties: {
                displayName: { type: "string" },
                bioText: { type: "string" },
                profileImageUrl: { type: "string", format: "uri" },
                socialLinks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      platformName: { type: "string" },
                      profileUrl: { type: "string", format: "uri" },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const result = camelizeSchema(input);
      expect(result).toEqual(expected);
    });

    it("완전한 OpenAPI 3.0 스펙을 변환해야 함", () => {
      const input = {
        openapi: "3.0.0",
        info: {
          title: "User Management API",
          version: "1.0.0",
          description: "API for managing users and their profiles",
        },
        servers: [
          {
            url: "https://api.example.com/v1",
            description: "Production server",
          },
        ],
        paths: {
          "/users": {
            get: {
              summary: "Get all users",
              operationId: "get_all_users",
              parameters: [
                {
                  name: "page_size",
                  in: "query",
                  schema: { type: "integer", minimum: 1, maximum: 100 },
                },
                {
                  name: "sort_by",
                  in: "query",
                  schema: {
                    type: "string",
                    enum: ["created_at", "updated_at", "name"],
                  },
                },
              ],
              responses: {
                "200": {
                  description: "Successful response",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/user_list_response",
                      },
                    },
                  },
                },
              },
            },
            post: {
              summary: "Create new user",
              operationId: "create_new_user",
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/create_user_request",
                    },
                  },
                },
              },
              responses: {
                "201": {
                  description: "User created successfully",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/user_model",
                      },
                    },
                  },
                },
              },
            },
          },
          "/users/{user_id}": {
            get: {
              summary: "Get user by ID",
              operationId: "get_user_by_id",
              parameters: [
                {
                  name: "user_id",
                  in: "path",
                  required: true,
                  schema: { type: "string" },
                },
              ],
              responses: {
                "200": {
                  description: "User found",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/user_model",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            user_model: {
              type: "object",
              properties: {
                user_id: {
                  type: "string",
                  description: "Unique user identifier",
                  example: "usr_123456",
                },
                personal_info: {
                  $ref: "#/components/schemas/personal_info",
                },
                account_settings: {
                  type: "object",
                  properties: {
                    email_notifications: { type: "boolean", default: true },
                    privacy_level: {
                      type: "string",
                      enum: ["public", "private", "friends_only"],
                      default: "private",
                    },
                    two_factor_enabled: { type: "boolean", default: false },
                  },
                },
                created_at: {
                  type: "string",
                  format: "date-time",
                  description: "User creation timestamp",
                },
                last_login: {
                  type: "string",
                  format: "date-time",
                  nullable: true,
                },
              },
              required: ["user_id", "personal_info", "created_at"],
            },
            personal_info: {
              type: "object",
              properties: {
                first_name: {
                  type: "string",
                  minLength: 1,
                  maxLength: 50,
                },
                last_name: {
                  type: "string",
                  minLength: 1,
                  maxLength: 50,
                },
                email_address: {
                  type: "string",
                  format: "email",
                },
                phone_number: {
                  type: "string",
                  pattern: "^\\+?[1-9]\\d{1,14}$",
                },
                date_of_birth: {
                  type: "string",
                  format: "date",
                },
                profile_image_url: {
                  type: "string",
                  format: "uri",
                  nullable: true,
                },
              },
              required: ["first_name", "last_name", "email_address"],
            },
            user_list_response: {
              type: "object",
              properties: {
                total_count: {
                  type: "integer",
                  minimum: 0,
                },
                page_info: {
                  type: "object",
                  properties: {
                    current_page: { type: "integer", minimum: 1 },
                    page_size: { type: "integer", minimum: 1 },
                    total_pages: { type: "integer", minimum: 0 },
                    has_next_page: { type: "boolean" },
                    has_previous_page: { type: "boolean" },
                  },
                  required: ["current_page", "page_size", "total_pages"],
                },
                users_data: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/user_model",
                  },
                },
              },
              required: ["total_count", "page_info", "users_data"],
            },
            create_user_request: {
              type: "object",
              properties: {
                personal_info: {
                  $ref: "#/components/schemas/personal_info",
                },
                initial_settings: {
                  type: "object",
                  properties: {
                    email_notifications: { type: "boolean", default: true },
                    privacy_level: {
                      type: "string",
                      enum: ["public", "private", "friends_only"],
                      default: "private",
                    },
                  },
                },
              },
              required: ["personal_info"],
            },
          },
          parameters: {
            user_id_param: {
              name: "user_id",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "The unique identifier for a user",
            },
            page_size_param: {
              name: "page_size",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 20,
              },
              description: "Number of items per page",
            },
          },
          responses: {
            not_found_error: {
              description: "Resource not found",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error_code: { type: "string", example: "NOT_FOUND" },
                      error_message: {
                        type: "string",
                        example: "User not found",
                      },
                      request_id: { type: "string", format: "uuid" },
                    },
                    required: ["error_code", "error_message"],
                  },
                },
              },
            },
          },
        },
      };

      const expected = {
        openapi: "3.0.0",
        info: {
          title: "User Management API",
          version: "1.0.0",
          description: "API for managing users and their profiles",
        },
        servers: [
          {
            url: "https://api.example.com/v1",
            description: "Production server",
          },
        ],
        paths: {
          "/users": {
            get: {
              summary: "Get all users",
              operationId: "getAllUsers",
              parameters: [
                {
                  name: "pageSize",
                  in: "query",
                  schema: { type: "integer", minimum: 1, maximum: 100 },
                },
                {
                  name: "sortBy",
                  in: "query",
                  schema: {
                    type: "string",
                    enum: ["created_at", "updated_at", "name"],
                  },
                },
              ],
              responses: {
                "200": {
                  description: "Successful response",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/user_list_response",
                      },
                    },
                  },
                },
              },
            },
            post: {
              summary: "Create new user",
              operationId: "createNewUser",
              requestBody: {
                required: true,
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/create_user_request",
                    },
                  },
                },
              },
              responses: {
                "201": {
                  description: "User created successfully",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/user_model",
                      },
                    },
                  },
                },
              },
            },
          },
          "/users/{userId}": {
            get: {
              summary: "Get user by ID",
              operationId: "getUserById",
              parameters: [
                {
                  name: "userId",
                  in: "path",
                  required: true,
                  schema: { type: "string" },
                },
              ],
              responses: {
                "200": {
                  description: "User found",
                  content: {
                    "application/json": {
                      schema: {
                        $ref: "#/components/schemas/user_model",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            userModel: {
              type: "object",
              properties: {
                userId: {
                  type: "string",
                  description: "Unique user identifier",
                  example: "usr_123456",
                },
                personalInfo: {
                  $ref: "#/components/schemas/personal_info",
                },
                accountSettings: {
                  type: "object",
                  properties: {
                    emailNotifications: { type: "boolean", default: true },
                    privacyLevel: {
                      type: "string",
                      enum: ["public", "private", "friends_only"],
                      default: "private",
                    },
                    twoFactorEnabled: { type: "boolean", default: false },
                  },
                },
                createdAt: {
                  type: "string",
                  format: "date-time",
                  description: "User creation timestamp",
                },
                lastLogin: {
                  type: "string",
                  format: "date-time",
                  nullable: true,
                },
              },
              required: ["userId", "personalInfo", "createdAt"],
            },
            personalInfo: {
              type: "object",
              properties: {
                firstName: {
                  type: "string",
                  minLength: 1,
                  maxLength: 50,
                },
                lastName: {
                  type: "string",
                  minLength: 1,
                  maxLength: 50,
                },
                emailAddress: {
                  type: "string",
                  format: "email",
                },
                phoneNumber: {
                  type: "string",
                  pattern: "^\\+?[1-9]\\d{1,14}$",
                },
                dateOfBirth: {
                  type: "string",
                  format: "date",
                },
                profileImageUrl: {
                  type: "string",
                  format: "uri",
                  nullable: true,
                },
              },
              required: ["firstName", "lastName", "emailAddress"],
            },
            userListResponse: {
              type: "object",
              properties: {
                totalCount: {
                  type: "integer",
                  minimum: 0,
                },
                pageInfo: {
                  type: "object",
                  properties: {
                    currentPage: { type: "integer", minimum: 1 },
                    pageSize: { type: "integer", minimum: 1 },
                    totalPages: { type: "integer", minimum: 0 },
                    hasNextPage: { type: "boolean" },
                    hasPreviousPage: { type: "boolean" },
                  },
                  required: ["currentPage", "pageSize", "totalPages"],
                },
                usersData: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/user_model",
                  },
                },
              },
              required: ["totalCount", "pageInfo", "usersData"],
            },
            createUserRequest: {
              type: "object",
              properties: {
                personalInfo: {
                  $ref: "#/components/schemas/personal_info",
                },
                initialSettings: {
                  type: "object",
                  properties: {
                    emailNotifications: { type: "boolean", default: true },
                    privacyLevel: {
                      type: "string",
                      enum: ["public", "private", "friends_only"],
                      default: "private",
                    },
                  },
                },
              },
              required: ["personalInfo"],
            },
          },
          parameters: {
            userIdParam: {
              name: "userId",
              in: "path",
              required: true,
              schema: { type: "string" },
              description: "The unique identifier for a user",
            },
            pageSizeParam: {
              name: "pageSize",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 20,
              },
              description: "Number of items per page",
            },
          },
          responses: {
            notFoundError: {
              description: "Resource not found",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      errorCode: { type: "string", example: "NOT_FOUND" },
                      errorMessage: {
                        type: "string",
                        example: "User not found",
                      },
                      requestId: { type: "string", format: "uuid" },
                    },
                    required: ["errorCode", "errorMessage"],
                  },
                },
              },
            },
          },
        },
      };

      const result = camelizeSchema(input);
      expect(result).toEqual(expected);
    });
  });

  describe("기본 동작 검증", () => {
    it("snake_case를 camelCase로 변환해야 함", () => {
      const input = { user_name: "string" };
      const result = camelizeSchema(input);
      expect(result).toEqual({ userName: "string" });
    });

    it("kebab-case를 camelCase로 변환해야 함", () => {
      const input = { "user-name": "string" };
      const result = camelizeSchema(input);
      expect(result).toEqual({ userName: "string" });
    });

    it("이미 camelCase인 경우 그대로 유지해야 함", () => {
      const input = { userName: "string" };
      const result = camelizeSchema(input);
      expect(result).toEqual({ userName: "string" });
    });
  });

  describe("엣지 케이스", () => {
    it("null 값을 처리해야 함", () => {
      const result = camelizeSchema(null);
      expect(result).toBe(null);
    });

    it("undefined 값을 처리해야 함", () => {
      const result = camelizeSchema(undefined);
      expect(result).toBe(undefined);
    });

    it("원시 타입 값을 처리해야 함", () => {
      expect(camelizeSchema("string")).toBe("string");
      expect(camelizeSchema(123)).toBe(123);
      expect(camelizeSchema(true)).toBe(true);
    });

    it("빈 객체를 처리해야 함", () => {
      const result = camelizeSchema({});
      expect(result).toEqual({});
    });

    it("빈 배열을 처리해야 함", () => {
      const result = camelizeSchema([]);
      expect(result).toEqual([]);
    });
  });
});

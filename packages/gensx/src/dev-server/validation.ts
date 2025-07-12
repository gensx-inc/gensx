import { Ajv, ErrorObject } from "ajv/dist/ajv.js";
import { Context } from "hono";
import { Definition } from "typescript-json-schema";

import { BadRequestError } from "./errors.js";

/**
 * Handles validation and parsing of requests
 */
export class ValidationManager {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv();
  }

  /**
   * Parse request body with error handling
   */
  async parseJsonBody(c: Context): Promise<Record<string, unknown>> {
    try {
      return await c.req.json();
    } catch (_) {
      throw new BadRequestError("Invalid JSON");
    }
  }

  /**
   * Validate input against schema
   * Throws BadRequestError if validation fails
   */
  validateInput(
    input: unknown,
    schema?: { input: Definition; output: Definition },
  ): void {
    // Check if input is missing
    if (input === undefined) {
      throw new BadRequestError("Missing required input parameters");
    }

    // If no schema, we can't validate
    if (!schema?.input) {
      return;
    }

    // Use Ajv to validate the input against the schema
    const validate = this.ajv.compile(schema.input);
    const valid = validate(input);

    if (!valid) {
      const errors = validate.errors ?? [];
      const errorMessages = errors
        .map((err: ErrorObject) => `${err.instancePath} ${err.message}`)
        .join("; ");

      throw new BadRequestError(
        `Input validation failed: the input${errorMessages}`,
      );
    }
  }
}

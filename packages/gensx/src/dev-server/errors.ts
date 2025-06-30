/**
 * Custom error classes for consistent error handling
 */
export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class BadRequestError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export class ServerError extends Error {
  statusCode = 500;
  constructor(message: string) {
    super(message);
    this.name = "ServerError";
  }
}

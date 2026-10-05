export class DomainError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "invalid") {
    super(message);
    this.name = "DomainError";
    this.status = status;
    this.code = code;
  }
}

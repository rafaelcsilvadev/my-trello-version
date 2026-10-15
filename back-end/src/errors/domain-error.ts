// Base class for business rule failures. Services throw these with no HTTP
// knowledge; ProblemDetailsFilter maps them through DOMAIN_ERROR_MAPPINGS.
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

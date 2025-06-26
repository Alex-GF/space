import type { ContractQueryFilters } from "../../types/models/Contract.js";

export function validateContractQueryFilters(contractQueryFilters: ContractQueryFilters): string[]{
  const errors: string[] = [];

  if (contractQueryFilters.page && contractQueryFilters.page < 1) {
    errors.push("Page must be greater than or equal to 1");
  }

  if (contractQueryFilters.offset && contractQueryFilters.offset < 0) {
    errors.push("Offset must be greater than or equal to 0");
  }

  if (contractQueryFilters.limit && contractQueryFilters.limit < 1) {
    errors.push("Limit must be greater that or equal to 1");
  }

  if (contractQueryFilters.sort && !["firstName", "lastName", "username", "email"].includes(contractQueryFilters.sort)) {
    errors.push("Invalid sort field. Please use one of the following: firstName, lastName, username, email");
  }

  return errors;
}
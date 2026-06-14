export const ORGANIZATION_DEPARTMENTS = [
  "Executive",
  "Product",
  "Engineering",
  "QA",
  "Finance",
  "Operations",
  "Sales",
  "Marketing",
  "HR",
  "Legal",
] as const;

export type OrganizationDepartment = (typeof ORGANIZATION_DEPARTMENTS)[number];

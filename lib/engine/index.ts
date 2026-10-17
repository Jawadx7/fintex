// Public surface of the data-agnostic scoring engine. Everything exported here
// is pure: no Prisma, no Next.js, no app code. Import from "@/lib/engine".
//
// The ESLint config restricts this directory from importing the app/DB layers,
// so membership in this boundary is enforced, not just documented.

export * from "./transaction";
export * from "./schemas";
export * from "./history";
export * from "./rules";
export * from "./model";
export * from "./decide";
export * from "./window";
export * from "./score";

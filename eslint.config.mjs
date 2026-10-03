import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  { extends: [...nextCoreWebVitals] },
  // Prisma Client is generated TypeScript; linting it is noise.
  { ignores: ["generated/**"] },
]);

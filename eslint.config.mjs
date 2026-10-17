import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  { extends: [...nextCoreWebVitals] },
  // Prisma Client is generated TypeScript; linting it is noise.
  { ignores: ["generated/**"] },
  // The scoring engine is a pure, data-agnostic core: it must never reach into
  // the database, the Next.js runtime, the app/UI, or server-only modules. This
  // keeps it unit-testable and reusable outside this app. Enforced, not just
  // documented.
  {
    files: ["lib/engine/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@prisma/*", "@prisma", "@/generated/prisma", "@/generated/prisma/*"],
              message: "lib/engine must stay pure: no Prisma imports.",
            },
            {
              group: ["next", "next/*"],
              message: "lib/engine must stay pure: no Next.js imports.",
            },
            {
              group: ["@/app/*", "@/lib/prisma", "@/lib/compliance/*", "server-only"],
              message:
                "lib/engine must not import app, DB, dashboard or server-only code.",
            },
          ],
        },
      ],
    },
  },
]);

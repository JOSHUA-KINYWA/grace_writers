import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Generated / utility scripts (not part of app runtime)
    "current-schema.ts",
    "apply-migration.js",
    "check-and-create-table.js",
    "create-table.js",
    "test-api.js",
    "test-table.js",
  ]),
  // Disable strict any type checking for Supabase integration
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // Reduce noise (project currently has many legacy warnings)
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/exhaustive-deps': 'off',
      '@next/next/no-img-element': 'off',
    }
  }
]);

export default eslintConfig;

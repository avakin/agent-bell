import js from "@eslint/js";
import tseslint from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";
import n from "eslint-plugin-n";

export default tseslint.config(
  // ── Global ignores ──
  { ignores: ["dist", "node_modules", "assets", "scripts", "**/*.js", "!eslint.config.js"] },

  // ── Base: JS recommended ──
  js.configs.recommended,

  // ── TypeScript: strict + stylistic (type-checked) ──
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.eslint.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ── Unicorn: modern JS/TS best practices ──
  unicorn.configs["flat/recommended"],

  // ── Node.js-specific rules ──
  n.configs["flat/recommended-module"],

  // ── Project-level overrides ──
  {
    rules: {
      // TypeScript
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true },
      ],

      // Unicorn tweaks
      "unicorn/prevent-abbreviations": "off",
      "unicorn/no-process-exit": "off",
      "unicorn/no-null": "off",
      "unicorn/no-array-sort": "off", // toSorted/toReversed requires ES2023+ target
      "unicorn/no-array-reverse": "off",

      // Node
      "n/no-missing-import": "off",
      "n/no-unpublished-import": "off",
      "n/no-unsupported-features/node-builtins": "off",
      "n/no-process-exit": "off",
      "n/hashbang": "off", // bin points to dist/, shebang is in src/
    },
  },

  // ── Test files: relax some rules ──
  {
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "unicorn/consistent-function-scoping": "off",
      "@typescript-eslint/consistent-type-imports": "off", // vi.importActual requires import() type annotations
    },
  },

  // ── Config file itself ──
  {
    files: ["eslint.config.js"],
    ...tseslint.configs.disableTypeChecked,
  },
);

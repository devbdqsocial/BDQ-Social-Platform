import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Allow intentionally-unused args/vars prefixed with _ (e.g. P0 adapter stubs).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Design-system guardrails (design-system.md §1.2/§1.1, build-plan R2.1d):
      // type sizes come from the f-h* utilities, colors from tokens — never inline.
      "no-restricted-syntax": [
        "error",
        {
          selector: "Property[key.name='fontSize'][value.value=/var\\(--h/]",
          message: "Use the f-h* utility class instead of inline fontSize (design-system §1.2).",
        },
        {
          selector: "JSXAttribute[name.name='style'] Property[key.name=/color|background|backgroundColor|borderColor/i][value.value=/#[0-9a-fA-F]{3,8}/]",
          message: "No raw hex in JSX styles — use a token from globals.css or src/lib/brand.ts (design-system §1.1).",
        },
      ],
    },
  },
  {
    // Hex literals are legitimate where CSS variables don't exist: the konva canvas token
    // source, brand constants, OG/app-icon image generators (rendered off-DOM), and
    // global-error (replaces the root layout — globals.css may never load).
    files: [
      "src/lib/stall-colors.ts",
      "src/lib/brand.ts",
      "src/app/apple-icon.tsx",
      "src/app/**/opengraph-image.tsx",
      "src/app/global-error.tsx",
    ],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/generated/**",
      "reference/**",
    ],
  },
];

export default eslintConfig;

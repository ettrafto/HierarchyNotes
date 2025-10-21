module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react", "react-hooks", "import", "prettier"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:prettier/recommended"
  ],
  settings: { react: { version: "detect" } },
  env: { browser: true, node: true, es2023: true },
  rules: {
    "prettier/prettier": "warn",
    "react/react-in-jsx-scope": "off",
    "import/order": ["warn", { "newlines-between": "always" }]
  },
  ignorePatterns: ["dist", "build", "node_modules", "src-tauri/target"]
};

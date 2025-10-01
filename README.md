# React + TypeScript + Vite + Privy + Alchemy Smart Wallets

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules, integrated with Privy authentication and Alchemy Smart Wallets using EIP-7702.

## Features

- **Smart Wallets with EIP-7702**: Upgrade EOAs to smart wallets without transferring assets
- **Gas Sponsorship**: Transactions are sponsored through Alchemy's gas policy
- **Flexible Value Format**: Transaction values can be specified as:
  - `bigint`: `123n`
  - `number`: `123`
  - `hex string`: `"0x7b"`
  - `decimal string`: `"123"`

## Setup

1. Copy `env.example` to `.env` and fill in your credentials:

   - `VITE_ALCHEMY_API_KEY`: Your Alchemy API key
   - `VITE_ALCHEMY_POLICY_ID`: Your Alchemy gas policy ID for sponsorship
   - `VITE_PRIVY_APP_ID`: Your Privy application ID
   - `VITE_PRIVY_CLIENT_ID`: Your Privy client ID

2. Install dependencies:

   ```bash
   yarn install
   ```

3. Run the development server:
   ```bash
   yarn dev
   ```

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    "react-x": reactX,
    "react-dom": reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs["recommended-typescript"].rules,
    ...reactDom.configs.recommended.rules,
  },
});
```

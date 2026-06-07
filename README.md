# Starfire iOS Prototype

This repository is the clean-room mobile shell for rebuilding the `cinny-dev` feature set as an iOS-first app.

Current scope:

- React + Vite mobile UI.
- Capacitor iOS shell generated in GitHub Actions.
- Matrix password login prototype.
- Matrix sync and room list smoke test.
- Rust crypto / IndexedDB startup smoke test through `matrix-js-sdk`.
- Unsigned IPA packaging for TrollStore-style installation tests.

The existing `cinny-dev` source is treated as a feature map, not as UI code to copy.

## Commands

```bash
npm install
npm run start
npm run build
```

Local Windows development is optional. The iOS build is designed to run on GitHub Actions.

## Important Security Note

The prototype stores the Matrix access token through Capacitor Preferences so that the login flow can be tested quickly. Before daily use, replace `src/services/sessionStore.ts` with a Keychain-backed storage plugin.

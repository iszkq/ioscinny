# iOS IPA Build And Install Guide

This project is designed for a Windows-only local machine. You do not need local Node.js, npm, Xcode, or macOS for the first IPA build.

## Build On GitHub

1. Create a GitHub repository and push this folder.
2. Open the repository on GitHub.
3. Go to `Actions`.
4. Select `Build iOS IPA`.
5. Click `Run workflow`.
6. Wait for the macOS job to finish.
7. Open the finished run and download the `starfire-ios-unsigned-ipa` artifact.
8. Unzip the artifact to get `starfire-ios-unsigned.ipa`.

## Install Options

### TrollStore

Use this route first if your iPhone supports TrollStore.

1. Send the IPA to your iPhone.
2. Open/share the IPA with TrollStore.
3. Install it in TrollStore.
4. Launch `Starfire iOS`.

This workflow produces an unsigned IPA. TrollStore is the intended first test installer.

### Aisi Assistant

Aisi Assistant usually needs a signed IPA or it will sign using an available Apple ID, enterprise certificate, or other signing source. The unsigned IPA from this workflow may fail there.

If Aisi asks for signing, that is expected. Without an Apple Developer account, long-term install reliability depends on the signing method Aisi uses.

## What This IPA Tests

- App launches inside an iOS Capacitor WebView.
- Matrix password login works.
- Session can be restored after app restart.
- `matrix-js-sdk` can initialize IndexedDB stores.
- `initRustCrypto()` can load and run the Matrix crypto wasm.
- Joined rooms can sync.
- A basic text message can be sent.

## Expected Gaps

This is not the mature full Cinny replacement yet. It does not include full timeline rendering, media upload, SSO, registration, device verification UI, key backup UI, notifications, favorites, Bible tools, AI settings, or calls.

Those features should be added only after the IPA install and Matrix crypto smoke tests pass on your real device.

## Common Failures

### The GitHub build fails at `xcodebuild`

Open the failed step log. If it mentions code signing, confirm the workflow is using:

```text
CODE_SIGNING_ALLOWED=NO
CODE_SIGNING_REQUIRED=NO
CODE_SIGN_IDENTITY=""
DEVELOPMENT_TEAM=""
```

### The app opens but login fails

Check the homeserver URL. Use a full URL such as:

```text
https://matrix.org
```

or your own homeserver.

### The app logs in but crashes or gets stuck while connecting

This likely means the iOS WebView failed during Matrix crypto wasm or IndexedDB startup. That is the main reason this prototype exists: we need to confirm this before rebuilding the full app.

### The IPA will not install through Aisi Assistant

That usually means Aisi requires signing. Try TrollStore first, or provide an Apple signing route later.

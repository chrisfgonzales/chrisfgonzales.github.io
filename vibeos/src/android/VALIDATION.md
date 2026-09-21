# Android release validation

Keep the pull request in Draft until every required check below passes on its current head commit.

## Automated checks

- Run `node vibeos/scripts/verify-vibeos.mjs` from the repository root.
- Run `./vibeos/src/android/gradlew -p vibeos/src/android lintDebug assembleDebug --stacktrace --no-daemon`.
- Confirm the pull-request `Validate and Deploy VibeOS PWA` workflow succeeds on the current head SHA.
- Confirm the verifier rejects `file:///android_asset`, requires the `WebViewAssetLoader` HTTPS origin, and keeps file access, content access, universal file access, network loads, cleartext traffic, and the `INTERNET` permission disabled.

## Device or emulator checks

Use a supported Android device or emulator with a current Android System WebView.

1. Install the debug APK cleanly and launch VibeOS in airplane mode with Wi-Fi disabled.
2. Confirm the app shell, styles, icon, and JavaScript load with no blank screen or asset errors.
3. Create a workspace, memory item, and flow; close the app, relaunch it offline, and confirm all three persist.
4. Open Privacy and return to the main app; confirm both pages remain inside the trusted app-assets origin.
5. Exercise JSON export and import through the Android file picker and confirm cancellation and successful import both return control to VibeOS.
6. Exercise copy, share, text-to-speech, and vibration. Confirm each action succeeds or reports a clear device-capability error.
7. Tap an approved external HTTPS link and confirm it opens through a resolved external app, not inside the VibeOS WebView.
8. Attempt an unsupported scheme and confirm VibeOS blocks it with an error.
9. Rotate the device, background and resume the app, then use Back navigation; confirm there is no crash, blank page, or lost local state.
10. In Chrome remote debugging for the debug build, confirm the main document URL begins with `https://appassets.androidplatform.net/assets/www/` and that no `file://` requests or unexpected network requests occur.

## Ready-for-review gate

Return the pull request to Ready for review only when the automated checks and all device or emulator checks pass against the same head SHA, the results are recorded in the pull request, no unresolved blocking review thread remains, and the PR is still mergeable. Do not merge as part of validation.

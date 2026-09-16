# VibeOS v2

VibeOS is a local-first, no-code generative operating shell for Android.

## Product
- task-first workspaces, local Memory, and user-run Flows
- versioned IndexedDB state with v1 migration and validated JSON import/export
- responsive compact-phone, tablet, and desktop-PWA navigation
- light, dark, high-contrast, and reduced-motion preferences
- installable/offline PWA with cache updates and an offline fallback
- native Android shell with notification context, foreground-app accessibility context, Android settings shortcuts, sharing, file picker, vibration, and text-to-speech

## Privacy
Core VibeOS data stays local unless the user explicitly exports or shares it. VibeOS has no
account, cloud sync, analytics, or live connectors. Native notification
and foreground-app context are stored only in app-local Android preferences, require explicit
system permission, and are bounded; notification summaries are cleared when notification access
disconnects.

## Android package
`com.dotmatrixsolutions.vibeos`

## Build requirements
- Android Gradle Plugin 8.5.2
- Gradle 8.7
- JDK 17
- compileSdk / targetSdk 36
- minSdk 26
- network access to `dl.google.com` (Google Maven host for Android Gradle Plugin artifacts)

## Hosted PWA
The GitHub Pages workflow deploys the `web/` directory directly at:
https://chrisfgonzales.github.io/vibeos/

## APK
Tag a commit as `vibeos-v<version>` to publish the installable APK as a GitHub Release asset.

## Development

`web/` is the source of truth for the shared interface. The Android build synchronizes those
assets to its WebView bundle before `preBuild`, so do not edit generated files under
`android/app/src/main/assets/www/`.

Build the Android app from the repository root with:
`./vibeos/src/android/gradlew -p vibeos/src/android assembleDebug`

Run the web-source verification with:
`node vibeos/scripts/verify-vibeos.mjs`

The GitHub workflows use this same Gradle wrapper and run Android lint before assembling the
debug APK. The current AGP 8.5.2 build emits a compatibility warning for compileSdk 36 but
builds successfully; update AGP and the wrapper together after validating a supported pair.

# VibeOS v1.0.0

VibeOS is a local-first, no-code generative operating shell for Android.

## Product
- Vibe workspace generator
- persistent Memory
- natural-language Flows
- Ayla local command surface
- accessibility modes: Normal, ADHD, Fine Motor, Low Stimulation, High Contrast
- local JSON import/export
- installable/offline PWA
- native Android shell with notification context, foreground-app accessibility context, Android settings shortcuts, sharing, file picker, vibration, and text-to-speech

## Privacy
Core VibeOS data stays local unless the user explicitly exports or shares it. Native notification and foreground-app context are stored only in app-local Android preferences and require explicit system permission.

## Android package
`com.dotmatrixsolutions.vibeos`

## Build requirements
- Android Gradle Plugin 8.5.2
- Gradle 8.7
- JDK 17
- compileSdk / targetSdk 36
- minSdk 26

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

# Architecture

## Web core
Static local-first HTML/CSS/JavaScript application. State is persisted in localStorage. Service worker provides offline caching when hosted over HTTP(S).

## Android shell
A native Java Activity hosts the exact web core from bundled assets in WebView. A restricted JavaScript bridge exposes only explicit local Android capabilities.

## Native services
- `VibeNotificationListener`: keeps up to 20 recent notifications in app-local SharedPreferences after user authorization.
- `VibeAccessibilityService`: stores only foreground package context on window-state changes. It does not retrieve window content.
- `VibeBridge`: device info, settings launchers, local sharing, clipboard, TTS and vibration.

## Distribution
- GitHub Pages: installable PWA fallback.
- GitHub Release: installable debug-signed APK for sideloading.
- Play-ready project targets API 36; Play signing and Play Console publication remain account-level distribution steps.

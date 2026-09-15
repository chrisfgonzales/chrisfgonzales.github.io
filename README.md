# Christopher Gonzales Portfolio

Personal GitHub Pages site for **Christopher Gonzales**.

## Live site

https://chrisfgonzales.github.io/

## Purpose

This repository is the public front door for my developer and systems-architecture work. It keeps commercial work, active development directions, and research forks clearly separated so project authorship is easy to understand.

### Portfolio pillars

- **Dot Matrix Solutions** — production business and consulting work
- **Ayla / Local AI Lab** — active local-AI, Android, RAG, voice, and orchestration experiments
- **Accessibility AI Lab** — accessibility-focused AI and inclusive UX research

### Project taxonomy

- Built and led by me
- Active development direction
- Research direction
- Research fork
- Reference implementation / learning

Research forks link to both my fork and the upstream project.

## Accessibility baseline

The site uses:

- semantic HTML
- a skip link
- keyboard-friendly navigation
- visible focus states
- responsive layouts down to narrow mobile widths
- reduced-motion support
- readable contrast and hierarchy
- no framework or JavaScript requirement for core content

## Verification

- Dot Matrix Solutions: https://dotmatrixsolutions.com
- GitHub: https://github.com/chrisfgonzales
- LinkedIn: https://www.linkedin.com/in/chrisfgonzales
- Credly: https://www.credly.com/users/christopher-gonzales.cc675278

## Deployment

GitHub Pages deploys the portfolio and VibeOS through the `Validate and Deploy VibeOS PWA` workflow.

### VibeOS

VibeOS source lives in [`vibeos/src`](vibeos/src): the dependency-free PWA is in `web/`, and
the Android WebView shell is in `android/`. GitHub Actions validates and deploys the PWA from
the source directory; a `vibeos-v<version>` tag creates the debug APK release.

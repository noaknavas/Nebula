<div align="center">

# N E B U L A

**A highly optimized, multi-service desktop audio environment.**

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge&logo=githubactions)]()
[![Platform](https://img.shields.io/badge/Platform-macOS_|_Windows_|_Linux-blue?style=for-the-badge)]()
[![Electron](https://img.shields.io/badge/Architecture-Electron_|_SolidJS-47848f?style=for-the-badge&logo=electron)]()
[![Known Vulnerabilities](https://snyk.io/test/github/noaknavas/Nebula/badge.svg?style=for-the-badge)](https://snyk.io/test/github/noaknavas/Nebula)
[![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)]()

</div>

<br/>

> **Nebula** transcends the traditional web-wrapper approach. It is a deeply integrated desktop client designed for audiophiles and power users, seamlessly fusing YouTube Music and Spotify into a unified, distraction-free environment. Engineered with modern web standards, it leverages IPC communication, custom SolidJS rendering, and aggressive network-level blocking to deliver a superior acoustic and visual experience.

<br/>

## ✦ Core Architecture

Nebula isn't just a browser window; it's a completely overhauled client environment.

*   **Native System Integration:** Interacts directly with your OS via global shortcuts, native media keys, and Discord Rich Presence (RPC) using standard IPC protocols.
*   **Hardware-Accelerated UI:** The entire interface is enveloped in a bespoke, GPU-accelerated glassmorphism shell. Elements like the custom titlebar are rendered using **SolidJS** to ensure zero DOM overhead and buttery smooth 60fps animations.
*   **Zero-Overhead Playback:** By stripping out heavy tracking scripts and dynamically filtering DOM mutations, Nebula drastically reduces CPU/GPU footprint, ensuring your audio stream remains uncompromised and jitter-free.
*   **Aggressive Network Scrubbing:** Integrated `Ghostery` network blockers and MutationObserver-based DOM sanitization surgically remove advertisements, telemetry, and promotional popups before they even hit the renderer.

## ✦ The Plugin Ecosystem

Nebula is built on a highly modular plugin infrastructure. You control exactly what loads into memory.

| Plugin | Architecture | Function |
| :--- | :--- | :--- |
| **SponsorBlock** | Network/Renderer | Automatically detects and skips non-music segments in music videos via crowdsourced APIs. |
| **Do Not Track** | IPC Intercept | Blocks outbound analytic endpoints and telemetry. |
| **In-App Menu** | SolidJS | A bespoke, borderless navigation menu injected directly into the window frame. |
| **Ambient Mode** | Canvas API | Extracts dominant colors from the album art and paints a dynamic, temporal-blended glow behind the player. |
| **Audio API** | Web Audio API | Exposes an equalizer and audio stream intercepts for local manipulation. |

## ✦ Deployment & Installation

Compiled binaries are automatically generated and deployed for all major architectures. 

**[⭳ Access Latest Release Builds](https://github.com/noaknavas/Nebula/releases)**

*   **macOS:** `x64` (Intel) & `arm64` (Apple Silicon) `.dmg`
*   **Windows:** `.exe` Installer & Portable variants
*   **Linux:** `AppImage`, `Flatpak`, `deb`, `rpm`, `snap`

## ✦ Developer Guide

Nebula is structured for rapid iteration. The build system is powered by `Vite` for hot-module replacement (HMR) across both the main process and renderer injections.

```bash
# 1. Clone the repository
$ git clone https://github.com/noaknavas/Nebula.git
$ cd Nebula

# 2. Install dependencies (Requires pnpm)
$ pnpm install

# 3. Launch the development environment (with HMR)
$ pnpm dev

# 4. Compile production binaries
$ pnpm dist
```

## ✦ Acknowledgments & License

Nebula is built upon the foundational work of the open-source community. It is a heavily customized, private-tier fork of [pear-desktop](https://github.com/pear-devs/pear-desktop).

Distributed under the **MIT License**. See `license` for detailed information.

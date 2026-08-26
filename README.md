# Nebula - Multi-service Music Player

Nebula is a modern, beautiful, multi-service desktop music player built with Electron and web technologies. It seamlessly integrates your favorite streaming platforms while providing a gorgeous, distraction-free environment enhanced by custom styling, quality-of-life features, and a powerful plugin system.

## 🚀 Features

* **Multi-Service Support**: Works with YouTube Music and Spotify (with more to come!).
* **Stunning UI**: Custom frosted-glass titlebar, sleek dark mode aesthetics, and smooth animations that elevate the default web player experiences.
* **Ad & Promo Blocker**: Built-in, aggressive ad and promotional content blocking, ensuring an uninterrupted listening experience.
* **Extensible Plugin System**: Rich ecosystem of plugins to customize your player:
  * **In-App Menu**: A beautiful, custom-built menu system integrated directly into the titlebar.
  * **Do Not Track**: Enhanced privacy by blocking common web trackers.
  * **SponsorBlock**: Automatically skip non-music segments in music videos (YouTube Music).
  * **Global Shortcuts**: Control playback from anywhere on your system.
* **Cross-Platform**: Available for Windows, macOS, and Linux.

## 🛠️ Tech Stack

* **Core**: Electron, TypeScript, Node.js
* **Build Tool**: Vite, electron-builder
* **UI**: HTML/CSS/JS (Renderer injections), SolidJS (for complex plugins like in-app-menu)

## 📦 Installation

Grab the latest release for your platform from the [Releases page](https://github.com/vanguard/nebula/releases).

* **Linux**: AppImage, Flatpak, deb, rpm, snap, tar.gz
* **Windows**: Setup executable or Portable version
* **macOS**: DMG (x64 and Apple Silicon)

## 💻 Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vanguard/nebula.git
   cd nebula
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Run in development mode**:
   ```bash
   pnpm dev
   ```

4. **Build for production**:
   ```bash
   pnpm dist
   # or for a specific platform:
   # pnpm dist:linux
   # pnpm dist:mac
   # pnpm dist:win
   ```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](license) file for details.

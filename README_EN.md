<div align=center>
<img src="icon.png" style="width:100px;" width="100"/>
<h2>OrangutanInterview</h2>
</div>

中文 | [English](README_EN.md)

### 1. Overview

- A local interview practice tool: the question bank, API key and endpoint stay on your machine and never touch a backend.
- An answer is generated only when you click "Show Answer", calling the OpenAI-compatible endpoint you configured, with streaming output and Markdown rendering.
- One frontend, three ways to run it: straight in a browser, as a Tauri desktop app, or as a Docker container.
- **Publisher** Mutantcat Working Group (mutantcat.org) · GitHub: https://github.com/Mutantcat-Working-Group

Core value:

- Questions stay local and private, and can be exported at any time.
- Anki-style random practice and mastery marks turn "seen" into "remembered".
- Desktop builds are double-click installers; CI produces Windows / macOS / Linux packages automatically.

### 2. Features

#### Question bank

- Add, edit and delete questions one by one, with category and difficulty filters plus keyword search.
- Bulk import: one question per line, `question | category`, `question | category | difficulty`, or a JSON array.
- One-click JSON export; the sample bank appends a few example questions for a quick try.

#### Random practice

- Draw a random question or reshuffle; the card front shows only the question until you click "Show Answer".
- Marking "Forgot / Hard / Good / Easy" moves to the next card automatically.

#### AI answers

- Calls your custom OpenAI-compatible endpoint with streaming output.
- Configurable system prompt, temperature and max tokens; answers are cached locally so re-viewing never re-requests.
- Answers support Markdown / GFM: headings, lists, code blocks and tables.

#### Desktop app

- A Tauri 2 shell reusing the same frontend pages and local storage.
- Windows ships as an NSIS installer, macOS as a universal DMG (ad-hoc signed, covering both Intel and Apple Silicon), Linux as an AppImage (x86_64 and aarch64).

### 3. Install and Download

Download the build for your platform from [Releases](https://github.com/Mutantcat-Working-Group/OrangutanInterview/releases); each one runs with a double click:

1. Windows (x86_64 / arm64): grab `OrangutanInterview_<version>_x64-setup.exe` or `OrangutanInterview_<version>_arm64-setup.exe`, an NSIS installer.
2. macOS (universal): grab `OrangutanInterview_<version>_universal.dmg`, ad-hoc signed and universal for Intel and Apple Silicon; mount and drag to Applications.
3. Linux (x86_64 / aarch64): grab `OrangutanInterview_<version>_amd64.AppImage` or `OrangutanInterview_<version>_arm64.AppImage`, make it executable and run it.
4. Web static bundle: grab `OrangutanInterview-web-<version>.tar.gz`, extract it and serve the `dist` contents with any static server.
5. Docker image (multi-arch, amd64 and arm64): `docker run -d -p 8080:80 ghcr.io/mutantcat-working-group/orangutan-interview:latest`, then open http://localhost:8080 .

Every release also carries `checksums.txt`, `checksums-md5.txt` and `checksums-sha1.txt` so you can verify downloaded files.

### 4. Quick Start

1. Add questions one by one under "Question Bank", paste multi-line text or a JSON array via "Bulk Import", or click "Sample Bank" for a quick try.
2. Click "Draw Question" to start practicing; the right side shows an Anki-style card: the front has only the question, click "Show Answer" to flip it, switch cards with the arrows, and mark mastery with "Forgot / Hard / Good / Easy".
3. Click "API Settings", fill in the OpenAI-compatible endpoint, API key and model name, and use "Test Connection" to verify.
4. The model endpoint is called only after you click "Show Answer"; answers render as Markdown and are cached locally.

### 5. Local Development

Requirements: Node.js 22+; Rust 1.77+ for the desktop app.

```bash
npm install
npm run dev             # browser dev server at http://localhost:5173
npm run build           # production build into dist/
npm run preview         # preview the production build
npm run desktop:dev     # Tauri desktop development
npm run desktop:build   # build installers for the current platform
```

Desktop builds need platform dependencies: WebView2 runtime on Windows (bundled with Win11), Xcode command line tools on macOS, and `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`, `patchelf` on Linux.

Desktop frontend requests are still issued directly by the WebView, so third-party endpoints must allow CORS as well.

### 6. CI and Automated Releases

Pushing a `v*` tag (for example `v1.0.20260920`) triggers `.github/workflows/release.yml`:

1. Five parallel desktop builds: Windows x86_64 / arm64 (NSIS), macOS universal (DMG, ad-hoc signed), Linux x86_64 / aarch64 (AppImage).
2. The web job builds the static bundle, packs it into a tarball, and builds and pushes a multi-arch Docker image to GHCR.
3. The publish job collects every artifact, generates `checksums.txt`, `checksums-md5.txt` and `checksums-sha1.txt`, and creates or updates the GitHub Release.

Versions follow `1.0.YYYYMMDD`; `scripts/sync-version.mjs` syncs the version from the tag into `package.json`, `package-lock.json`, `Cargo.toml`, `tauri.conf.json` and `Cargo.lock` before building. A manual run (workflow_dispatch) keeps the version already in the repo and does not publish a release.

```bash
git tag v1.0.20260920
git push origin v1.0.20260920
```

### 7. Storage and Privacy

- Questions: `localStorage` key `iqr.questions.v1`
- API settings: `localStorage` key `iqr.settings.v1`
- AI answers: stored together with the question data

When the browser or the desktop WebView calls a third-party endpoint directly, the endpoint must allow cross-origin (CORS) requests. The default endpoint speaks the OpenAI-compatible format: `{API base URL}/chat/completions`. The API key lives only on your machine and can be changed or wiped at any time.

### 8. Project Structure

```text
.
├── index.html
├── icon.png                     # app and README icon
├── package.json
├── Dockerfile                   # web container image (Nginx serving static files)
├── nginx.conf                   # in-container Nginx config (SPA fallback)
├── .dockerignore
├── scripts/sync-version.mjs     # syncs the tag version into every manifest
├── .github/workflows/release.yml  # three-platform packaging + release pipeline
├── src-tauri                    # Tauri desktop shell config and entry point
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/default.json
│   └── src/main.rs
├── src
│   ├── main.jsx        # app entry
│   ├── App.jsx         # page and all business interactions
│   ├── api.js          # OpenAI-compatible API calls
│   ├── store.js        # localStorage access and defaults
│   └── index.css       # global styles
└── vite.config.js
```

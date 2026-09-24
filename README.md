<div align=center>
<img src="icon.png" style="width:100px;" width="100"/>
<h2>面试猿</h2>
<p>OrangutanInterview</p>
</div>

[English](README_EN.md) | 中文

### 一、产品概述

- 本地面试刷题工具：题库、API Key、接口地址全部只保存在本机，不经过任何后端。
- 点击「显示答案」时才直接调用你自己配置的 OpenAI 兼容接口生成答案，支持流式输出与 Markdown 渲染。
- 同一套前端页面，三种使用方式：浏览器直接打开、Tauri 桌面版、Docker 容器部署。

核心价值：

- 面试题存在本机，隐私可控，可随时导出备份。
- Anki 式随机抽题与掌握度标记，把「看过」变成「记住」。
- 桌面版双击安装即用，CI 自动产出 Windows / macOS / Linux 三平台安装包。

### 二、功能说明

#### 题库管理

- 逐条添加、编辑、删除面试题，支持分类、难度筛选与关键词搜索。
- 批量导入：一行一题、`题目 | 分类`、`题目 | 分类 | 难度` 以及 JSON 数组。
- 一键导出 JSON；「示例题库」可追加示例题快速体验。

#### 随机练习

- 随机抽题 / 重新洗牌，卡片正面只显示题目，点击「显示答案」翻面。
- 「忘记 / 困难 / 良好 / 简单」标记后自动切到下一张。

#### AI 答案

- 调用自定义 OpenAI 兼容接口生成答案，支持流式输出。
- 可配置系统提示词、温度、最大 Token 数；答案缓存到本机，重复查看不重复请求。
- 答案支持标题、列表、代码块、表格等 Markdown / GFM 语法。

#### 桌面版

- Tauri 2 外壳复用同一套前端页面与本机存储。
- Windows 为 NSIS 安装包，macOS 为 universal DMG（ad-hoc 签名，同时支持 Intel 与 Apple Silicon），Linux 为 AppImage（x86_64 与 aarch64）。

### 三、安装与下载

从 [Releases](https://github.com/Mutantcat-Working-Group/OrangutanInterview/releases) 下载对应平台的程序，双击即用：

1. Windows（x86_64 / arm64）：下载 `OrangutanInterview_<版本>_x64-setup.exe` 或 `OrangutanInterview_<版本>_arm64-setup.exe`，NSIS 安装包，双击安装。
2. macOS（universal）：下载 `OrangutanInterview_<版本>_universal.dmg`，ad-hoc 签名，Intel 与 Apple Silicon 通用，挂载后拖拽安装。
3. Linux（x86_64 / aarch64）：下载 `OrangutanInterview_<版本>_amd64.AppImage` 或 `OrangutanInterview_<版本>_arm64.AppImage`，赋予执行权限后双击运行。
4. Web 静态包：下载 `OrangutanInterview-web-<版本>.tar.gz`，解压后用任意静态服务器托管 `dist` 内容。
5. Docker 镜像（多架构，amd64 与 arm64）：`docker run -d -p 8080:80 ghcr.io/mutantcat-working-group/orangutan-interview:latest`，浏览器打开 http://localhost:8080 。

每个 Release 同时附带 `checksums.txt`、`checksums-md5.txt`、`checksums-sha1.txt` 三个校验文件，可核对下载文件完整性。

### 四、快速上手

1. 进入「题库管理」逐条添加面试题，或用「批量导入」粘贴多行文本 / JSON 数组；也可以点击「示例题库」快速体验。
2. 点击「随机抽题」开始练习，右侧以 Anki 卡片形式展示：正面只有题目，点击「显示答案」后翻面，可左右切换卡片，并用「忘记 / 困难 / 良好 / 简单」标记掌握程度。
3. 点击「API 设置」，填入 OpenAI 兼容的接口地址、API Key 和模型名称，可先点「测试连接」校验配置。
4. 点击「显示答案」后才会调用模型接口，答案支持 Markdown 渲染并缓存到本机。

### 五、本地开发

环境要求：Node.js 22+；桌面版另需 Rust 1.77+。

```bash
npm install
npm run dev             # 浏览器开发，http://localhost:5173
npm run build           # 生产构建，输出 dist/
npm run preview         # 本地预览生产构建
npm run desktop:dev     # Tauri 桌面版开发
npm run desktop:build   # 在本机平台生成安装包
```

桌面版构建需要平台依赖：Windows 需 WebView2 运行时（Win11 自带）；macOS 需 Xcode 命令行工具；Linux 需 `libwebkit2gtk-4.1-dev`、`libayatana-appindicator3-dev`、`librsvg2-dev`、`patchelf`。

桌面版的前端请求仍然直接由 WebView 发起，因此对接第三方接口时同样需要接口开启 CORS。

### 六、CI 与自动发布

推送 `v*` 格式的 tag（例如 `v1.0.20260920`）即触发 `.github/workflows/release.yml`：

1. 五路并行构建桌面安装包：Windows x86_64 / arm64（NSIS）、macOS universal（DMG，ad-hoc 签名）、Linux x86_64 / aarch64（AppImage）。
2. Web 任务构建静态产物并打成 tar 包，同时构建并推送多架构 Docker 镜像到 GHCR。
3. `publish` 任务汇总全部产物，生成 `checksums.txt`、`checksums-md5.txt`、`checksums-sha1.txt`，自动创建或更新 GitHub Release。

版本号规则为 `1.0.YYYYMMDD`，由 `scripts/sync-version.mjs` 在构建前从 tag 同步到 `package.json`、`package-lock.json`、`Cargo.toml`、`tauri.conf.json` 与 `Cargo.lock`。手动触发（workflow_dispatch）时沿用代码库当前版本号，且不会发布 Release。

```bash
git tag v1.0.20260920
git push origin v1.0.20260920
```

### 七、数据存储与隐私

- 题库：`localStorage` 的 `iqr.questions.v1`
- API 设置：`localStorage` 的 `iqr.settings.v1`
- AI 答案：随题目一起保存在题库数据中

浏览器或桌面 WebView 直接调用第三方接口时，接口服务端需要允许跨域（CORS）。默认接口为 OpenAI 兼容格式：`{API 地址}/chat/completions`。API Key 只存在本机，可随时修改或一键清空本机数据。

### 八、项目结构

```text
.
├── index.html
├── icon.png                     # 应用与 README 图标
├── package.json
├── Dockerfile                   # Web 版容器镜像（Nginx 托管静态产物）
├── nginx.conf                   # 容器内 Nginx 配置（SPA 回退）
├── .dockerignore
├── scripts/sync-version.mjs     # 从 tag 同步版本号到各清单文件
├── .github/workflows/release.yml  # 三平台打包 + Release 流水线
├── src-tauri                    # Tauri 桌面壳配置与入口
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/default.json
│   └── src/main.rs
├── src
│   ├── main.jsx        # 应用入口
│   ├── App.jsx         # 页面与全部业务交互
│   ├── api.js          # OpenAI 兼容接口调用
│   ├── store.js        # localStorage 读写与默认配置
│   └── index.css       # 全局样式
└── vite.config.js
```

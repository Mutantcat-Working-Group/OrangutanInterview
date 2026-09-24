# 本地面试题随机工具

一个基于 React + Ant Design 的纯前端面试刷题工具。题库、API Key、API 地址全部只保存在当前浏览器的 localStorage，不经过任何后端；只有点击「查看答案」时才直接调用你配置的 OpenAI 兼容接口。

## 功能特性

- 本地题库管理：逐条添加、编辑、删除、分类筛选、按难度筛选、关键词搜索
- 批量导入：支持一行一题、`题目 | 分类`、`题目 | 分类 | 难度` 以及 JSON 数组
- 题库导出：一键导出为 JSON 文件；「示例题库」可追加 3 道示例题快速体验
- Anki 式随机练习：随机抽题 / 重新洗牌，卡片正面只显示题目，点击「显示答案」才翻面查看答案
- AI 答案：调用自定义 OpenAI 兼容接口生成答案，支持流式输出、系统和温度/Token 参数配置
- Markdown 渲染：AI 答案支持标题、列表、代码块、表格等 GFM 语法
- 答案缓存：已生成的 AI 答案保存在本地，再次查看无需重复请求
- 掌握度标记：用「忘记 / 困难 / 良好 / 简单」标记后自动切到下一张
- 隐私友好：API Key 只存在浏览器本地，可随时修改或一键清空本机数据

## 技术栈

- React 18 + Vite 5
- Ant Design 5 + @ant-design/icons
- react-markdown + remark-gfm

## 快速开始

```bash
npm install
npm run dev
```

浏览器访问 http://localhost:5173。

生产构建与本地预览：

```bash
npm run build
npm run preview
```

## 使用说明

1. 在「题库管理」中逐条添加面试题，或使用「批量导入」粘贴多行文本 / JSON 数组；也可以点击「示例题库」快速体验。
2. 点击「随机抽题」开始练习，右侧以 Anki 卡片形式展示：正面只有题目，点击「显示答案」后翻面，可左右切换卡片，并用「忘记 / 困难 / 良好 / 简单」标记掌握程度。
3. 点击「API 设置」，填入 OpenAI 兼容的接口地址、API Key 和模型名称，可先点「测试连接」校验配置。
4. 点击「显示答案」后才会调用模型接口，答案支持 Markdown 渲染并缓存到本机。

## 批量导入格式

逐行导入支持三种写法：

```text
纯题目文本
题目 | 分类
题目 | 分类 | 难度
```

JSON 导入支持字符串数组，或包含 `text`、`category`、`difficulty`、`source` 字段的对象数组。

## 数据存储

- 题库：`localStorage` 的 `iqr.questions.v1`
- API 设置：`localStorage` 的 `iqr.settings.v1`
- AI 答案：随题目一起保存在题库数据中

浏览器直接调用第三方接口时，接口服务端需要允许跨域（CORS），否则会提示生成失败。默认接口为 OpenAI 兼容格式：`{API 地址}/chat/completions`。

## 项目结构

```text
.
├── index.html
├── package.json
├── src
│   ├── main.jsx        # 应用入口
│   ├── App.jsx         # 页面与全部业务交互
│   ├── api.js          # OpenAI 兼容接口调用
│   ├── store.js        # localStorage 读写与默认配置
│   └── index.css       # 全局样式
└── vite.config.js
```

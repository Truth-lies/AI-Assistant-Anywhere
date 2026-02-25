# 📐 项目总体架构图

> 更新时间：2026 年 · 基于当前代码库分析

---

## 1. 系统分层架构

```mermaid
graph TB
    subgraph UI["🖥️ UI 层 (React Native / Expo Router)"]
        layout["_layout.tsx<br/>ErrorBoundary 包裹"]
        index["index.tsx<br/>主聊天界面<br/>快捷提示 · 动态打点"]
        settings["settings.tsx<br/>设置页面"]
        call["call.tsx<br/>通话页面"]
        rag_page["rag.tsx<br/>RAG 管理页面"]
        MB["MessageBubble.tsx<br/>消息气泡组件<br/>复制按钮 · 工具调用展示"]
        CI["ChatInput.tsx<br/>输入框组件<br/>多附件 · 发送/停止"]
        CD["ConversationDrawer.tsx<br/>会话侧栏<br/>批量删除"]
        EB["ErrorBoundary.tsx<br/>错误边界"]
    end

    subgraph State["🧠 状态管理层 (Zustand)"]
        store["store/index.ts<br/>全局状态 & 消息管线"]
    end

    subgraph Agent["🤖 Agent 智能层"]
        agent["agent.ts<br/>意图路由 & 工具调度<br/>图片/搜索/时间/对话"]
    end

    subgraph Services["⚙️ 服务层"]
        deepseek["deepseek.ts<br/>DeepSeek API 对接<br/>XHR SSE 流式"]
        webSearch["webSearch.ts<br/>DashScope Qwen<br/>enable_search"]
        imageGen["imageGen.ts<br/>qwen-image-max<br/>文生图 + 提示词优化"]
        voice["voice.ts<br/>语音服务"]
    end

    subgraph RAG["📚 RAG 层 (多层记忆)"]
        ragSpec["ragSpecialist.ts<br/>多层 RAG 专员<br/>感性/理性/历史/通用"]
        ragBase["rag.ts<br/>基础 RAG<br/>添加 & 搜索"]
        embedding["embedding.ts<br/>DashScope<br/>text-embedding-v3"]
        vectorSearch["vectorSearch.ts<br/>余弦相似度 TopK"]
    end

    subgraph Data["💾 数据层"]
        db["database.ts<br/>expo-sqlite<br/>会话/消息/RAG 表"]
    end

    subgraph Config["🔧 配置层"]
        models["models.ts<br/>模型预设"]
        theme["theme.ts<br/>主题常量"]
        types["types/index.ts<br/>类型定义"]
    end

    subgraph Tests["🧪 测试层"]
        t1["__tests__/utils/time.test.ts"]
        t2["__tests__/utils/vectorSearch.test.ts"]
        t3["__tests__/components/MessageBubble.test.ts"]
        setup["__tests__/setup.ts<br/>Jest + RN Mocks"]
    end

    UI --> State
    State --> Agent
    Agent --> Services
    Agent --> RAG
    Services --> Data
    RAG --> Data
    RAG --> embedding
    Config -.-> UI
    Config -.-> Services
    Config -.-> State
    Tests -.-> UI
    Tests -.-> RAG

    style UI fill:#E3F2FD,stroke:#1565C0
    style State fill:#FFF3E0,stroke:#EF6C00
    style Agent fill:#F3E5F5,stroke:#7B1FA2
    style Services fill:#E8F5E9,stroke:#2E7D32
    style RAG fill:#FCE4EC,stroke:#C62828
    style Data fill:#ECEFF1,stroke:#37474F
    style Config fill:#FFFDE7,stroke:#F9A825
    style Tests fill:#F1F8E9,stroke:#558B2F
```

---

## 2. 文件 / 模块依赖关系

```mermaid
graph LR
    subgraph App["Expo Router 页面"]
        A1["_layout.tsx"]
        A2["index.tsx"]
        A3["settings.tsx"]
        A4["call.tsx"]
        A5["rag.tsx"]
    end

    subgraph Comp["组件"]
        C1["MessageBubble<br/>复制/下载/工具调用"]
        C2["ChatInput<br/>多附件/发送/停止"]
        C3["ConversationDrawer"]
        C4["ErrorBoundary"]
    end

    subgraph Store
        S1["store/index.ts"]
    end

    subgraph Srv["服务"]
        SV1["agent.ts"]
        SV2["deepseek.ts"]
        SV3["webSearch.ts"]
        SV4["imageGen.ts"]
        SV5["voice.ts"]
    end

    subgraph RagSrv["RAG 服务"]
        R1["ragSpecialist.ts"]
        R2["rag.ts"]
        R3["embedding.ts"]
    end

    subgraph Utils
        U1["vectorSearch.ts"]
        U2["markdown.ts"]
        U3["fileUtils.ts"]
        U4["time.ts"]
    end

    subgraph DB
        D1["database.ts"]
    end

    A1 --> C4
    A2 --> S1
    A2 --> C1
    A2 --> C2
    A2 --> C3
    A3 --> S1
    A5 --> S1

    S1 --> SV1
    S1 --> SV2
    S1 --> R1
    S1 --> R2
    S1 --> D1

    SV1 --> SV2
    SV1 --> SV3
    SV1 --> SV4

    R1 --> R2
    R1 --> R3
    R1 --> D1
    R2 --> R3
    R2 --> D1
    R3 -.-> U1

    C1 --> U2

    style App fill:#E3F2FD
    style Comp fill:#E0F7FA
    style Store fill:#FFF3E0
    style Srv fill:#E8F5E9
    style RagSrv fill:#FCE4EC
    style Utils fill:#F3E5F5
    style DB fill:#ECEFF1
```

---

## 3. 技术栈清单

| 层级 | 技术 | 用途 |
|------|------|------|
| 框架 | React Native + Expo SDK 54 | 跨平台移动应用 |
| 路由 | Expo Router (文件系统路由) | 页面导航 |
| 状态 | Zustand | 全局状态管理 |
| 数据库 | expo-sqlite | 本地 SQLite 持久存储 |
| LLM | DeepSeek API (OpenAI 兼容) | 主对话模型 |
| 搜索 | Aliyun DashScope (Qwen + enable_search) | 联网搜索增强 |
| 图片 | Aliyun DashScope (qwen-image-max) | AI 文生图 + LLM 提示词优化 |
| 嵌入 | Aliyun DashScope (text-embedding-v3 / qwen3-vl-embedding) | 文本/非文本向量化双路 |
| 视觉 | Aliyun DashScope (qwen-vl-max) | 图片理解（可串联联网搜索） |
| 流式 | XHR + SSE 手动解析 | 流式对话 (RN 不支持 ReadableStream) |
| Markdown | react-native-markdown-display | AI 回复渲染 |
| 语音 | expo-speech / expo-av | TTS / STT |
| 剪贴板 | expo-clipboard | AI 消息一键复制 |
| 动画 | React Native Animated API | 打点加载指示器 |

---

## 4. 主要 UI 交互改进（2026）

| 功能 | 说明 | 对标 |
|------|------|------|
| 动态打点指示器 | 三点弹跳动画替代静态"AI正在思考..." | ChatGPT / Claude |
| AI 消息复制按钮 | 每条 AI 消息气泡下方显示「复制」按钮，点击后变「✓ 已复制」 | ChatGPT / Kimi / 豆包 |
| 快捷提示语 | 空聊天状态展示 4 个示例提示（配置 API Key 后显示），一键发送 | ChatGPT / Claude |
| 多附件发送 | 同一轮可混合发送多张图片 + 多个文件 | 豆包 / Kimi |
| 批量删除对话 | 侧栏编辑模式 + 全选批量删除 | 主流 AI App |

---

## 5. 测试覆盖

| 测试文件 | 覆盖内容 | 用例数 |
|---------|---------|--------|
| `__tests__/utils/time.test.ts` | 时间快照、时间锚点注入、意图检测 | 13 |
| `__tests__/utils/vectorSearch.test.ts` | 余弦相似度、TopK 检索 | 12 |
| `__tests__/components/MessageBubble.test.ts` | Markdown 图片语法过滤 | 7 |
| 合计 | — | **32** |

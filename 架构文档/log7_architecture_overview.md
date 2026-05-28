# 📐 项目总体架构图

> 版本：V2.1（2026-05） · 基于当前代码库分析

---

## 1. 系统分层架构

```mermaid
graph TB
    subgraph UI["🖥️ UI 层 (React Native / Expo Router)"]
        layout["_layout.tsx<br/>ErrorBoundary 包裹"]
        index["index.tsx<br/>主聊天界面"]
        settings["settings.tsx<br/>设置页面"]
        call["call.tsx<br/>通话页面"]
        rag_page["rag.tsx<br/>RAG 管理页面"]
        MB["MessageBubble.tsx<br/>消息气泡组件"]
        CI["ChatInput.tsx<br/>输入框组件"]
        CD["ConversationDrawer.tsx<br/>会话侧栏"]
        EB["ErrorBoundary.tsx<br/>错误边界"]
    end

    subgraph State["🧠 状态管理层 (Zustand)"]
        store["store/index.ts<br/>全局状态 & 消息管线"]
    end

    subgraph Agent["🤖 Agent 智能层"]
        agent["agent.ts<br/>意图路由 & 工具调度"]
    end

    subgraph Services["⚙️ 服务层"]
        deepseek["deepseek.ts<br/>DeepSeek API 对接<br/>XHR SSE 流式"]
        webSearch["webSearch.ts<br/>DashScope Qwen<br/>enable_search"]
        imageGen["imageGen.ts<br/>qwen-image-max<br/>文生图"]
        voice["voice.ts<br/>语音服务"]
    end

    subgraph RAG["📚 RAG 层 (多层记忆)"]
        ragSpec["ragSpecialist.ts<br/>多层 RAG 专员<br/>感性/理性/历史/通用"]
        ragBase["rag.ts<br/>基础 RAG<br/>添加 & 搜索"]
        embedding["embedding.ts<br/>DashScope<br/>text-embedding-v3 / qwen3-vl-embedding"]
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

    style UI fill:#E3F2FD,stroke:#1565C0
    style State fill:#FFF3E0,stroke:#EF6C00
    style Agent fill:#F3E5F5,stroke:#7B1FA2
    style Services fill:#E8F5E9,stroke:#2E7D32
    style RAG fill:#FCE4EC,stroke:#C62828
    style Data fill:#ECEFF1,stroke:#37474F
    style Config fill:#FFFDE7,stroke:#F9A825
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
        C1["MessageBubble"]
        C2["ChatInput"]
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
| 图片 | Aliyun DashScope (qwen-image-max) | AI 文生图 |
| 嵌入 | Aliyun DashScope (text-embedding-v3 / qwen3-vl-embedding) | 文本与非文本向量化 |
| 视觉 | Aliyun DashScope (qwen-vl-max) | 图片理解 |
| 流式 | XHR + SSE 手动解析 | 流式对话 (RN 不支持 ReadableStream) |
| Markdown | react-native-markdown-display | AI 回复渲染 |
| 语音 | expo-speech / expo-av | TTS / STT |

---

## 4. 聊天 UI 视觉分层（V2.1）

```mermaid
graph TD
    A["index.tsx 主聊天页"] --> B["顶部导航层<br/>标题 + 次级品牌文案 + 新建入口"]
    A --> C["内容层<br/>消息列表 / 空状态卡片"]
    C --> C1["空状态卡片<br/>头像 + 能力标签 + 设置引导按钮"]
    A --> D["反馈层<br/>AI 思考指示胶囊"]
    A --> E["输入层<br/>ChatInput 胶囊输入区 + 附件标签区"]
    E --> E1["附件标签<br/>图像/文件统一 chip 样式"]
    E --> E2["操作按钮<br/>添加附件 + 发送/停止"]
```

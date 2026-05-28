# 📚 多层 RAG 记忆架构

> V2.0：ragSpecialist.ts + rag.ts + embedding.ts + vectorSearch.ts + database.ts

---

## 1. 四层记忆系统总览

```mermaid
graph TB
    subgraph Input["用户查询"]
        Q["query: 用户当前消息"]
    end

    subgraph Layers["四层记忆检索 (multiLayerSearch)"]
        direction TB
        L1["💗 感性层 (emotional)<br/>情感标签 + 情感印记<br/>阈值: 0.65"]
        L2["🧠 理性层 (rational)<br/>知识要点 + 分析摘要<br/>阈值: 0.70"]
        L3["📜 历史层 (historical)<br/>时间轴事件 + 关键决策<br/>阈值: 0.60"]
        L4["📦 通用层 (general)<br/>原始对话 RAG<br/>阈值: 0.55"]
    end

    subgraph Process["检索流程"]
        EMB["按分组模型向量化 query<br/>text-embedding-v3 / qwen3-vl-embedding"]
        VS["余弦相似度 TopK<br/>vectorSearch.ts"]
        FILTER["相似度阈值过滤"]
    end

    subgraph Output["buildRagContext()"]
        CTX["组装 RAG 上下文<br/>注入 system prompt<br/>附命中原因/来源/分数"]
    end

    Q --> EMB
    EMB --> VS
    VS --> L1
    VS --> L2
    VS --> L3
    VS --> L4
    L1 --> FILTER
    L2 --> FILTER
    L3 --> FILTER
    L4 --> FILTER
    FILTER --> CTX

    style L1 fill:#FCE4EC,stroke:#C62828
    style L2 fill:#E3F2FD,stroke:#1565C0
    style L3 fill:#FFF3E0,stroke:#EF6C00
    style L4 fill:#E8F5E9,stroke:#2E7D32
```

---

## 1.1 检索可解释增强（2026-05）

- `multiLayerSearch` 现为每条召回结果增加：
  - `hitReason`（命中原因）
  - `sourceId`（来源标识）
  - `embeddingModel`（命中向量模型）
- `buildRagContext` 在注入 system prompt 前，会输出：
  - 命中原因（层级语义 + 权重）
  - 引用信息（来源、embedding 模型、score）
- 目标：让回答依据可追踪，便于后续做“记忆治理（编辑/删除/纠偏）”。

---

## 2. 对话后处理更新流程 (postConversationUpdate)

```mermaid
sequenceDiagram
    participant S as Store
    participant RS as ragSpecialist.ts
    participant DS as DeepSeek API
    participant EMB as embedding.ts
    participant DB as database.ts

    Note over S: 消息发送完成后<br/>后台异步调用

    S->>RS: postConversationUpdate(last6Messages, settings)
    
    par 并行三层分析
        RS->>DS: analyzeEmotional(对话内容)<br/>prompt: 提取情感标签
        DS-->>RS: 情感分析结果
    and
        RS->>DS: analyzeRational(对话内容)<br/>prompt: 提取知识要点
        DS-->>RS: 理性分析结果
    and
        RS->>DS: analyzeHistorical(对话内容)<br/>prompt: 提取时间轴事件
        DS-->>RS: 历史分析结果
    end

    loop 每层分析结果
        RS->>EMB: getEmbeddings([分析文本])<br/>text-embedding-v3
        EMB-->>RS: float[] 向量
        RS->>DB: INSERT INTO rag_entries<br/>(layer, content, embedding, metadata)
    end

    Note over RS: 三层记忆更新完成
```

---

## 3. 基础 RAG 存储流程 (addChatToRag)

```mermaid
flowchart TD
    MSGS["对话消息对<br/>[userMsg, aiMsg]"] --> FORMAT["合并格式化为单条文本<br/>User: xxx\nAssistant: xxx"]
    FORMAT --> BATCH["批量嵌入<br/>getEmbeddings([text])<br/>text-embedding-v3"]
    BATCH --> STORE["存入 rag_entries 表<br/>layer: 'general'<br/>content: 合并文本<br/>embedding: JSON float[]"]

    style MSGS fill:#E3F2FD
    style BATCH fill:#FFF3E0
    style STORE fill:#E8F5E9
```

---

## 3.1 多格式文件入库流程（rag.tsx + knowledgeIngest.ts）

```mermaid
flowchart TD
    PICK["选择文件\n文本 / PDF / 图片"] --> KIND{"文件类型判断"}
    KIND -->|文本| TXT["readTextFileSafely\n读取正文"]
    KIND -->|PDF| PDF["readPdfTextSafely\n轻量解析 BT/ET 文本块"]
    KIND -->|图片| IMG["快速入库：qwen3-vl-embedding\n直接图像向量化（不做 qwen-vl-max OCR）"]

    TXT --> MERGE["补充来源元信息\n文件名 + MIME"]
    PDF --> MERGE
    IMG --> MERGE

    MERGE --> CHUNK{"分块策略"}
    CHUNK -->|Markdown| MDCHUNK["chunkMarkdown"]
    CHUNK -->|其他文本| TXCHUNK["chunkText"]
    MDCHUNK --> EMB["按类型向量化：文本 text-embedding-v3 / 非文本 qwen3-vl-embedding"]
    TXCHUNK --> EMB
    EMB --> DB["写入 rag chunks\nsource=upload, layer=general"]
```

说明：
- 批量导入按文件逐个处理，单文件失败不会阻断整体导入。
- PDF 为轻量文本提取，扫描版 PDF 可能无正文；此时仅保留元信息并给出提示。
- 图片入库依赖 DashScope Key，通过视觉模型提取文本后再进行 embedding。

---

## 4. 向量检索详解

```mermaid
flowchart TD
    QUERY["查询文本"] --> Q_EMB["getEmbeddings([query])<br/>→ queryVector: float[]"]
    Q_EMB --> LOAD["从 DB 加载指定 layer<br/>的所有 rag_entries"]
    LOAD --> PARSE["JSON.parse(embedding)<br/>→ entryVector: float[]"]
    PARSE --> COS["cosineSimilarity(queryVec, entryVec)<br/>= dot(A,B) / (|A| × |B|)"]
    COS --> SORT["按相似度降序排列"]
    SORT --> TOPK["取 Top K (默认 5)"]
    TOPK --> THRESH["过滤低于阈值的结果<br/>emotional: 0.65<br/>rational: 0.70<br/>historical: 0.60<br/>general: 0.55"]
    THRESH --> RESULT["返回 RagResult[]<br/>{content, score, layer, metadata}"]

    style QUERY fill:#E3F2FD
    style COS fill:#F3E5F5
    style THRESH fill:#FCE4EC
    style RESULT fill:#C8E6C9
```

---

## 5. Embedding 服务架构

```mermaid
flowchart LR
    subgraph Input
        T1["文本1"]
        T2["文本2"]
        TN["..."]
    end

    subgraph Batch["批量处理 (≤25 条/批)"]
        TRUNCATE["截断: 每条 ≤ 2000 字"]
        SPLIT["按 25 条分批"]
    end

    subgraph API["DashScope API"]
        REQ["POST /compatible-mode/v1/embeddings<br/>model: text-embedding-v3（文本）<br/>input: [texts]<br/>dimensions: 1024<br/>encoding_format: float"]
    end

    subgraph Output
        V1["vector1: float[1024]"]
        V2["vector2: float[1024]"]
        VN["..."]
    end

    T1 --> TRUNCATE
    T2 --> TRUNCATE
    TN --> TRUNCATE
    TRUNCATE --> SPLIT
    SPLIT --> REQ
    REQ --> V1
    REQ --> V2
    REQ --> VN

    style Input fill:#E3F2FD
    style Batch fill:#FFF3E0
    style API fill:#E8F5E9
    style Output fill:#F3E5F5
```

---

## 6. 数据库 RAG 表结构

```mermaid
erDiagram
    RAG_ENTRIES {
        INTEGER id PK
        TEXT conversation_id FK
        TEXT layer "emotional | rational | historical | general"
        TEXT content "存储的文本内容"
        TEXT embedding "JSON序列化的float[]向量"
        TEXT metadata "JSON附加元数据"
        INTEGER created_at "Unix时间戳"
    }

    CONVERSATIONS {
        TEXT id PK
        TEXT title
        INTEGER created_at
        INTEGER updated_at
    }

    MESSAGES {
        TEXT id PK
        TEXT conversation_id FK
        TEXT role "user | assistant | system"
        TEXT content
        TEXT type "text | image"
        TEXT tool_calls "JSON ToolCallRecord[]"
        TEXT search_results "JSON WebSearchResult[]"
        TEXT generated_image_url
        INTEGER created_at
    }

    CONVERSATIONS ||--o{ MESSAGES : "has many"
    CONVERSATIONS ||--o{ RAG_ENTRIES : "generates"
```

// ==================== 数据模型 ====================

/** 对话会话 */
export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

/** 聊天消息 */
export interface MessageAttachment {
  kind: 'image' | 'file';
  uri: string;
  name: string;
  mimeType?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  type: 'text' | 'voice' | 'image' | 'file';
  imageUri?: string;
  fileUri?: string;
  fileName?: string;
  fileMimeType?: string;
  /** 多附件（用于多图/多文件一轮发送） */
  attachments?: MessageAttachment[];
  /** Agent 工具调用记录 */
  toolCalls?: ToolCallRecord[];
  /** 搜索结果（联网搜索时） */
  searchResults?: WebSearchResult[];
  /** 生成的图片URL */
  generatedImageUrl?: string;
  createdAt: number;
}

// ==================== RAG 多层体系 ====================

/** RAG 层级类型 */
export type RagLayer = 'emotional' | 'rational' | 'historical' | 'general';

/** RAG 文本块 */
export interface RagChunk {
  id: string;
  source: 'chat' | 'upload' | 'import';
  sourceId: string;
  content: string;
  embedding: number[] | null;
  /** 该块使用的 embedding 模型 */
  embeddingModel?: string;
  /** RAG 层级 */
  layer: RagLayer;
  createdAt: number;
}

/** RAG 搜索结果 */
export interface RagSearchResult {
  id: string;
  content: string;
  score: number;
  source: string;
  sourceId?: string;
  createdAt?: number;
  embeddingModel?: string;
  hitReason?: string;
  layer: RagLayer;
}

// ==================== AI Agent ====================

/** Agent 可用工具类型 */
export type AgentToolType =
  | 'web_search'
  | 'image_gen'
  | 'rag_query'
  | 'time_now'
  | 'vision_analyze';

/** 工具调用记录 */
export interface ToolCallRecord {
  tool: AgentToolType;
  input: string;
  output: string;
  timestamp: number;
}

/** Agent 函数定义（OpenAI function calling 格式） */
export interface AgentToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

// ==================== 联网搜索 ====================

/** 网页搜索结果 */
export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

// ==================== 图片生成 ====================

/** 图片生成结果 */
export interface ImageGenResult {
  url: string;
  revisedPrompt?: string;
}

// ==================== 应用设置 ====================

/** 应用设置 */
export interface AppSettings {
  // ── 🤖 对话模型配置 ──
  deepseekApiKey: string;
  deepseekBaseUrl: string;
  deepseekModel: string;
  temperature: number;
  maxTokens: number;
  // ── 📊 Embedding 模型配置 ──
  dashscopeApiKey: string;
  /** 视觉识别模型（图片理解） */
  visionModel: string;
  /** 兼容旧逻辑：默认 embedding 模型（历史字段） */
  embeddingModel: string;
  /** RAG 文本输入使用的 embedding 模型 */
  ragTextEmbeddingModel: string;
  /** RAG 非文本输入（图片/PDF等）使用的 embedding 模型 */
  ragNonTextEmbeddingModel: string;
  // ── 📚 RAG 配置 ──
  ragTopK: number;
  chunkSize: number;
  chunkOverlap: number;
  // ── 🔍 联网搜索配置 ──
  webSearchEnabled: boolean;
  baiduQianfanApiKey: string;
  // ── 🎨 图片生成配置 ──
  imageGenEnabled: boolean;
  // ── 🧠 Agent 配置 ──
  agentEnabled: boolean;
  // ── 🎨 通用配置 ──
  theme: 'light' | 'dark' | 'auto';
  userDisplayName: string;
  userAvatarEmoji: string;
  userBubbleStyle: 'lavender' | 'mint' | 'rose' | 'slate';
  voiceEnabled: boolean;
  autoSaveToRag: boolean;
  systemPrompt: string;
}

/** 默认设置 */
export const DEFAULT_SETTINGS: AppSettings = {
  deepseekApiKey: '',
  deepseekBaseUrl: 'https://api.deepseek.com',
  deepseekModel: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 4096,
  dashscopeApiKey: '',
  visionModel: 'qwen-vl-max',
  embeddingModel: 'text-embedding-v3',
  ragTextEmbeddingModel: 'text-embedding-v3',
  ragNonTextEmbeddingModel: 'qwen3-vl-embedding',
  ragTopK: 5,
  chunkSize: 500,
  chunkOverlap: 50,
  webSearchEnabled: true,
  baiduQianfanApiKey: '',
  imageGenEnabled: true,
  agentEnabled: true,
  theme: 'auto',
  userDisplayName: '我',
  userAvatarEmoji: '🙂',
  userBubbleStyle: 'lavender',
  voiceEnabled: true,
  autoSaveToRag: true,
  systemPrompt: '你是一个智能随身助手，请用中文回答用户的问题。你具有联网搜索能力（可查询实时新闻和最新信息）和图片生成能力（可根据描述创建图片）。\n\n【重要格式要求】\n1. 如果需要输出数学公式，请务必使用 Markdown 的数学公式语法：行内公式使用 $...$，独立公式块使用 $$...$$。绝对不要输出完整的 LaTeX 文档代码（如 \\begin{document} 等）。\n2. 如果需要输出图表，请使用 Markdown 的 mermaid 代码块。\n\n你可以参考以下相关上下文来回答：',
};

/** 聊天模式 */
export type ChatMode = 'text' | 'voice';

/** Chat Completion 选项 */
export interface ChatCompletionOptions {
  messages: ApiMessage[];
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  onStream?: StreamCallback;
}

/** 导出数据格式 */
export interface ExportData {
  version: string;
  exportedAt: number;
  conversations: Conversation[];
  messages: Message[];
  ragChunks: RagChunk[];
  settings: Partial<AppSettings>;
}

/** DeepSeek API 消息格式 */
export interface ApiMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ApiMessageContent[] | null;
  /** 函数调用（assistant 角色） */
  tool_calls?: any[];
  /** 工具调用 ID（tool 角色） */
  tool_call_id?: string;
}

export interface ApiMessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

/** 流式响应回调 */
export type StreamCallback = (chunk: string, done: boolean) => void;

/**
 * RAG 专员 - 多层记忆管理系统
 * 
 * 三层 RAG 架构：
 * ┌──────────────┬─────────────────────────────────────────────────┐
 * │ 感性层        │ 从最近对话中提取情感/态度，滚动更新，保持最新状态      │
 * │ (emotional)   │ 每次分析后删除早期数据，只保留最新情感分析            │
 * ├──────────────┼─────────────────────────────────────────────────┤
 * │ 理性层        │ 从全部内容中多次总结，构建用户画像/人设              │
 * │ (rational)    │ 每次需将过去的理性模块整体输入后更新得出完整版本       │
 * ├──────────────┼─────────────────────────────────────────────────┤
 * │ 历史层        │ 所有聊天历史处理后的内容                           │
 * │ (historical)  │ 作为长期记忆存储                                 │
 * └──────────────┴─────────────────────────────────────────────────┘
 */

import * as Crypto from 'expo-crypto';
import { getEmbedding, getBatchEmbeddings } from './embedding';
import { chatCompletion } from './deepseek';
import {
  addRagChunks,
  getAllRagChunksWithEmbeddings,
  getRagChunksByLayer,
  clearOldRagChunks,
  replaceRagLayer,
  updateChunkEmbedding,
} from './database';
import { findTopK } from '../utils/vectorSearch';
import { chunkText } from '../utils/markdown';
import { resolveRagEmbeddingModel } from './rag';
import type {
  RagChunk,
  RagLayer,
  RagSearchResult,
  Message,
  AppSettings,
  ApiMessage,
} from '../types';

// ==================== 多层检索 ====================

/**
 * 多层 RAG 检索
 * 从三个层级 + 通用层中综合检索最相关的内容
 */
export async function multiLayerSearch(
  query: string,
  settings: AppSettings,
  topK: number = 5,
): Promise<RagSearchResult[]> {
  if (!settings.dashscopeApiKey) return [];

  try {
    const results: RagSearchResult[] = [];

    // 各层分配检索数量
    const layerConfig: { layer: RagLayer | undefined; k: number; boost: number; reason: string }[] = [
    { layer: 'emotional', k: 2, boost: 1.1, reason: '命中用户近期情绪状态' },  // 感性层优先
    { layer: 'rational', k: 2, boost: 1.2, reason: '命中长期用户画像偏好' },   // 理性层最高优先
    { layer: 'historical', k: 3, boost: 1.0, reason: '命中历史对话语义' },  // 历史层
    { layer: undefined, k: 3, boost: 0.9, reason: '命中知识库通用内容' },     // 通用层（包含所有）
    ];

    for (const config of layerConfig) {
      const chunks = await getAllRagChunksWithEmbeddings(config.layer);
      if (chunks.length === 0) continue;

      // 关键：按 embedding 模型分组检索，避免 text / vl 向量维度不一致导致分数为 0
      const modelGroups = new Map<string, typeof chunks>();
      for (const chunk of chunks) {
        const model = chunk.embeddingModel || resolveRagEmbeddingModel(settings, 'text');
        const list = modelGroups.get(model) || [];
        list.push(chunk as any);
        modelGroups.set(model, list);
      }

      for (const [model, group] of modelGroups.entries()) {
        try {
          const queryEmbedding = await getEmbedding(
            query,
            settings.dashscopeApiKey,
            model,
          );
          const layerResults = findTopK(queryEmbedding, group as any, config.k);
          results.push(
            ...layerResults.map((r) => ({
              id: r.id,
              content: r.content,
              score: r.score * config.boost, // 层级加权
              source: r.source || 'rag',
              sourceId: r.sourceId,
              createdAt: r.createdAt,
              embeddingModel: model,
              hitReason: `${config.reason}（层级权重 x${config.boost.toFixed(2)}）`,
              layer: (config.layer || 'general') as RagLayer,
            })),
          );
        } catch (embErr: any) {
          console.warn(`[RAG] 跳过模型 ${model} 的检索（embedding失败）:`, embErr?.message || embErr);
        }
      }
    }

    // 按分数排序，去重，取 top K
    const seen = new Set<string>();
    return results
      .sort((a, b) => b.score - a.score)
      .filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      })
      .slice(0, topK);
  } catch (error) {
    console.error('多层 RAG 检索失败:', error);
    return [];
  }
}

/**
 * 构建多层上下文字符串
 * 为 AI Agent 提供结构化的记忆上下文
 */
export function buildRagContext(results: RagSearchResult[]): string {
  if (results.length === 0) return '';

  const layerNames: Record<string, string> = {
    emotional: '💗 情感记忆',
    rational: '🧠 用户画像',
    historical: '📖 历史记忆',
    general: '📚 知识库',
  };

  // 按层级分组
  const grouped: Record<string, RagSearchResult[]> = {};
  for (const r of results) {
    const key = r.layer || 'general';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }

  const parts: string[] = [];
  for (const [layer, items] of Object.entries(grouped)) {
    const name = layerNames[layer] || layer;
    const content = items.map((r, i) => {
      const refParts = [
        r.sourceId ? `来源=${r.sourceId}` : '',
        r.embeddingModel ? `embedding=${r.embeddingModel}` : '',
        Number.isFinite(r.score) ? `score=${r.score.toFixed(3)}` : '',
      ].filter(Boolean);
      const reasonLine = r.hitReason ? `\n      ↳ 命中原因：${r.hitReason}` : '';
      const refLine = refParts.length ? `\n      ↳ 引用：${refParts.join(' | ')}` : '';
      return `  [${i + 1}] ${r.content}${reasonLine}${refLine}`;
    }).join('\n');
    parts.push(`【${name}】\n${content}`);
  }

  return parts.join('\n\n');
}

// ==================== 感性层管理 ====================

/**
 * 分析对话的情感内容并更新感性层
 * 每次分析后删除早期情感数据，只保留最新的
 */
export async function updateEmotionalLayer(
  recentMessages: Message[],
  settings: AppSettings,
): Promise<void> {
  if (!settings.dashscopeApiKey || !settings.deepseekApiKey) return;
  if (recentMessages.length === 0) return;

  try {
    // 用 AI 分析最近对话的情感
    const conversationText = recentMessages
      .map((m) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content.slice(0, 200)}`)
      .join('\n');

    const analysisMessages: ApiMessage[] = [
      {
        role: 'system',
        content: `你是一个情感分析专家。请分析以下对话中用户的情感状态、态度、情绪变化。
输出要求：
1. 用简洁的文字描述用户当前的情感状态
2. 包含情绪关键词（如：开心、焦虑、好奇、困惑等）
3. 描述用户对AI的态度
4. 不超过200字`,
      },
      { role: 'user', content: conversationText },
    ];

    const emotionalAnalysis = await chatCompletion(
      analysisMessages,
      settings.deepseekApiKey,
      settings.deepseekBaseUrl,
      settings.deepseekModel,
      undefined,
      0.3,
      500,
    );

    if (!emotionalAnalysis.trim()) return;

    // 创建新的感性层 RAG 块
    const id = Crypto.randomUUID();
    const chunk: RagChunk = {
      id,
      source: 'chat',
      sourceId: 'emotional_analysis',
      content: `[情感分析 ${new Date().toLocaleString('zh-CN')}] ${emotionalAnalysis}`,
      embedding: null,
      embeddingModel: resolveRagEmbeddingModel(settings, 'text'),
      layer: 'emotional',
      createdAt: Date.now(),
    };

    await addRagChunks([chunk]);

    // 计算 embedding
    try {
      const embedding = await getEmbedding(
        chunk.content,
        settings.dashscopeApiKey,
        resolveRagEmbeddingModel(settings, 'text'),
      );
      await updateChunkEmbedding(id, embedding, resolveRagEmbeddingModel(settings, 'text'));
    } catch (embErr) {
      console.warn('[RAG] 感性层 embedding 失败:', embErr);
    }

    // 滚动更新：只保留最近 10 条情感分析
    await clearOldRagChunks('emotional', 10);
  } catch (error) {
    console.error('感性层更新失败:', error);
  }
}

// ==================== 理性层管理 ====================

/**
 * 更新理性层（用户画像）
 * 将过去的理性层内容 + 新对话整体输入，生成更新的完整用户画像
 */
export async function updateRationalLayer(
  recentMessages: Message[],
  settings: AppSettings,
): Promise<void> {
  if (!settings.dashscopeApiKey || !settings.deepseekApiKey) return;
  if (recentMessages.length === 0) return;

  try {
    // 获取现有的理性层内容
    const existingRational = await getRagChunksByLayer('rational');
    const existingProfile = existingRational
      .map((c) => c.content)
      .join('\n');

    // 新对话内容
    const newConversation = recentMessages
      .map((m) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content.slice(0, 300)}`)
      .join('\n');

    const analysisMessages: ApiMessage[] = [
      {
        role: 'system',
        content: `你是用户画像分析专家。你需要基于现有的用户画像和新的对话，更新并输出一份完整的用户画像。

要求：
1. 整合现有画像和新对话中的信息
2. 包括：用户的兴趣爱好、专业领域、交流风格、常见需求、性格特点
3. 保持客观、简洁
4. 如果新对话没有提供新信息，保持原有画像不变
5. 输出完整的更新后画像（不是增量更新）
6. 控制在500字以内`,
      },
      {
        role: 'user',
        content: `【现有用户画像】\n${existingProfile || '（暂无）'}\n\n【新对话内容】\n${newConversation}`,
      },
    ];

    const updatedProfile = await chatCompletion(
      analysisMessages,
      settings.deepseekApiKey,
      settings.deepseekBaseUrl,
      settings.deepseekModel,
      undefined,
      0.3,
      1000,
    );

    if (!updatedProfile.trim()) return;

    // 分块并替换理性层
    const chunks = chunkText(updatedProfile, 500, 50);
    const ragChunks: RagChunk[] = [];

    for (const text of chunks) {
      ragChunks.push({
        id: Crypto.randomUUID(),
        source: 'chat',
        sourceId: 'user_profile',
        content: `[用户画像] ${text}`,
        embedding: null,
        embeddingModel: resolveRagEmbeddingModel(settings, 'text'),
        layer: 'rational',
        createdAt: Date.now(),
      });
    }

    // 整体替换理性层
    await replaceRagLayer('rational', ragChunks);

    // 计算 embedding
    try {
      const texts = ragChunks.map((c) => c.content);
      const embeddings = await getBatchEmbeddings(
        texts,
        settings.dashscopeApiKey,
        resolveRagEmbeddingModel(settings, 'text'),
      );
      for (let i = 0; i < ragChunks.length; i++) {
        if (embeddings[i] && embeddings[i].length > 0) {
          await updateChunkEmbedding(
            ragChunks[i].id,
            embeddings[i],
            resolveRagEmbeddingModel(settings, 'text'),
          );
        }
      }
    } catch (embErr) {
      console.warn('[RAG] 理性层 embedding 失败:', embErr);
    }
  } catch (error) {
    console.error('理性层更新失败:', error);
  }
}

// ==================== 历史层管理 ====================

/**
 * 将对话保存到历史层
 * 所有聊天历史经处理后存储
 */
export async function addToHistoricalLayer(
  messages: Message[],
  settings: AppSettings,
): Promise<void> {
  if (!settings.dashscopeApiKey) return;
  if (messages.length === 0) return;

  try {
    // 格式化消息
    const text = messages
      .map((m) => {
        const role = m.role === 'user' ? '用户' : 'AI';
        const time = new Date(m.createdAt).toLocaleString('zh-CN');
        return `[${time}] ${role}: ${m.content}`;
      })
      .join('\n');

    // 分块
    const chunks = chunkText(text, 500, 50);
    const ragChunks: RagChunk[] = [];

    for (const content of chunks) {
      ragChunks.push({
        id: Crypto.randomUUID(),
        source: 'chat',
        sourceId: messages[0]?.conversationId || 'unknown',
        content,
        embedding: null,
        embeddingModel: resolveRagEmbeddingModel(settings, 'text'),
        layer: 'historical',
        createdAt: Date.now(),
      });
    }

    await addRagChunks(ragChunks);

    // 异步计算 embedding
    try {
      const texts = ragChunks.map((c) => c.content);
      const embeddings = await getBatchEmbeddings(
        texts,
        settings.dashscopeApiKey,
        resolveRagEmbeddingModel(settings, 'text'),
      );
      for (let i = 0; i < ragChunks.length; i++) {
        if (embeddings[i] && embeddings[i].length > 0) {
          await updateChunkEmbedding(
            ragChunks[i].id,
            embeddings[i],
            resolveRagEmbeddingModel(settings, 'text'),
          );
        }
      }
    } catch (err) {
      console.warn('[RAG] 历史层 embedding 计算失败:', err);
    }
  } catch (error) {
    console.error('历史层保存失败:', error);
  }
}

/**
 * 对话结束后的后处理
 * 同时更新三个层级
 */
export async function postConversationUpdate(
  recentMessages: Message[],
  settings: AppSettings,
): Promise<void> {
  // 并行更新三个层（互不依赖）
  await Promise.allSettled([
    updateEmotionalLayer(recentMessages, settings),
    addToHistoricalLayer(recentMessages, settings),
  ]);

  // 理性层更新成本较高：降频执行（至少 8 条消息且用户轮次为偶数）
  const totalMsgCount = recentMessages.length;
  const userTurns = recentMessages.filter((m) => m.role === 'user').length;
  if (totalMsgCount >= 8 && userTurns >= 4 && userTurns % 2 === 0) {
    await updateRationalLayer(recentMessages, settings).catch((err) =>
      console.error('理性层更新失败:', err),
    );
  }
}

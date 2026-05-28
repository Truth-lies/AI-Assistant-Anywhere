import type { AppSettings, ApiMessage } from '../types';
import { buildTimeContextLine } from '../utils/time';

const FORMAT_REQUIREMENT_HINT =
  '【格式要求】\n'
  + '1. 数学公式必须使用 Markdown 语法：行内公式用 $...$，独立公式块用 $$...$$。绝对不要输出完整的 LaTeX 文档代码（如 \\begin{document} 等）。\n'
  + '2. 图表请使用 Markdown 的 mermaid 代码块。';

export function shouldDescribePreviousGeneratedImage(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /刚才|上一张|上一个|前一张|刚生成|那张/.test(t)
    && /图|图片|照片|画/.test(t)
    && /描述|讲讲|分析|看看|解读|说说/.test(t);
}

export function buildSystemPromptWithContext(settings: AppSettings, ragContext: string): string {
  let systemPrompt = `${settings.systemPrompt}\n\n${buildTimeContextLine()}`;

  if (!systemPrompt.includes('$$')) {
    systemPrompt += `\n\n${FORMAT_REQUIREMENT_HINT}`;
  }

  if (ragContext) {
    systemPrompt += `\n\n以下是从多层记忆系统中检索到的相关内容：\n${ragContext}`;
  }

  return systemPrompt;
}

export function flattenApiUserText(message: ApiMessage, fallback = ''): string {
  if (typeof message.content === 'string') {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text || '')
      .join('\n')
      .trim() || fallback;
  }

  return fallback;
}

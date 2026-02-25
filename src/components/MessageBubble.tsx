/**
 * 聊天消息气泡组件
 */
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Modal, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store';
import { getUserBubbleColorByStyle, Typography } from '../constants/theme';
import { APP_AVATAR } from '../constants/branding';
import type { Message } from '../types';
import { saveImageToGallery } from '../utils/fileUtils';

interface Props {
  message: Message;
}

/** 移除 Markdown 图片语法，避免 react-native-markdown-display 的 key prop 崩溃 */
export function stripMarkdownImages(text: string): string {
  // 移除 ![alt](url) 格式
  return text.replace(/!\[[^\]]*\]\([^)]+\)/g, '').trim();
}

function MessageBubbleImpl({ message }: Props) {
  const colors = useTheme();
  const { userDisplayName, userAvatarEmoji, userBubbleStyle, theme } = useAppStore((s) => s.settings);
  const isUser = message.role === 'user';
  const [previewUri, setPreviewUri] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const isDark = theme === 'dark';
  const userBubbleColor = getUserBubbleColorByStyle(userBubbleStyle, isDark);

  const handleCopyText = async () => {
    if (!message.content) return;
    await Clipboard.setStringAsync(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bubbleStyle = isUser
    ? [styles.bubble, styles.userBubble, { backgroundColor: userBubbleColor }]
    : [styles.bubble, styles.aiBubble, { backgroundColor: colors.aiBubble, borderColor: colors.border }];

  const textColor = isUser ? colors.userBubbleText : colors.aiBubbleText;

  const mdStyles = {
    body: { color: textColor, fontSize: 16, lineHeight: 29, fontFamily: Typography.fontFamily, letterSpacing: 0.2 },
    heading1: { color: textColor, fontSize: 22, fontWeight: '700' as const, marginTop: 6, marginBottom: 12, lineHeight: 32 },
    heading2: { color: textColor, fontSize: 20, fontWeight: '700' as const, marginTop: 5, marginBottom: 11, lineHeight: 30 },
    heading3: { color: textColor, fontSize: 18, fontWeight: '600' as const, marginTop: 4, marginBottom: 10, lineHeight: 28 },
    paragraph: { color: textColor, marginBottom: 14, lineHeight: 29 },
    link: { color: colors.primary },
    code_inline: {
      backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : colors.primaryLight,
      color: textColor,
      paddingHorizontal: 4,
      borderRadius: 5,
      fontSize: 14,
    },
    code_block: {
      backgroundColor: isUser ? 'rgba(0,0,0,0.2)' : colors.primaryLight,
      color: textColor,
      padding: 12,
      borderRadius: 10,
      fontSize: 14,
      fontFamily: 'monospace',
    },
    fence: {
      backgroundColor: isUser ? 'rgba(0,0,0,0.2)' : colors.primaryLight,
      color: textColor,
      padding: 12,
      borderRadius: 10,
      fontSize: 14,
    },
    blockquote: {
      borderLeftColor: colors.primary,
      borderLeftWidth: 3,
      paddingLeft: 10,
      paddingVertical: 6,
      marginBottom: 10,
      backgroundColor: 'rgba(120,145,180,0.08)',
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
    },
    list_item: { color: textColor, lineHeight: 29, marginBottom: 6 },
    bullet_list: { color: textColor },
    ordered_list: { color: textColor },
    hr: { backgroundColor: colors.border, height: 1, marginVertical: 10 },
  };

  const handleDownloadImage = async (uri?: string) => {
    if (!uri) return;
    const ok = await saveImageToGallery(uri);
    if (ok) {
      Alert.alert('保存成功', '图片已保存到系统相册');
    } else {
      Alert.alert('保存失败', '请检查相册权限后重试');
    }
  };

  const attachmentImageUris = (message.attachments || [])
    .filter((att) => att.kind === 'image')
    .map((att) => att.uri)
    .filter(Boolean);

  const legacyUris = [message.imageUri, message.generatedImageUrl].filter(
    (u): u is string => !!u
  );

  const imageUris = Array.from(new Set([...attachmentImageUris, ...legacyUris]));

  return (
    <View style={[styles.container, isUser && styles.userContainer]}>
      {/* 角色标识 */}
      <View style={[styles.avatar, { borderColor: isUser ? colors.primary : colors.border }]}>
        {isUser ? (
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {(userAvatarEmoji || '🙂').slice(0, 2)}
          </Text>
        ) : (
          <Image source={APP_AVATAR} style={styles.avatarImage} />
        )}
      </View>

      <View style={[styles.contentWrap, isUser && styles.userContentWrap]}>
        {/* 图片消息（支持多图） */}
        {imageUris.length > 0 && (
          <View style={styles.imageGrid}>
            {imageUris.map((uri, idx) => (
              <View key={`${uri}-${idx}`} style={styles.imageItemWrap}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => setPreviewUri(uri)}>
                  <Image
                    source={{ uri }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.downloadBtn, { borderColor: colors.border }]}
                  onPress={() => handleDownloadImage(uri)}
                >
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: Typography.fontFamily }}>⬇ 下载图片</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* 多附件展示 */}
        {!!message.attachments?.some((att) => att.kind === 'file') && (
          <View style={styles.multiAttachmentWrap}>
            {message.attachments?.filter((att) => att.kind === 'file').map((att, idx) => (
              <View key={`${att.uri}-${idx}`} style={[styles.fileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.fileIcon, { color: colors.primary }]}>📎</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                    {att.name}
                  </Text>
                  {!!att.mimeType && (
                    <Text style={[styles.fileMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {att.mimeType}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 文件消息 */}
        {message.fileName && (
          <View style={[styles.fileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.fileIcon, { color: colors.primary }]}>📎</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                {message.fileName}
              </Text>
              {!!message.fileMimeType && (
                <Text style={[styles.fileMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {message.fileMimeType}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* 思考过程/工具调用展示 */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <View style={styles.toolsContainer}>
            {message.toolCalls.map((call, idx) => (
              <View
                key={idx}
                style={[styles.toolCall, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.toolTitle, { color: colors.textSecondary }]}>
                  {call.tool === 'web_search' ? '🔍 联网搜索' : 
                   call.tool === 'image_gen' ? '🎨 图片生成' :
                   call.tool === 'vision_analyze' ? '🖼️ 图片识别' :
                   call.tool === 'time_now' ? '🕒 时间工具' : '⚙️ 工具调用'}
                </Text>
                <Text style={[styles.toolInput, { color: colors.textTertiary }]} numberOfLines={1}>
                  "{call.input}"
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 搜索结果来源引用 */}
        {!isUser && message.searchResults && message.searchResults.length > 0 && (
          <View style={styles.sourcesContainer}>
            <Text style={[styles.sourceLabel, { color: colors.textSecondary }]}>参考来源:</Text>
            {message.searchResults.map((res, idx) => (
              <Text key={idx} style={[styles.sourceLink, { color: colors.primary }]} numberOfLines={1}>
                [{idx + 1}] {res.title}
              </Text>
            ))}
          </View>
        )}

        {/* 文本内容 */}
        <View style={bubbleStyle}>
          {message.content ? (
            isUser ? (
              <Text style={{ color: textColor, fontSize: 16, lineHeight: 29, fontFamily: Typography.fontFamily, letterSpacing: 0.2 }}>
                {message.content}
              </Text>
            ) : (
              <Markdown style={mdStyles as any}>
                {stripMarkdownImages(message.content)}
              </Markdown>
            )
          ) : (
            <Text style={{ color: colors.textTertiary, fontStyle: 'italic', fontFamily: Typography.fontFamily }}>
              思考中...
            </Text>
          )}
        </View>

        {isUser && (
          <Text style={[styles.userName, { color: colors.textTertiary }]} numberOfLines={1}>
            {userDisplayName || '我'}
          </Text>
        )}

        {/* 时间和类型标记 */}
        <Text style={[styles.meta, { color: colors.textTertiary }, isUser && styles.userMeta]}>
          {message.type === 'voice' ? '[语音] ' : ''}
          {message.type === 'image' ? '[图片] ' : ''}
          {message.type === 'file' ? '[文件] ' : ''}
          {new Date(message.createdAt).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>

        {/* AI 消息复制按钮 */}
        {!isUser && !!message.content && (
          <TouchableOpacity
            onPress={handleCopyText}
            style={styles.copyBtn}
            activeOpacity={0.6}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={[styles.copyBtnText, { color: copied ? colors.success : colors.textTertiary }]}>
              {copied ? '✓ 已复制' : '复制'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={!!previewUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <Pressable style={styles.previewBackdrop} onPress={() => setPreviewUri(null)}>
          {previewUri && (
            <Image
              source={{ uri: previewUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

export const MessageBubble = React.memo(MessageBubbleImpl);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'flex-start',
  },
  userContainer: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Typography.fontFamily,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  contentWrap: {
    flex: 1,
    marginLeft: 8,
    marginRight: 14,
  },
  userContentWrap: {
    marginLeft: 14,
    marginRight: 8,
    alignItems: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    maxWidth: '98%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  aiBubble: {
    borderBottomLeftRadius: 6,
    borderWidth: 0.8,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 6,
  },
  imageGrid: {
    marginBottom: 2,
  },
  imageItemWrap: {
    marginBottom: 4,
  },
  downloadBtn: {
    alignSelf: 'flex-start',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  multiAttachmentWrap: {
    marginBottom: 6,
    maxWidth: 280,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    maxWidth: 260,
  },
  fileIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Typography.fontFamily,
  },
  fileMeta: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: Typography.fontFamily,
  },
  meta: {
    fontSize: 11,
    marginTop: 5,
    marginLeft: 4,
    fontFamily: Typography.fontFamily,
    letterSpacing: 0.2,
  },
  userName: {
    fontSize: 11,
    marginTop: 4,
    marginRight: 4,
    fontFamily: Typography.fontFamily,
  },
  userMeta: {
    marginLeft: 0,
    marginRight: 4,
  },
  // 工具调用样式
  toolsContainer: {
    marginBottom: 10,
  },
  toolCall: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    borderWidth: 0.8,
    marginBottom: 6,
  },
  toolTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 6,
    fontFamily: Typography.fontFamily,
  },
  toolInput: {
    fontSize: 11,
    flex: 1,
    fontFamily: Typography.fontFamily,
  },
  // 来源引用样式
  sourcesContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: 'rgba(90, 140, 255, 0.08)',
    borderRadius: 10,
  },
  sourceLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
    fontFamily: Typography.fontFamily,
  },
  sourceLink: {
    fontSize: 11,
    marginBottom: 2,
    textDecorationLine: 'underline',
    fontFamily: Typography.fontFamily,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
  copyBtn: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  copyBtnText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily,
    fontWeight: '500',
  },
});

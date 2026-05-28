/**
 * 聊天输入框组件（V2.0）
 * 支持文本、多图片、多文件附件与 Android 键盘抬升适配。
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  Platform,
  Keyboard,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store';
import { Typography } from '../constants/theme';
import {
  pickChatFiles,
  readTextFileSafely,
  saveFileLocally,
  saveImageLocally,
} from '../utils/fileUtils';

type PendingAttachment =
  | {
      kind: 'image';
      uri: string;
      name: string;
    }
  | {
      kind: 'file';
      uri: string;
      name: string;
      mimeType?: string;
      textContent?: string;
    };

export function ChatInput() {
  const colors = useTheme();
  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);

  const { sendMessage, isLoading, stopGeneration } =
    useAppStore();

  // 发送消息（文本 + 可选图片）
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !pendingAttachments.length) return;
    if (isLoading) return;

    const currentText = trimmed;
    const attachments = pendingAttachments;
    setText('');
    setPendingAttachments([]);

    try {
      if (attachments.length) {
        await sendMessage(
          currentText || `请帮我分析这些附件（共${attachments.length}个）`,
          attachments.some((a) => a.kind === 'file') ? 'file' : 'image',
          undefined,
          undefined,
          attachments.map((a) => ({
            kind: a.kind,
            uri: a.uri,
            name: a.name,
            mimeType: a.kind === 'file' ? a.mimeType : undefined,
            textContent: a.kind === 'file' ? a.textContent : undefined,
          })),
        );
      } else {
        await sendMessage(currentText, 'text');
      }
    } catch (error: any) {
      Alert.alert('错误', error.message);
    }
  };

  // 移除待附加的图片
  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // 选择图片
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.65,
        allowsMultipleSelection: true,
        selectionLimit: 4,
      });

      if (!result.canceled && result.assets.length > 0) {
        const picked: PendingAttachment[] = [];
        for (const asset of result.assets) {
          const localUri = await saveImageLocally(asset.uri);
          if (localUri) {
            picked.push({
              kind: 'image',
              uri: localUri,
              name: asset.fileName || '图片',
            });
          }
        }
        if (picked.length) {
          setPendingAttachments((prev) => [...prev, ...picked]);
        }
      }
    } catch (error: any) {
      Alert.alert('选择图片失败', error.message);
    }
  };

  // 选择文件
  const pickFile = async () => {
    try {
      const files = await pickChatFiles();
      if (!files.length) return;

      const picked: PendingAttachment[] = [];
      for (const file of files) {
        const localUri = await saveFileLocally(file.uri, file.name);
        if (!localUri) continue;

        const textContent = await readTextFileSafely(localUri, file.name, file.mimeType);
        picked.push({
          kind: 'file',
          uri: localUri,
          name: file.name,
          mimeType: file.mimeType,
          textContent,
        });
      }

      if (!picked.length) {
        Alert.alert('提示', '文件保存失败，请重试');
        return;
      }
      setPendingAttachments((prev) => [...prev, ...picked]);
    } catch (error: any) {
      Alert.alert('选择文件失败', error.message || '未知错误');
    }
  };

  const chooseAttachment = () => {
    Alert.alert('添加附件', '请选择要添加的附件类型', [
      { text: '图片', onPress: pickImage },
      { text: '文件', onPress: pickFile },
      { text: '取消', style: 'cancel' },
    ]);
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      const h = event?.endCoordinates?.height || 0;
      setKeyboardHeight(Math.max(0, h - 4));
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
      <View style={[styles.root, Platform.OS === 'android' && keyboardHeight > 0 ? { marginBottom: keyboardHeight } : null]}>
        {/* 图片预览 */}
        {pendingAttachments.length > 0 && (
          <View style={[styles.imagePreviewRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={styles.imagePreviewWrap}> 
              {pendingAttachments.map((att, idx) => (
                <View key={`${att.uri}-${idx}`} style={[styles.attachmentChip, { borderColor: colors.border, backgroundColor: colors.inputBg }]}>
                  <View style={styles.imagePreviewPlaceholder}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: Typography.fontFamily }} numberOfLines={1}>
                      {att.kind === 'image' ? `📷 ${att.name}` : `📎 ${att.name}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removePendingAttachment(idx)}
                    style={styles.imageRemoveBtn}
                  >
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', fontFamily: Typography.fontFamily }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
        <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {/* 图片按钮 */}
        <TouchableOpacity
          onPress={chooseAttachment}
          style={[styles.iconBtn]}
          disabled={isLoading}
          activeOpacity={0.6}
        >
            <View style={[styles.iconCircle, { borderColor: colors.border, backgroundColor: colors.inputBg }]}>
            <Text style={[styles.iconSymbol, { color: colors.textSecondary }]}>+</Text>
          </View>
        </TouchableOpacity>

        {/* 输入框 */}
        <View style={[styles.inputWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.text }]}
            placeholder="输入消息..."
            placeholderTextColor={colors.textTertiary}
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="center"
            maxLength={5000}
            editable={!isLoading}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
        </View>

        {/* 发送/停止按钮 */}
        {isLoading ? (
          <TouchableOpacity
            onPress={stopGeneration}
            style={[styles.sendBtn, { backgroundColor: colors.error }]}
            activeOpacity={0.6}
          >
            <View style={styles.stopSquare} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendBtn,
              {
                backgroundColor: text.trim() || pendingAttachments.length ? colors.primary : colors.border,
              },
            ]}
            disabled={!text.trim() && !pendingAttachments.length}
            activeOpacity={0.6}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        )}
      </View>
      </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 10,
    elevation: 3,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  iconBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 图片按钮：圆形 +
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconSymbol: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: -2,
    fontFamily: Typography.fontFamily,
  },
  inputWrap: {
    flex: 1,
    minWidth: 140,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 46,
    maxHeight: 132,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    fontSize: 15,
    maxHeight: 104,
    lineHeight: 24,
    fontFamily: Typography.fontFamily,
  },
  // 录音按钮
  micBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  sendBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Typography.fontFamily,
  },
  stopSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#FFF',
  },
  // 图片预览
  imagePreviewRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 0.5,
  },
  imagePreviewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 8,
  },
  imagePreviewPlaceholder: {
    maxWidth: 188,
  },
  imageRemoveBtn: {
    marginLeft: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

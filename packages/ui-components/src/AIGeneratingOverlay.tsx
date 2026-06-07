/**
 * AIGeneratingOverlay — AI 生成中全屏遮罩
 * 展示生成进度动画 + AI 思考过程的模拟文字
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal as RNModal,
  StyleSheet,
  Animated,
} from "react-native";
import { ProgressBar } from "./ProgressBar";

interface AIGeneratingOverlayProps {
  visible: boolean;
  model?: string;
  companyType?: string;
  duration?: number;  // 预估生成时间（毫秒）
}

const THINKING_STEPS = [
  "正在分析目标岗位需求...",
  "匹配公司文化关键词...",
  "优化个人经历描述...",
  "量化成果数据...",
  "ATS 关键词优化中...",
  "生成最终简历内容...",
];

export function AIGeneratingOverlay({
  visible,
  model = "GPT-4o",
  companyType,
  duration = 15000,
}: AIGeneratingOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    if (!visible) {
      setProgress(0);
      setStepIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 12 + 3;
        return next >= 95 ? 95 : next;
      });
    }, duration / 20);

    const stepInterval = setInterval(() => {
      setStepIndex((prev) =>
        prev < THINKING_STEPS.length - 1 ? prev + 1 : prev
      );
    }, duration / THINKING_STEPS.length);

    return () => {
      clearInterval(interval);
      clearInterval(stepInterval);
    };
  }, [visible, duration]);

  return (
    <RNModal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* AI 图标 */}
          <Animated.View
            style={[
              styles.iconCircle,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <Text style={styles.icon}>{"\uD83E\uDD16"}</Text>
          </Animated.View>

          <Text style={styles.title}>AI 正在生成简历</Text>

          {companyType && (
            <Text style={styles.subtitle}>目标: {companyType}</Text>
          )}
          {model && (
            <Text style={styles.model}>使用模型: {model}</Text>
          )}

          {/* 进度条 */}
          <View style={styles.progressContainer}>
            <ProgressBar
              value={progress}
              color="#2563EB"
              height={6}
              showLabel
            />
          </View>

          {/* 思考步骤 */}
          <Text style={styles.stepText}>{THINKING_STEPS[stepIndex]}</Text>

          <Text style={styles.hint}>首次生成可能需要 10-30 秒</Text>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 2,
  },
  model: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 20,
  },
  progressContainer: {
    width: "100%",
    marginBottom: 16,
  },
  stepText: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 12,
    minHeight: 20,
  },
  hint: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
});

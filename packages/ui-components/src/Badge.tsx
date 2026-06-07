/**
 * Badge — 标签/徽章组件
 */
import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "premium";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: "#F3F4F6", text: "#4B5563" },
  primary: { bg: "#DBEAFE", text: "#1D4ED8" },
  success: { bg: "#D1FAE5", text: "#065F46" },
  warning: { bg: "#FEF3C7", text: "#92400E" },
  danger: { bg: "#FEE2E2", text: "#991B1B" },
  premium: { bg: "#FEF3C7", text: "#92400E" },
};

export function Badge({ label, variant = "default", size = "sm" }: BadgeProps) {
  const colors = VARIANT_COLORS[variant];
  const isSm = size === "sm";

  return (
    <View
      style={[
        {
          backgroundColor: colors.bg,
          paddingHorizontal: isSm ? 8 : 12,
          paddingVertical: isSm ? 2 : 4,
          borderRadius: isSm ? 4 : 6,
          alignSelf: "flex-start",
        },
      ]}
    >
      <Text
        style={{
          fontSize: isSm ? 11 : 13,
          fontWeight: "500",
          color: colors.text,
          lineHeight: isSm ? 16 : 20,
        }}
      >
        {variant === "premium" ? `\u2605 ${label}` : label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({});

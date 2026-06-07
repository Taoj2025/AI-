/**
 * LoadingSpinner — 加载动画组件
 */
import React from "react";
import { View, ActivityIndicator, Text, StyleSheet, Platform } from "react-native";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  text?: string;
}

const SIZE_MAP = { sm: "small", md: "large", lg: "large" } as const;

export function LoadingSpinner({
  size = "md",
  color = "#2563EB",
  text,
}: LoadingSpinnerProps) {
  const spinnerSize = SIZE_MAP[size];
  const indicatorSize = size === "lg" ? 48 : size === "md" ? 32 : 20;

  return (
    <View style={styles.container}>
      <ActivityIndicator size={spinnerSize} color={color} />
      {text ? (
        <Text style={[styles.text, { marginTop: 8, fontSize: size === "sm" ? 12 : 14 }]}>
          {text}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  text: {
    color: "#6B7280",
  },
});

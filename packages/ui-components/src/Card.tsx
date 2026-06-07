/**
 * Card — 通用卡片容器组件
 */
import React from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  Pressable,
} from "react-native";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: "elevated" | "outlined" | "filled";
  padding?: number;
  style?: ViewStyle;
}

export function Card({
  children,
  onPress,
  variant = "elevated",
  padding = 16,
  style,
}: CardProps) {
  const variantStyle = {
    elevated: {
      backgroundColor: "#FFFFFF",
      ...Platform.select({
        web: { boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" },
        default: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 3,
        },
      }),
      borderWidth: 0,
    },
    outlined: {
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#E5E7EB",
    },
    filled: {
      backgroundColor: "#F3F4F6",
      borderWidth: 0,
    },
  }[variant];

  const container = (
    <View
      style={[
        {
          borderRadius: 12,
          padding,
          ...variantStyle,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
        {container}
      </Pressable>
    );
  }

  return container;
}

const Platform = require("react-native").Platform;
const styles = StyleSheet.create({});

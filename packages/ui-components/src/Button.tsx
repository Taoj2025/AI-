/**
 * Button — 通用按钮组件
 * 支持 primary / secondary / ghost / danger 四种变体
 */
import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Platform,
} from "react-native";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border?: string }> =
  Platform.OS === "web"
    ? {
        primary: { bg: "#2563EB", text: "#FFFFFF" },
        secondary: { bg: "#F3F4F6", text: "#111827", border: "#D1D5DB" },
        ghost: { bg: "transparent", text: "#2563EB" },
        danger: { bg: "#DC2626", text: "#FFFFFF" },
      }
    : {
        primary: { bg: "#2563EB", text: "#FFFFFF" },
        secondary: { bg: "#F3F4F6", text: "#111827" },
        ghost: { bg: "transparent", text: "#2563EB" },
        danger: { bg: "#DC2626", text: "#FFFFFF" },
      };

const SIZE_STYLES: Record<ButtonSize, { paddingV: number; paddingH: number; fontSize: number; borderRadius: number }> = {
  sm: { paddingV: 6, paddingH: 12, fontSize: 13, borderRadius: 6 },
  md: { paddingV: 10, paddingH: 20, fontSize: 15, borderRadius: 8 },
  lg: { paddingV: 14, paddingH: 28, fontSize: 17, borderRadius: 10 },
};

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const colors = VARIANT_STYLES[variant];
  const sizes = SIZE_STYLES[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={disabled ? 1 : 0.7}
      style={[
        {
          backgroundColor: disabled ? "#D1D5DB" : colors.bg,
          paddingHorizontal: sizes.paddingH,
          paddingVertical: sizes.paddingV,
          borderRadius: sizes.borderRadius,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          alignSelf: fullWidth ? "stretch" : "flex-start",
          borderWidth: colors.border ? 1 : 0,
          borderColor: colors.border,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <>
          {icon && <React.Fragment>{icon}</React.Fragment>}
          <Text
            style={{
              color: colors.text,
              fontSize: sizes.fontSize,
              fontWeight: "600",
              marginLeft: icon ? 8 : 0,
            }}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({});

/**
 * Input — 通用输入框组件
 * 支持 label / placeholder / error / leftIcon
 */
import React, { useState } from "react";
import {
  TextInput,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  Platform,
  TextInputProps,
} from "react-native";

interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  containerStyle,
  onFocus,
  onBlur,
  ...textInputProps
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? "#DC2626"
    : focused
    ? "#2563EB"
    : "#D1D5DB";

  return (
    <View style={[{ width: "100%" }, containerStyle]}>
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}

      <View style={[styles.inputContainer, { borderColor }]}>
        {leftIcon ? (
          <View style={styles.iconContainer}>{leftIcon}</View>
        ) : null}

        <TextInput
          style={[styles.input, leftIcon ? { paddingLeft: 0 } : undefined]}
          placeholderTextColor="#9CA3AF"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...textInputProps}
        />
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: Platform.OS === "web" ? "#FFFFFF" : "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "web" ? 10 : 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    padding: 0,
  },
  iconContainer: {
    marginRight: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
});

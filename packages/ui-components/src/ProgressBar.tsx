/**
 * ProgressBar — 进度条组件
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface ProgressBarProps {
  value: number;         // 0-100
  color?: string;
  bgColor?: string;
  height?: number;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({
  value,
  color = "#2563EB",
  bgColor = "#E5E7EB",
  height = 8,
  showLabel = false,
  label,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <View style={{ width: "100%" }}>
      {(showLabel || label) && (
        <View style={styles.labelRow}>
          {label ? (
            <Text style={styles.labelText}>{label}</Text>
          ) : null}
          {showLabel ? (
            <Text style={styles.percentText}>{Math.round(clamped)}%</Text>
          ) : null}
        </View>
      )}

      <View
        style={[
          styles.track,
          { height, backgroundColor: bgColor, borderRadius: height / 2 },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${clamped}%`,
              backgroundColor: color,
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  labelText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  percentText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  track: {
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});

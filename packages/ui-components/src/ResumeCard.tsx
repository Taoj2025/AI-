/**
 * ResumeCard — 简历卡片组件（我的简历列表用）
 */
import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Card } from "./Card";
import { Badge } from "./Badge";

interface ResumeCardProps {
  title: string;
  companyType: string;
  style?: string;
  updatedAt: string;
  atsScore?: number;
  onPress?: () => void;
}

const COMPANY_TYPE_LABELS: Record<string, string> = {
  internet_giant: "互联网大厂",
  foreign_company: "外企",
  state_owned: "国企",
  startup: "创业公司",
  consulting: "咨询/金融",
};

export function ResumeCard({
  title,
  companyType,
  style,
  updatedAt,
  atsScore,
  onPress,
}: ResumeCardProps) {
  return (
    <Card onPress={onPress} padding={14}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {atsScore !== undefined ? (
          <Badge
            label={atsScore >= 80 ? "优秀" : atsScore >= 60 ? "良好" : "待优化"}
            variant={atsScore >= 80 ? "success" : atsScore >= 60 ? "warning" : "danger"}
          />
        ) : null}
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaText}>{COMPANY_TYPE_LABELS[companyType] || companyType}</Text>
        <Text style={styles.dot}>{"\u00B7"}</Text>
        <Text style={styles.metaText}>{style || "默认风格"}</Text>
      </View>

      <Text style={styles.date}>{updatedAt}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#6B7280",
  },
  dot: {
    fontSize: 13,
    color: "#D1D5DB",
    marginHorizontal: 6,
  },
  date: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
});

/**
 * TemplateCard — 模板卡片组件（模板市场用）
 */
import React from "react";
import { View, Text, Image, StyleSheet, Pressable } from "react-native";
import { Card } from "./Card";
import { Badge } from "./Badge";

interface TemplateCardProps {
  name: string;
  category: string;
  style?: string;
  thumbnail?: string;
  isPremium?: boolean;
  rating?: number;
  usageCount?: number;
  tags?: string[];
  onPress?: () => void;
}

export function TemplateCard({
  name,
  category,
  style,
  thumbnail,
  isPremium = false,
  rating = 0,
  usageCount = 0,
  tags = [],
  onPress,
}: TemplateCardProps) {
  return (
    <Card onPress={onPress} padding={0}>
      {/* 缩略图 */}
      <View style={styles.thumbnail}>
        {thumbnail ? (
          <Image
            source={{ uri: thumbnail }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Text style={styles.placeholderIcon}>{"\uD83D\uDCCB"}</Text>
          </View>
        )}
        {isPremium && (
          <View style={styles.premiumBadge}>
            <Badge label="PRO" variant="premium" size="sm" />
          </View>
        )}
      </View>

      {/* 信息 */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>

        <View style={styles.meta}>
          <Text style={styles.category}>{category}</Text>
          {rating > 0 && (
            <>
              <Text style={styles.dot}>{"\u00B7"}</Text>
              <Text style={styles.rating}>{"\u2605"} {rating.toFixed(1)}</Text>
            </>
          )}
          <Text style={styles.dot}>{"\u00B7"}</Text>
          <Text style={styles.usage}>{usageCount} 人使用</Text>
        </View>

        {tags.length > 0 && (
          <View style={styles.tagsRow}>
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} label={tag} size="sm" />
            ))}
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    height: 140,
    position: "relative",
    overflow: "hidden",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderIcon: {
    fontSize: 32,
  },
  premiumBadge: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  info: {
    padding: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  category: {
    fontSize: 13,
    color: "#6B7280",
  },
  dot: {
    fontSize: 13,
    color: "#D1D5DB",
    marginHorizontal: 6,
  },
  rating: {
    fontSize: 13,
    color: "#F59E0B",
    fontWeight: "500",
  },
  usage: {
    fontSize: 13,
    color: "#6B7280",
  },
  tagsRow: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
  },
});

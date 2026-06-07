/**
 * ModelSelector — AI 模型选择器组件
 */
import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Badge } from "./Badge";

interface AIModel {
  id: string;
  name: string;
  provider: string;
  price: string;
  color: string;
  recommended?: boolean;
}

interface ModelSelectorProps {
  models: AIModel[];
  selected?: string;
  onSelect?: (modelId: string) => void;
}

export function ModelSelector({
  models,
  selected,
  onSelect,
}: ModelSelectorProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {models.map((model) => {
        const isSelected = selected === model.id;
        return (
          <Pressable
            key={model.id}
            onPress={() => onSelect?.(model.id)}
            style={[
              styles.card,
              isSelected && { borderColor: model.color, borderWidth: 2 },
            ]}
          >
            {model.recommended && (
              <Badge label="推荐" variant="primary" size="sm" />
            )}

            <Text style={styles.name}>{model.name}</Text>
            <View style={styles.meta}>
              <View
                style={[
                  styles.providerDot,
                  { backgroundColor: model.color },
                ]}
              />
              <Text style={styles.provider}>{model.provider}</Text>
            </View>
            <Text style={styles.price}>{model.price}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 4,
  },
  card: {
    width: 130,
    padding: 12,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginTop: 4,
    numberOfLines: 1,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  providerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  provider: {
    fontSize: 11,
    color: "#6B7280",
  },
  price: {
    fontSize: 12,
    color: "#374151",
    marginTop: 6,
    fontWeight: "500",
  },
});

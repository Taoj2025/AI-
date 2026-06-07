// ============================================================
// 我的简历列表
// ============================================================
import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useResumeStore } from '../store';
import { styles } from './MyResumesScreen.styles';

export default function MyResumesScreen({ navigation }: any) {
  const { token } = useAuthStore();
  const { resumes, loading, fetchResumes, deleteResume } = useResumeStore();

  useEffect(() => {
    if (token) fetchResumes(token);
  }, [token]);

  const handleDelete = (id: string) => {
    if (token) deleteResume(token, id);
  };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ResumeEditor', { id: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <View style={[styles.badge, item.companyType === 'internet' && styles.badgeInternet]}>
          <Text style={styles.badgeText}>{getCompanyTypeLabel(item.companyType)}</Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>
        {item.style} · 更新于 {new Date(item.updatedAt).toLocaleDateString('zh-CN')}
      </Text>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Export', { id: item.id })}>
          <Ionicons name="download-outline" size={16} color="#6366F1" />
          <Text style={styles.actionText}>导出</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionDanger]} onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text style={[styles.actionText, styles.actionDangerText]}>删除</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6366F1" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的简历</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Create')}>
          <Ionicons name="add-circle" size={28} color="#6366F1" />
        </TouchableOpacity>
      </View>
      {resumes.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>还没有简历，点击右上角创建</Text>
        </View>
      ) : (
        <FlatList
          data={resumes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const getCompanyTypeLabel = (t: string) => {
  const map: Record<string, string> = { internet: '大厂', foreign: '外企', state: '国企', startup: '创业', consulting: '咨询' };
  return map[t] ?? t;
};

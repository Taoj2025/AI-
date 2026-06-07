// ============================================================
// 首页 - 发现/推荐流（小红书风格）
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../store';
import { Ionicons } from '@expo/vector-icons';
import styles from './HomeScreen.styles';

export default function HomeScreen({ navigation }: any) {
  const { token } = useAuthStore();
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = async () => {
    try {
      // Mock 数据（连接后端后替换为真实 API）
      const mockFeed = [
        {
          id: '1', type: 'template', title: '互联网大厂标准简历',
          author: 'ResumeAI官方', likes: 2340, thumbnail: 'https://picsum.photos/400/520?1',
          tags: ['互联网', '产品研发'],
        },
        {
          id: '2', type: 'article', title: '字节/腾讯/阿里巴巴简历筛选标准揭秘',
          author: '资深HR李老师', likes: 5620, thumbnail: 'https://picsum.photos/400/520?2',
          tags: ['求职攻略', '大厂'],
        },
        {
          id: '3', type: 'template', title: '外企英文简历模板（含ATS优化）',
          author: 'GlobalCareers', likes: 1890, thumbnail: 'https://picsum.photos/400/520?3',
          tags: ['外企', '英文'],
        },
        {
          id: '4', type: 'success', title: '用AI简历，我拿到了字节+腾讯双offer',
          author: '张三同学', likes: 3200, thumbnail: 'https://picsum.photos/400/520?4',
          tags: ['成功案例', '涨薪50%'],
        },
      ];
      setFeed(mockFeed);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadFeed(); }, []);

  const onRefresh = () => { setRefreshing(true); loadFeed(); };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ResumeDetail', { id: item.id })}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardAuthor}>{item.author}</Text>
          <View style={styles.likeRow}>
            <Ionicons name="heart-outline" size={14} color="#999" />
            <Text style={styles.likeCount}>{(item.likes / 1000).toFixed(1)}k</Text>
          </View>
        </View>
        <View style={styles.tagRow}>
          {item.tags?.map((t: string) => (
            <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6366F1" /></View>;

  return (
    <View style={styles.container}>
      {/* 顶部搜索栏 */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#999" />
        <Text style={styles.searchPlaceholder}>搜索简历模板、求职攻略...</Text>
      </View>
      <FlatList
        data={feed}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6366F1"]} />}
      />
    </View>
  );
}

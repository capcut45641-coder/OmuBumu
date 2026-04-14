import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Tournament } from '@/types/database';
import { shareTournamentResultsLink } from '@/lib/shareTournament';
import { UserRound, Share2 } from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth?redirect=/(tabs)/profile');
    }
  }, [authLoading, user, router]);

  const fetchMine = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyTournaments(data || []);
    } catch (e) {
      console.error('Turnuvalar yüklenemedi:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      fetchMine();
    }
  }, [user?.id, fetchMine]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMine();
  };

  const formatPlayCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const displayName =
    (typeof user?.user_metadata?.full_name === 'string' &&
      user.user_metadata.full_name.trim()) ||
    (typeof user?.user_metadata?.name === 'string' &&
      user.user_metadata.name.trim()) ||
    user?.email?.split('@')[0] ||
    'Kullanıcı';

  const avatarUrl =
    typeof user?.user_metadata?.avatar_url === 'string'
      ? user.user_metadata.avatar_url
      : null;

  const handleShare = (t: Tournament) => {
    void shareTournamentResultsLink({
      tournamentId: t.id,
      title: t.title,
    });
  };

  if (authLoading || !user) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.hint}>Oturum kontrol ediliyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8b5cf6"
            colors={['#8b5cf6']}
          />
        }>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <UserRound size={40} color="#8b5cf6" strokeWidth={1.8} />
              </View>
            )}
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          {user.email ? (
            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Oluşturduğum Turnuvalar</Text>

        {loading ? (
          <View style={styles.listLoading}>
            <ActivityIndicator color="#8b5cf6" />
            <Text style={styles.listLoadingText}>Turnuvalar yükleniyor...</Text>
          </View>
        ) : myTournaments.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Henüz turnuva yok</Text>
            <Text style={styles.emptySub}>
              Yeni bir turnuva oluşturduğunuzda burada listelenecek.
            </Text>
          </View>
        ) : (
          myTournaments.map((t) => (
            <View key={t.id} style={styles.tournamentRow}>
              <View style={styles.tournamentBody}>
                <Text style={styles.tournamentTitle} numberOfLines={2}>
                  {t.title}
                </Text>
                <Text style={styles.tournamentDesc} numberOfLines={3}>
                  {t.description?.trim()
                    ? t.description
                    : 'Açıklama eklenmemiş.'}
                </Text>
                <Text style={styles.playCount}>
                  {formatPlayCount(t.play_count)} kez oynandı
                </Text>
              </View>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={() => handleShare(t)}
                activeOpacity={0.85}
                accessibilityLabel="Turnuvayı paylaş">
                <Share2 size={22} color="#fff" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  hint: { color: '#888', fontSize: 14, fontWeight: '600' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  avatarWrap: {
    marginBottom: 14,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#2a1a4a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  email: {
    marginTop: 6,
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 14,
  },
  listLoading: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
  },
  listLoadingText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  empty: {
    paddingVertical: 28,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySub: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  tournamentRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 12,
    overflow: 'hidden',
  },
  tournamentBody: {
    flex: 1,
    padding: 14,
    paddingRight: 8,
  },
  tournamentTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  tournamentDesc: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
    marginBottom: 8,
  },
  playCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a78bfa',
  },
  shareBtn: {
    width: 56,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

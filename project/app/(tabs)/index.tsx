import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { Tournament } from '@/types/database';
import { shareTournamentResultsLink } from '@/lib/shareTournament';
import { TrendingUp, Play, Share2 } from 'lucide-react-native';

type SortMode = 'newest' | 'popular';

export default function HomeScreen() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<SortMode>('newest');

  const fetchTournaments = useCallback(async () => {
    try {
      let query = supabase.from('tournaments').select('*');

      if (sort === 'popular') {
        query = query.order('play_count', { ascending: false }).order('created_at', {
          ascending: false,
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sort]);

  useEffect(() => {
    setLoading(true);
    fetchTournaments();
  }, [fetchTournaments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTournaments();
  };

  const formatPlayCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const startTournament = (tournament: Tournament) => {
    router.push({
      pathname: '/game/[id]',
      params: { id: tournament.id },
    });
  };

  const shareTournament = (tournament: Tournament) => {
    void shareTournamentResultsLink({
      tournamentId: tournament.id,
      title: tournament.title,
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>O mu Bu mu?</Text>
        <View style={styles.headerBadge}>
          <TrendingUp size={16} color="#8b5cf6" strokeWidth={2} />
          <Text style={styles.headerBadgeText}>Keşfet</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.pill, sort === 'newest' && styles.pillActive]}
          onPress={() => setSort('newest')}
          activeOpacity={0.85}>
          <Text style={[styles.pillText, sort === 'newest' && styles.pillTextActive]}>
            En Yeni
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, sort === 'popular' && styles.pillActive]}
          onPress={() => setSort('popular')}
          activeOpacity={0.85}>
          <Text style={[styles.pillText, sort === 'popular' && styles.pillTextActive]}>
            En Popüler
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8b5cf6"
            colors={['#8b5cf6']}
          />
        }>
        {tournaments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Henüz turnuva yok</Text>
            <Text style={styles.emptySubtext}>
              İlk turnuvayı oluşturmak için &quot;Oluştur&quot; sekmesine gidin
            </Text>
          </View>
        ) : (
          tournaments.map((tournament) => (
            <View key={tournament.id} style={styles.tournamentCard}>
              <TouchableOpacity
                style={styles.cardPress}
                onPress={() => startTournament(tournament)}
                activeOpacity={0.88}>
                <Image
                  source={{ uri: tournament.cover_image }}
                  style={styles.tournamentImage}
                  resizeMode="cover"
                />
                <View style={styles.tournamentOverlay} />
                <View style={styles.tournamentContent}>
                  {tournament.is_trending && (
                    <View style={styles.trendingBadge}>
                      <TrendingUp size={14} color="#fff" strokeWidth={2.5} />
                      <Text style={styles.trendingText}>Trend</Text>
                    </View>
                  )}
                  <Text style={styles.tournamentTitle} numberOfLines={2}>
                    {tournament.title}
                  </Text>
                  <View style={styles.tournamentStats}>
                    <Play size={14} color="#a78bfa" strokeWidth={2} />
                    <Text style={styles.playCount}>
                      {formatPlayCount(tournament.play_count)} kez oynandı
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareFab}
                onPress={() => shareTournament(tournament)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Paylaş">
                <Share2 size={20} color="#fff" strokeWidth={2} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1a4a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  headerBadgeText: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#141414',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  pillActive: {
    backgroundColor: '#2a1a4a',
    borderColor: '#8b5cf6',
  },
  pillText: {
    color: '#888',
    fontWeight: '700',
    fontSize: 14,
  },
  pillTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  tournamentCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    height: 220,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    backgroundColor: '#1a1a1a',
  },
  cardPress: {
    flex: 1,
  },
  tournamentImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  tournamentOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  tournamentContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
  },
  shareFab: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  trendingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tournamentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  tournamentStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playCount: {
    fontSize: 13,
    color: '#a78bfa',
    fontWeight: '600',
  },
});

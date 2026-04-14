import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { TournamentItem } from '@/types/database';
import { shareTournamentResultsLink } from '@/lib/shareTournament';
import { Trophy, RotateCcw, Share2 } from 'lucide-react-native';

interface LeaderboardItem extends TournamentItem {
  winRate: number;
}

function paramToString(v: string | string[] | undefined): string {
  if (v == null) return '';
  return Array.isArray(v) ? v[0] ?? '' : v;
}

export default function ResultsScreen() {
  const { id, winnerId, winnerImage, winnerName } = useLocalSearchParams();
  const tournamentId = paramToString(id);
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [tournamentTitle, setTournamentTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [id]);

  const fetchLeaderboard = async () => {
    try {
      const [{ data: items, error }, { data: meta }] = await Promise.all([
        supabase
          .from('tournament_items')
          .select('*')
          .eq('tournament_id', tournamentId),
        supabase
          .from('tournaments')
          .select('title')
          .eq('id', tournamentId)
          .maybeSingle(),
      ]);

      if (error) throw error;
      if (meta?.title) setTournamentTitle(meta.title);

      const itemsWithWinRate = (items ?? [])
        .map((item) => ({
          ...item,
          winRate:
            item.total_count > 0 ? (item.win_count / item.total_count) * 100 : 0,
        }))
        .sort((a, b) => b.winRate - a.winRate);

      setLeaderboard(itemsWithWinRate);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const playAgain = () => {
    router.replace({
      pathname: '/game/[id]',
      params: { id: tournamentId },
    });
  };

  const shareWithFriend = () => {
    const name = typeof winnerName === 'string' ? winnerName : 'Kazanan';
    void shareTournamentResultsLink({
      tournamentId,
      title: tournamentTitle || undefined,
      leadLine: `Bu turnuvada kazanan: ${name}! Sen de dene.`,
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.winnerSection}>
        <View style={styles.winnerBadge}>
          <Trophy size={28} color="#fbbf24" strokeWidth={2} />
        </View>
        <Text style={styles.winnerLabel}>Kazanan!</Text>
        <View style={styles.winnerImageContainer}>
          <Image
            source={{ uri: winnerImage as string }}
            style={styles.winnerImage}
            resizeMode="cover"
          />
          <View style={styles.winnerOverlay}>
            <Text style={styles.winnerName}>{winnerName}</Text>
          </View>
        </View>
      </View>

      <View style={styles.leaderboardSection}>
        <Text style={styles.leaderboardTitle}>Sıralama</Text>
        <Text style={styles.leaderboardSubtitle}>
          Bu turnuvadaki kazanma oranları
        </Text>

        <ScrollView
          style={styles.leaderboardList}
          showsVerticalScrollIndicator={false}>
          {leaderboard.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.leaderboardItem,
                item.id === winnerId && styles.leaderboardItemHighlight,
              ]}>
              <View style={styles.leaderboardRank}>
                <Text
                  style={[
                    styles.rankNumber,
                    index < 3 && styles.rankNumberTop,
                    item.id === winnerId && styles.rankNumberHighlight,
                  ]}>
                  {index + 1}
                </Text>
              </View>
              <Image
                source={{ uri: item.image_url }}
                style={styles.leaderboardImage}
                resizeMode="cover"
              />
              <View style={styles.leaderboardInfo}>
                <Text
                  style={[
                    styles.leaderboardName,
                    item.id === winnerId && styles.leaderboardNameHighlight,
                  ]}
                  numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.leaderboardStats}>
                  {item.win_count} / {item.total_count} maç
                </Text>
              </View>
              <View style={styles.leaderboardWinRate}>
                <Text
                  style={[
                    styles.winRateText,
                    item.id === winnerId && styles.winRateTextHighlight,
                  ]}>
                  %{item.winRate.toFixed(0)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.buttonColumn}>
        <TouchableOpacity
          style={[styles.bigButton, styles.bigButtonPrimary]}
          onPress={playAgain}
          activeOpacity={0.9}>
          <RotateCcw size={22} color="#fff" strokeWidth={2} />
          <Text style={styles.bigButtonPrimaryText}>Tekrar Oyna</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bigButton, styles.bigButtonSecondary]}
          onPress={shareWithFriend}
          activeOpacity={0.9}>
          <Share2 size={22} color="#8b5cf6" strokeWidth={2} />
          <Text style={styles.bigButtonSecondaryText}>Arkadaşınla Paylaş</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
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
    marginTop: 12,
  },
  winnerSection: {
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  winnerBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2a1a0a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  winnerLabel: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fbbf24',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  winnerImageContainer: {
    width: 200,
    height: 266,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#8b5cf6',
  },
  winnerImage: {
    width: '100%',
    height: '100%',
  },
  winnerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    padding: 12,
  },
  winnerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  leaderboardSection: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  leaderboardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  leaderboardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    marginBottom: 14,
  },
  leaderboardList: {
    flex: 1,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  leaderboardItemHighlight: {
    backgroundColor: '#2a1a4a',
    borderColor: '#8b5cf6',
  },
  leaderboardRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  rankNumberTop: {
    color: '#fbbf24',
  },
  rankNumberHighlight: {
    color: '#8b5cf6',
  },
  leaderboardImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  leaderboardNameHighlight: {
    color: '#a78bfa',
  },
  leaderboardStats: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  leaderboardWinRate: {
    paddingLeft: 12,
  },
  winRateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  winRateTextHighlight: {
    color: '#8b5cf6',
  },
  buttonColumn: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  bigButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  bigButtonPrimary: {
    backgroundColor: '#8b5cf6',
  },
  bigButtonSecondary: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  bigButtonPrimaryText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  bigButtonSecondaryText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#8b5cf6',
  },
});

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { Tournament } from '@/types/database';
import { Search as SearchIcon, Play } from 'lucide-react-native';

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>(
    []
  );

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTournaments(tournaments);
    } else {
      const filtered = tournaments.filter((tournament) =>
        tournament.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTournaments(filtered);
    }
  }, [searchQuery, tournaments]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTournaments(data || []);
      setFilteredTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const formatPlayCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Keşfet</Text>
      </View>

      <View style={styles.searchContainer}>
        <SearchIcon size={20} color="#666" strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Turnuva ara..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        {filteredTournaments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <SearchIcon size={48} color="#333" strokeWidth={1.5} />
            <Text style={styles.emptyText}>
              {searchQuery.trim() === ''
                ? 'Henüz turnuva yok'
                : 'Sonuç bulunamadı'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery.trim() === ''
                ? 'İlk turnuvayı oluşturmak için "Oluştur" sekmesine gidin'
                : 'Farklı bir arama terimi deneyin'}
            </Text>
          </View>
        ) : (
          filteredTournaments.map((tournament) => (
            <TouchableOpacity
              key={tournament.id}
              style={styles.tournamentCard}
              onPress={() => startTournament(tournament)}
              activeOpacity={0.8}>
              <Image
                source={{ uri: tournament.cover_image }}
                style={styles.tournamentImage}
                resizeMode="cover"
              />
              <View style={styles.tournamentInfo}>
                <Text style={styles.tournamentTitle} numberOfLines={2}>
                  {tournament.title}
                </Text>
                <View style={styles.tournamentStats}>
                  <Play size={12} color="#a78bfa" strokeWidth={2} />
                  <Text style={styles.playCount}>
                    {formatPlayCount(tournament.play_count)} kez
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  tournamentCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  tournamentImage: {
    width: 100,
    height: 100,
  },
  tournamentInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  tournamentTitle: {
    fontSize: 16,
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
    fontSize: 12,
    color: '#a78bfa',
    fontWeight: '600',
  },
});

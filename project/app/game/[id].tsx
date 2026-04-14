import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import type { TournamentItem } from '@/types/database';
import { ArrowLeft } from 'lucide-react-native';

type RoundName = 'Son 32' | 'Son 16' | 'Çeyrek Final' | 'Yarı Final' | 'Final';

function paramToString(v: string | string[] | undefined): string {
  if (v == null) return '';
  return Array.isArray(v) ? v[0] ?? '' : v;
}

export default function GameScreen() {
  const { id } = useLocalSearchParams();
  const tournamentId = paramToString(id);
  const router = useRouter();
  
  // YENİ: Turnuva mantığı için gerekli state'ler eklendi
  const [winners, setWinners] = useState<TournamentItem[]>([]);
  const [currentRoundItems, setCurrentRoundItems] = useState<TournamentItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [tournamentTitle, setTournamentTitle] = useState('');
  const [allItems, setAllItems] = useState<TournamentItem[]>([]);
  const [remainingItems, setRemainingItems] = useState<TournamentItem[]>([]);
  const [currentPair, setCurrentPair] = useState<[TournamentItem, TournamentItem] | null>(null);
  const [loading, setLoading] = useState(true);
  const [animating, setAnimating] = useState(false);

  const leftScale = useRef(new Animated.Value(1)).current;
  const rightScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchTournamentData();
  }, [id]);

  const fetchTournamentData = async () => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }
    try {
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) throw tournamentError;

      setTournamentTitle(tournament.title);

      const { data: items, error: itemsError } = await supabase
        .from('tournament_items')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (itemsError) throw itemsError;

      // Öğeleri karıştır ve başlangıç değerlerini ata
      const shuffled = [...items].sort(() => Math.random() - 0.5);
      setAllItems(shuffled);
      setRemainingItems(shuffled);
      
      // YENİ: Turnuva motoru için başlangıç değerleri
      setCurrentRoundItems(shuffled);
      setCurrentIndex(0);
      setWinners([]);
      setCurrentPair([shuffled[0], shuffled[1]]);

      await supabase
        .from('tournaments')
        .update({ play_count: tournament.play_count + 1 })
        .eq('id', tournamentId);

    } catch (error) {
      console.error('Error fetching tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoundName = (itemsLeft: number): RoundName => {
    if (itemsLeft <= 2) return 'Final';
    if (itemsLeft <= 4) return 'Yarı Final';
    if (itemsLeft <= 8) return 'Çeyrek Final';
    if (itemsLeft <= 16) return 'Son 16';
    return 'Son 32';
  };

  // YENİ: other parametresi "optional (?)" yapıldı (Tek eleman kalma ihtimaline karşı)
  const handleChoice = async (chosen: TournamentItem, other?: TournamentItem) => {
    // Güvenlik kontrolü
    if (animating || !currentPair || !currentPair[0]) return;

    setAnimating(true);

    const isLeft = currentPair[0].id === chosen.id;
    const scaleToAnimate = isLeft ? leftScale : rightScale;
    const otherScale = isLeft ? rightScale : leftScale;

    Animated.parallel([
      Animated.sequence([
        Animated.spring(scaleToAnimate, {
          toValue: 1.1,
          useNativeDriver: true,
          speed: 20,
        }),
        Animated.spring(scaleToAnimate, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
        }),
      ]),
      Animated.timing(otherScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      try {
        await supabase
          .from('tournament_items')
          .update({
            win_count: chosen.win_count + 1,
            total_count: chosen.total_count + 1,
          })
          .eq('id', chosen.id);

        if (other) {
          await supabase
            .from('tournament_items')
            .update({
              total_count: other.total_count + 1,
            })
            .eq('id', other.id);
        }
      } catch (error) {
        console.error('Error updating stats:', error);
      }

      // 1. İlerleme çubuğu (Progress Bar) için genel kalan listesini güncelle
      const newRemaining = remainingItems.filter((item) => item.id !== other?.id);
      setRemainingItems(newRemaining);

      // YENİ: GERÇEK TURNUVA MANTIĞI BURADAN BAŞLIYOR
      const updatedWinners = [...winners, chosen];

      // Eğer mevcut turdaki (örn: Çeyrek Final) tüm eşleşmeler bittiyse
      if (currentIndex + 2 >= currentRoundItems.length) {
        
        // Turnuva bitti mi? (Geriye tek şampiyon mu kaldı?)
        if (updatedWinners.length === 1) {
          router.replace({
            pathname: '/results/[id]',
            params: {
              id: tournamentId,
              winnerId: chosen.id,
              winnerImage: chosen.image_url,
              winnerName: chosen.name,
            },
          });
          return;
        } else {
          // Tur bitti ama turnuva devam ediyor. (YENİ TURA GEÇİŞ)
          // Kazananlar yeni turun (örn: Yarı Final) havuzunu oluşturur
          setCurrentRoundItems(updatedWinners);
          // Kazananlar havuzunu sıfırla
          setWinners([]);
          // Eşleşme sırasını başa al
          setCurrentIndex(0);
          // Yeni turun ilk maçını ekrana ver
          setCurrentPair([updatedWinners[0], updatedWinners[1]]);
        }
        
      } else {
        // Mevcut tur devam ediyor, sıradaki maça (eşleşmeye) geç
        setWinners(updatedWinners);
        const nextIndex = currentIndex + 2;
        setCurrentIndex(nextIndex);
        setCurrentPair([currentRoundItems[nextIndex], currentRoundItems[nextIndex + 1]]);
      }

      // Animasyonları sıfırla
      fadeAnim.setValue(1);
      leftScale.setValue(1);
      rightScale.setValue(1);
      setAnimating(false);
    });
  };

  if (loading || !currentPair || !currentPair[0]) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Hazırlanıyor...</Text>
        </View>
      </View>
    );
  }

  const roundName = getRoundName(remainingItems.length);
  const progress = ((allItems.length - remainingItems.length) / (allItems.length - 1)) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <ArrowLeft size={24} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.tournamentTitle} numberOfLines={1}>
            {tournamentTitle}
          </Text>
          <Text style={styles.roundName}>{roundName}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {allItems.length - remainingItems.length} / {allItems.length - 1}
        </Text>
      </View>

      <View style={styles.gameContainer}>
        <Text style={styles.versusText}>Hangisini Seçiyorsun?</Text>

        <View style={styles.pairContainer}>
          
          {/* 1. SEÇENEK (SOL) */}
          <Animated.View
            style={[
              styles.itemContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: leftScale }],
              },
            ]}>
            <TouchableOpacity
              style={styles.itemTouchable}
              onPress={() => handleChoice(currentPair[0], currentPair[1])}
              disabled={animating}
              activeOpacity={0.9}>
              <Image
                source={{ uri: currentPair[0].image_url }}
                style={styles.itemImage}
                resizeMode="cover"
              />
              <View style={styles.itemOverlay}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {currentPair[0].name}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.vsContainer}>
            <View style={styles.vsBadge}>
              <Text style={styles.vsText}>VS</Text>
            </View>
          </View>

          {/* 2. SEÇENEK (SAĞ) - Korumalı hale getirildi */}
          <Animated.View
            style={[
              styles.itemContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: rightScale }],
              },
            ]}>
            {currentPair[1] && (
              <TouchableOpacity
                style={styles.itemTouchable}
                onPress={() => handleChoice(currentPair[1], currentPair[0])}
                disabled={animating}
                activeOpacity={0.9}>
                <Image 
                  source={{ uri: currentPair[1].image_url }} 
                  style={styles.itemImage}
                  resizeMode="cover"
                />
                <View style={styles.itemOverlay}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {currentPair[1].name}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </Animated.View>

        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
  },
  headerInfo: {
    flex: 1,
  },
  tournamentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  roundName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  gameContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  versusText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
  },
  pairContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  itemContainer: {
    flex: 1,
  },
  itemTouchable: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#2a2a2a',
    aspectRatio: 0.75,
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  vsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vsText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
  },
});
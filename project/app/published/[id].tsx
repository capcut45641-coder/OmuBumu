import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Share2, Home, Trophy } from 'lucide-react-native';

export default function PublishedScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTournament() {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error) setTournament(data);
      setLoading(false);
    }
    fetchTournament();
  }, [id]);

  const onShare = async () => {
    try {
      await Share.share({
        message: `${tournament?.title} turnuvası yayında! Hemen oyna: https://omu-bumu.app/game/${id}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  if (loading) return <View style={styles.container}><ActivityIndicator color="#8b5cf6" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.successIcon}>
        <CheckCircle2 size={80} color="#22c55e" />
      </View>
      
      <Text style={styles.title}>Tebrikler!</Text>
      <Text style={styles.subtitle}>Turnuvan başarıyla yayına alındı.</Text>

      {tournament && (
        <View style={styles.card}>
          <Image source={{ uri: tournament.cover_image }} style={styles.cover} />
          <Text style={styles.tournamentTitle}>{tournament.title}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push(`/game/${id}`)}>
          <Trophy size={20} color="#fff" />
          <Text style={styles.buttonText}>Turnuvaya Git</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={onShare}>
          <Share2 size={20} color="#fff" />
          <Text style={styles.buttonText}>Paylaş</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.textButton} onPress={() => router.push('/')}>
          <Home size={20} color="#888" />
          <Text style={styles.textButtonText}>Ana Sayfaya Dön</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center', padding: 20 },
  successIcon: { marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#aaa', textAlign: 'center', marginBottom: 40 },
  card: { width: '100%', backgroundColor: '#1a1a1a', borderRadius: 20, overflow: 'hidden', marginBottom: 40, borderWidth: 1, borderColor: '#333' },
  cover: { width: '100%', height: 200 },
  tournamentTitle: { padding: 20, fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  buttonContainer: { width: '100%', gap: 15 },
  primaryButton: { backgroundColor: '#8b5cf6', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  secondaryButton: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  textButton: { paddingVertical: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  textButtonText: { color: '#888', fontSize: 16, fontWeight: '600' }
});

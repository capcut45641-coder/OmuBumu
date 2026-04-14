import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { uploadImageFromUri, TOURNAMENT_MEDIA_BUCKET } from '@/lib/storage';
import { parsePublishError } from '@/lib/supabaseErrors';
import { ChevronDown, ImagePlus, ChevronRight, ChevronLeft } from 'lucide-react-native';

type BracketSize = 8 | 16 | 32;

type Competitor = {
  name: string;
  imageUri: string | null;
};

const DEFAULT_ITEM_IMAGE =
  'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800';

const bracketSizes: { value: BracketSize; label: string }[] = [
  { value: 8, label: "8'li" },
  { value: 16, label: "16'lı" },
  { value: 32, label: "32'li" },
];

export default function CreateScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [bracketSize, setBracketSize] = useState<BracketSize>(16);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth?redirect=/(tabs)/create');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    setCompetitors((prev) => {
      const next = prev.slice(0, bracketSize);
      while (next.length < bracketSize) {
        next.push({ name: '', imageUri: null });
      }
      return next;
    });
  }, [bracketSize]);

  const pickImage = useCallback(async (onPick: (uri: string) => void) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin gerekli', 'Galeriye erişim için izin verin.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      onPick(res.assets[0].uri);
    }
  }, []);

  const updateCompetitor = (index: number, patch: Partial<Competitor>) => {
    setCompetitors((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!title.trim()) {
        Alert.alert('Eksik bilgi', 'Turnuva başlığını girin.');
        return false;
      }
      return true;
    }
    if (s === 3) {
      const missingName = competitors.find((c) => !c.name.trim());
      if (missingName) {
        Alert.alert('Eksik bilgi', 'Tüm yarışmacılar için isim girin.');
        return false;
      }
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((x) => Math.min(3, x + 1));
  };

  const goBack = () => {
    setStep((x) => Math.max(1, x - 1));
  };

  const createTournament = async () => {
    if (!validateStep(3)) return;

    setCreating(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[create] getSession error:', sessionError);
        const parsed = parsePublishError(sessionError);
        Alert.alert(parsed.title, parsed.body);
        return;
      }

      if (!session?.user?.id) {
        console.error('[create] No session / user.id — cannot publish');
        Alert.alert(
          'Oturum bulunamadı',
          'Yayınlamak için giriş yapmanız gerekiyor. Lütfen çıkış yapıp tekrar giriş yapın.'
        );
        return;
      }

      const uid = session.user.id;
      console.log('[create] Publishing as user.id:', uid);

      const basePath = `${uid}/${Date.now()}`;

      let coverUrl: string;
      console.log('[create] Phase: cover image upload');
      if (coverUri) {
        coverUrl = await uploadImageFromUri(coverUri, `${basePath}/cover`);
      } else {
        const firstWithImage = competitors.find((c) => c.imageUri);
        if (firstWithImage?.imageUri) {
          coverUrl = await uploadImageFromUri(
            firstWithImage.imageUri,
            `${basePath}/cover`
          );
        } else {
          coverUrl = DEFAULT_ITEM_IMAGE;
          console.log('[create] Using default cover URL (no local upload)');
        }
      }
      console.log('[create] Cover resolved:', coverUrl.slice(0, 64) + (coverUrl.length > 64 ? '…' : ''));

      /* tournaments: cover_image + created_by (auth uid); tournament_items: image_url */
      const descTrimmed = description.trim();
      const insertRow = {
        title: title.trim(),
        description: descTrimmed ? descTrimmed : null,
        cover_image: coverUrl,
        bracket_size: bracketSize,
        play_count: 0,
        is_trending: false,
        created_by: uid,
      };
      console.log('[create] Phase: tournaments insert', {
        ...insertRow,
        cover_image: `(len ${insertRow.cover_image.length})`,
      });

      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert(insertRow)
        .select()
        .single();

      if (tournamentError) {
        console.error('[create] tournaments insert error:', {
          message: tournamentError.message,
          code: tournamentError.code,
          details: tournamentError.details,
          hint: tournamentError.hint,
        });
        throw tournamentError;
      }

      console.log('[create] Tournament row created, id:', tournament?.id);

      const itemsPayload = [];
      console.log('[create] Phase: competitor images + tournament_items');
      for (let i = 0; i < competitors.length; i++) {
        const c = competitors[i];
        let imageUrl = DEFAULT_ITEM_IMAGE;
        if (c.imageUri) {
          imageUrl = await uploadImageFromUri(
            c.imageUri,
            `${basePath}/item-${i}`
          );
        }
        itemsPayload.push({
          tournament_id: tournament.id,
          image_url: imageUrl,
          name: c.name.trim(),
          win_count: 0,
          total_count: 0,
        });
      }

      const { error: itemsError } = await supabase
        .from('tournament_items')
        .insert(itemsPayload);

      if (itemsError) {
        console.error('[create] tournament_items insert error:', {
          message: itemsError.message,
          code: itemsError.code,
          details: itemsError.details,
          hint: itemsError.hint,
        });
        throw itemsError;
      }

      console.log('[create] Success: items count', itemsPayload.length);

      Alert.alert('Başarılı', 'Turnuva oluşturuldu.', [
        {
          text: 'Tamam',
          onPress: () => {
            setTitle('');
            setDescription('');
            setCoverUri(null);
            setBracketSize(16);
            setStep(1);
            setCompetitors([]);
            router.push('/');
          },
        },
      ]);
    } catch (error) {
      console.error('[create] Publish failed (caught):', error);
      const parsed = parsePublishError(error);
      console.error('[create] Parsed for user:', parsed.logSummary);
      Alert.alert(
        parsed.title,
        `${parsed.body}\n\nDepo: "${TOURNAMENT_MEDIA_BUCKET}" ve .env değişkenlerini Supabase paneliyle karşılaştırın.`
      );
    } finally {
      setCreating(false);
    }
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
        <Text style={styles.headerTitle}>Yeni Turnuva Oluştur</Text>
        <Text style={styles.stepLabel}>
          Adım {step} / 3 —{' '}
          {step === 1 ? 'Genel' : step === 2 ? 'Boyut' : 'Yarışmacılar'}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>Turnuva bilgileri</Text>
            <Text style={styles.label}>Turnuva Başlığı</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: En İyi Türk Filmleri"
              placeholderTextColor="#666"
              value={title}
              onChangeText={setTitle}
              editable={!creating}
            />
            <Text style={styles.label}>Turnuva Açıklaması</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Turnuva hakkında kısa bir açıklama yazın..."
              placeholderTextColor="#666"
              value={description}
              onChangeText={setDescription}
              editable={!creating}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.label}>Turnuva kapak fotoğrafı</Text>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={() => pickImage(setCoverUri)}
              disabled={creating}>
              {coverUri ? (
                <Image source={{ uri: coverUri }} style={styles.coverPreview} />
              ) : (
                <>
                  <ImagePlus size={40} color="#666" strokeWidth={1.5} />
                  <Text style={styles.uploadText}>Kapak seçmek için dokun</Text>
                  <Text style={styles.uploadSubtext}>PNG veya JPG önerilir</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>Bracket boyutu</Text>
            <Text style={styles.label}>Kaç yarışmacı?</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowSizeDropdown(!showSizeDropdown)}
              disabled={creating}>
              <Text style={styles.dropdownText}>
                {bracketSizes.find((s) => s.value === bracketSize)?.label}
              </Text>
              <ChevronDown size={20} color="#8b5cf6" strokeWidth={2} />
            </TouchableOpacity>
            {showSizeDropdown && (
              <View style={styles.dropdownMenu}>
                {bracketSizes.map((size) => (
                  <TouchableOpacity
                    key={size.value}
                    style={[
                      styles.dropdownItem,
                      bracketSize === size.value && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setBracketSize(size.value);
                      setShowSizeDropdown(false);
                    }}>
                    <Text
                      style={[
                        styles.dropdownItemText,
                        bracketSize === size.value && styles.dropdownItemTextActive,
                      ]}>
                      {size.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={styles.helper}>
              Sonraki adımda {bracketSize} yarışmacı için isim ve görsel
              ekleyeceksin.
            </Text>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.sectionTitle}>Yarışmacılar ({bracketSize})</Text>
            <Text style={styles.helper}>
              Her satır bir seçenek. Görsel isteğe bağlı; boşsa varsayılan görsel
              kullanılır.
            </Text>
            {competitors.map((row, index) => (
              <View key={index} style={styles.competitorCard}>
                <View style={styles.competitorRow}>
                  <TouchableOpacity
                    style={styles.thumbWrap}
                    onPress={() =>
                      pickImage((uri) => updateCompetitor(index, { imageUri: uri }))
                    }>
                    {row.imageUri ? (
                      <Image
                        source={{ uri: row.imageUri }}
                        style={styles.thumb}
                      />
                    ) : (
                      <View style={styles.thumbPlaceholder}>
                        <ImagePlus size={22} color="#555" />
                      </View>
                    )}
                  </TouchableOpacity>
                  <TextInput
                    style={styles.competitorInput}
                    placeholder={`İsim ${index + 1}`}
                    placeholderTextColor="#666"
                    value={row.name}
                    onChangeText={(t) => updateCompetitor(index, { name: t })}
                    editable={!creating}
                  />
                </View>
              </View>
            ))}
          </>
        )}

        <View style={styles.navRow}>
          {step > 1 ? (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={goBack}
              disabled={creating}>
              <ChevronLeft size={20} color="#a78bfa" />
              <Text style={styles.secondaryBtnText}>Geri</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.navSpacer} />
          )}
          {step < 3 ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={goNext}
              disabled={creating}>
              <Text style={styles.primaryBtnText}>İleri</Text>
              <ChevronRight size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, creating && styles.primaryBtnDisabled]}
              onPress={createTournament}
              disabled={creating}>
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Turnuvayı Yayınla</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
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
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  stepLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 20,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
    marginBottom: 20,
  },
  uploadBox: {
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#2a2a2a',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  coverPreview: { width: '100%', height: 180, borderRadius: 10 },
  uploadText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
    marginTop: 10,
  },
  uploadSubtext: { fontSize: 13, color: '#666', marginTop: 4 },
  dropdown: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  dropdownMenu: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  dropdownItemActive: { backgroundColor: '#2a1a4a' },
  dropdownItemText: { fontSize: 16, color: '#fff', fontWeight: '500' },
  dropdownItemTextActive: { color: '#8b5cf6', fontWeight: '800' },
  helper: {
    fontSize: 14,
    color: '#777',
    lineHeight: 20,
    marginTop: 16,
  },
  competitorCard: {
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 12,
    marginBottom: 10,
  },
  competitorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumbWrap: { borderRadius: 10, overflow: 'hidden' },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  competitorInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  navSpacer: { flex: 1 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8b5cf6',
    backgroundColor: '#1a1a1a',
  },
  secondaryBtnText: { color: '#a78bfa', fontWeight: '800', fontSize: 16 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 16,
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

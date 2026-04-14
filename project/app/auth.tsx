import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const afterAuth = () => {
    const path =
      typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/';
    router.replace(path as never);
  };

  const onEmailAuth = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Eksik bilgi', 'E-posta ve şifre girin.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        afterAuth();
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        Alert.alert(
          'Hesap oluşturuldu',
          'E-postanızı doğrulamanız gerekebilir. Ardından giriş yapabilirsiniz.',
          [{ text: 'Tamam', onPress: () => setMode('login') }]
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Bir hata oluştu';
      Alert.alert('Hata', msg);
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setBusy(true);
    try {
      const redirectTo = makeRedirectUri({ scheme: 'omu-bumu' });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('OAuth URL alınamadı');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        const fragment = result.url.split('#')[1];
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) throw sessionError;
            afterAuth();
            return;
          }
        }
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          result.url
        );
        if (!exchangeError) {
          afterAuth();
          return;
        }
      }

      if (result.type === 'cancel') return;
      Alert.alert(
        'Google ile giriş',
        'Oturum tamamlanamadı. Supabase panelinde Google sağlayıcısı ve yönlendirme adreslerini kontrol edin veya e-posta ile devam edin.'
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Bir hata oluştu';
      Alert.alert('Hata', msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>‹ Geri</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Hesabın</Text>
          <Text style={styles.subtitle}>
            Turnuva oluşturmak için giriş yap veya kayıt ol.
          </Text>
        </View>

        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'login' && styles.segmentBtnActive]}
            onPress={() => setMode('login')}
            disabled={busy}>
            <Text
              style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>
              Giriş Yap
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'signup' && styles.segmentBtnActive]}
            onPress={() => setMode('signup')}
            disabled={busy}>
            <Text
              style={[styles.segmentText, mode === 'signup' && styles.segmentTextActive]}>
              Kayıt Ol
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.googleBtn}
          onPress={onGoogle}
          disabled={busy}
          activeOpacity={0.85}>
          <Text style={styles.googleBtnText}>Google ile Devam Et</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.label}>E-posta</Text>
        <TextInput
          style={styles.input}
          placeholder="ornek@eposta.com"
          placeholderTextColor="#666"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!busy}
        />

        <Text style={styles.label}>Şifre</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#666"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!busy}
        />

        <TouchableOpacity
          style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
          onPress={onEmailAuth}
          disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f0f0f' },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: { marginBottom: 28 },
  back: { color: '#a78bfa', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: { fontSize: 15, color: '#888', lineHeight: 22 },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: '#2a1a4a' },
  segmentText: { color: '#888', fontWeight: '700', fontSize: 15 },
  segmentTextActive: { color: '#fff' },
  googleBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  googleBtnText: { color: '#111', fontWeight: '700', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2a2a2a' },
  dividerText: { color: '#666', fontSize: 13, fontWeight: '600' },
  label: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 14,
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
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
});

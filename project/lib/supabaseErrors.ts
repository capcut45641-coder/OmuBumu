/**
 * Kullanıcıya gösterilecek ve loglanacak Supabase / ağ hata metinleri.
 */

export type ParsedClientError = {
  /** Alert başlığı */
  title: string;
  /** Alert gövdesi (kod + ipucu dahil) */
  body: string;
  /** console.error için tek satır özet */
  logSummary: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/**
 * Turnuva yayınlama ve depo yüklemesi için hata açıklaması üretir.
 * Postgres (42P01, 42501), PostgREST, Storage HTTP kodları ve ağ hatalarını kapsar.
 */
export function parsePublishError(error: unknown): ParsedClientError {
  const networkFailed =
    error instanceof Error &&
    (/network request failed/i.test(error.message) ||
      error.message === 'Network request failed');

  if (networkFailed) {
    return {
      title: 'Ağ hatası',
      body:
        'İstek tamamlanamadı (Network request failed).\n\n' +
        '• İnternet bağlantınızı kontrol edin.\n' +
        '• EXPO_PUBLIC_SUPABASE_URL değerinin doğru olduğundan emin olun.\n' +
        '• Yerel görsel yüklemede sorun sürerse uygulamayı yeniden başlatın.',
      logSummary: 'Network request failed',
    };
  }

  if (error instanceof Error && error.message.includes('readAsStringAsync')) {
    return {
      title: 'Dosya okuma',
      body:
        'Görsel dosyası okunamadı.\n\n' +
        error.message +
        '\n\nTeknik: expo-file-system legacy API kullanıldığından emin olun.',
      logSummary: error.message,
    };
  }

  if (!isRecord(error)) {
    const msg = String(error);
    return {
      title: 'Yayınlama hatası',
      body: msg,
      logSummary: msg,
    };
  }

  const message =
    typeof error.message === 'string' ? error.message : String(error);
  const code = typeof error.code === 'string' ? error.code : undefined;
  const details = typeof error.details === 'string' ? error.details : undefined;
  const hint = typeof error.hint === 'string' ? error.hint : undefined;
  const statusCode =
    typeof error.statusCode === 'string' || typeof error.statusCode === 'number'
      ? String(error.statusCode)
      : typeof error.status === 'string' || typeof error.status === 'number'
        ? String(error.status)
        : undefined;

  const lines: string[] = [message];
  if (details) lines.push(`Ayrıntı: ${details}`);
  if (hint) lines.push(`İpucu: ${hint}`);

  const codeParts: string[] = [];
  if (code) codeParts.push(`Kod: ${code}`);
  if (statusCode) codeParts.push(`HTTP: ${statusCode}`);
  if (codeParts.length) lines.push(codeParts.join(' | '));

  let extra = '';
  if (
    code === '42501' ||
    statusCode === '403' ||
    /permission denied|row-level security|RLS/i.test(message)
  ) {
    extra +=
      '\n\n• Olası neden: RLS politikası veya Storage bucket politikası (403 / 42501).';
  }
  if (
    code === '42P01' ||
    /relation .* does not exist|undefined column|column .* does not exist/i.test(
      message
    )
  ) {
    extra +=
      '\n\n• Olası neden: Tablo veya sütun yok — Supabase SQL ile şemayı güncelleyin (42P01).';
  }
  if (/JWT|invalid.*token|not authenticated/i.test(message)) {
    extra += '\n\n• Oturum süresi dolmuş olabilir; çıkış yapıp tekrar giriş yapın.';
  }

  const body = lines.join('\n') + extra;

  return {
    title: 'Yayınlama hatası',
    body,
    logSummary: [code, statusCode, message].filter(Boolean).join(' — '),
  };
}

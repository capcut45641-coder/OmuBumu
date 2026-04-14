import { Share, Platform } from 'react-native';

const RESULTS_BASE_PATH = 'https://omu-bumu.app/results';

export function getTournamentResultsUrl(tournamentId: string): string {
  return `${RESULTS_BASE_PATH}/${tournamentId}`;
}

/**
 * Native paylaşım sayfası (WhatsApp, Instagram vb.) — metin ve sonuç bağlantısı.
 * URL paylaşımı için React Native Share kullanılır; expo-sharing dosya paylaşımı içindir.
 */
export async function shareTournamentResultsLink(options: {
  tournamentId: string;
  title?: string;
  /** Örn. kazanan satırı — paylaşım metninin başına eklenir */
  leadLine?: string;
}): Promise<void> {
  const url = getTournamentResultsUrl(options.tournamentId);
  const prefix = options.title
    ? `«${options.title}» — O mu Bu mu? `
    : 'O mu Bu mu? ';
  let message = `${prefix}Sonuçları görüntüle: ${url}`;
  if (options.leadLine?.trim()) {
    message = `${options.leadLine.trim()}\n\n${message}`;
  }

  try {
    await Share.share(
      Platform.select({
        ios: { message, url },
        default: { message },
      }) ?? { message }
    );
  } catch (e) {
    console.warn('Paylaşım iptal edildi veya başarısız', e);
  }
}

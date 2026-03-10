/**
 * 공유 유틸 - Web Share API + 클립보드 폴백
 */

export async function shareContent(options: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<{ success: boolean; method?: 'share' | 'clipboard'; error?: string }> {
  const url = options.url || (typeof window !== 'undefined' ? window.location.href : '');
  const fullUrl = url.startsWith('http') ? url : (typeof window !== 'undefined' ? `${window.location.origin}${url.startsWith('/') ? url : `/${url}`}` : url);

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: options.title || '결 GYEOL',
        text: options.text,
        url: fullUrl,
      });
      return { success: true, method: 'share' };
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return { success: false, error: 'cancelled' };
      }
    }
  }

  try {
    const toCopy = options.text ? `${options.text}\n${fullUrl}` : fullUrl;
    await navigator.clipboard.writeText(toCopy);
    return { success: true, method: 'clipboard' };
  } catch {
    return { success: false, error: 'clipboard_failed' };
  }
}

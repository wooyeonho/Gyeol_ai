/**
 * 공유 유틸 - Web Share API + 클립보드 폴백
 * UTM/ref 파라미터 자동 추가
 */

export function appendTrackingParams(url: string, options?: { ref?: string; utm_source?: string; utm_medium?: string }): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `${typeof window !== 'undefined' ? window.location.origin : ''}${url.startsWith('/') ? url : `/${url}`}`);
    if (options?.ref) u.searchParams.set('ref', options.ref);
    if (options?.utm_source) u.searchParams.set('utm_source', options.utm_source);
    if (options?.utm_medium) u.searchParams.set('utm_medium', options.utm_medium || 'share');
    return u.toString();
  } catch {
    return url;
  }
}

export async function shareContent(options: {
  title?: string;
  text?: string;
  url?: string;
  ref?: string;
  utm_source?: string;
}): Promise<{ success: boolean; method?: 'share' | 'clipboard'; error?: string }> {
  const baseUrl = options.url || (typeof window !== 'undefined' ? window.location.href : '');
  const fullUrl = appendTrackingParams(baseUrl, {
    ref: options.ref,
    utm_source: options.utm_source || 'gyeol',
    utm_medium: 'share',
  });

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

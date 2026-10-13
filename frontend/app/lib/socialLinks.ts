import { instagramHandle } from './instagram';

export const SOCIAL_PLATFORMS = ['instagram', 'facebook', 'tiktok', 'youtube', 'whatsapp', 'telegram', 'x', 'linkedin', 'pinterest'] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  x: 'X',
  linkedin: 'LinkedIn',
  pinterest: 'Pinterest',
};

export function parseSocialLinks(value?: string | SocialLink[] | null, legacyInstagram?: string | null): SocialLink[] {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = null;
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.flatMap((entry): SocialLink[] => {
      if (!entry || typeof entry !== 'object') return [];
      const { platform, url } = entry as Record<string, unknown>;
      if (!SOCIAL_PLATFORMS.includes(platform as SocialPlatform) || typeof url !== 'string') return [];
      const trimmedUrl = url.trim();
      if (!/^https:\/\//i.test(trimmedUrl)) return [];
      return [{ platform: platform as SocialPlatform, url: trimmedUrl }];
    });
  }

  // Profiles created before social links were introduced stored a bare Instagram handle.
  const handle = instagramHandle(legacyInstagram);
  return handle ? [{ platform: 'instagram', url: `https://www.instagram.com/${handle}` }] : [];
}

export function normalizeSocialUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || /^https:\/\//i.test(trimmed)) return trimmed;
  if (/^http:\/\//i.test(trimmed)) return `https://${trimmed.slice(7)}`;
  return `https://${trimmed}`;
}

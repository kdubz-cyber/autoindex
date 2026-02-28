export type ParsedUrl = {
  isValid: boolean;
  normalized?: string;
  hostname?: string;
  error?: string;
};

export function parseUrl(input: string): ParsedUrl {
  const raw = input.trim();
  if (!raw) {
    return { isValid: false, error: 'Paste a listing URL to continue.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { isValid: false, error: 'Enter a valid URL (example: https://...)' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, error: 'Only http:// or https:// links are supported.' };
  }

  return {
    isValid: true,
    normalized: parsed.toString(),
    hostname: parsed.hostname
  };
}

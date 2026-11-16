/**
 * Reads a time typed by a coach: "1:05:30", "30:00" or "30" (minutes, how people say "phút 30").
 * Returns seconds, null for an empty field and NaN when the text is not a time.
 */
export const parseClock = (text: string): number | null => {
  const value = text.trim();
  if (!value) return null;
  if (/^\d+([.,]\d+)?$/.test(value)) return Math.round(parseFloat(value.replace(',', '.')) * 60);
  const parts = value.split(':');
  if (parts.length > 3 || parts.some(p => !/^\d+$/.test(p))) return NaN;
  const numbers = parts.map(Number);
  // Minutes and seconds after the first part must stay under 60.
  if (numbers.slice(1).some(n => n >= 60)) return NaN;
  return numbers.reduce((total, n) => total * 60 + n, 0);
};

/** 95 -> "1:35", 3725 -> "1:02:05". */
export const formatLongClock = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`;
};

/** "30:00 – 40:00", "30:00 – hết video", or null for the whole video. */
export const segmentLabel = (start?: number | null, end?: number | null): string | null => {
  if (!start && end == null) return null;
  return `${formatLongClock(start ?? 0)} – ${end != null ? formatLongClock(end) : 'hết video'}`;
};

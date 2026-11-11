/** Vietnamese names of the stroke classes, for coaches reading the replay. */
const STROKE_LABELS: Record<string, string> = {
  SMASH: 'Đập cầu',
  DROP: 'Bỏ nhỏ',
  CLEAR: 'Phông cầu',
  SERVE: 'Giao cầu',
  LIFT: 'Hất cầu',
  DRIVE: 'Tạt cầu',
  NET_SHOT: 'Kéo lưới',
  NET_ATTACK: 'Vồ lưới',
  PUSH: 'Đẩy cầu',
  UNKNOWN: 'Cú khác',
};

/** "Đập cầu" for SMASH; unknown classes fall back to a readable form of the code. */
export const strokeLabel = (stroke?: string | null): string => {
  const key = (stroke ?? 'UNKNOWN').toUpperCase();
  return STROKE_LABELS[key] ?? key.replace(/_/g, ' ').toLowerCase();
};

/** Lower-case form for use inside a sentence: "cú đập cầu". */
export const strokeLabelLower = (stroke?: string | null): string => strokeLabel(stroke).toLowerCase();

/** Below this model confidence a hit is marked "cần xem lại" instead of showing a percentage. */
export const LOW_CONFIDENCE = 0.6;

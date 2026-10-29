// Aroundhead là cú thuận tay đánh vòng qua đầu; model phân biệt nó kém nên giao diện gộp vào thuận tay.
export function normalizeStrokeSide(side: string | undefined): 'FOREHAND' | 'BACKHAND' | 'UNKNOWN' {
  const value = (side || '').toUpperCase().replace(/[_-]/g, '');
  if (value === 'FOREHAND' || value === 'AROUNDHEAD') return 'FOREHAND';
  if (value === 'BACKHAND') return 'BACKHAND';
  return 'UNKNOWN';
}

export function strokeSideLabel(side: string | undefined): string {
  switch (normalizeStrokeSide(side)) {
    case 'FOREHAND':
      return 'Thuận tay';
    case 'BACKHAND':
      return 'Trái tay';
    default:
      return '';
  }
}

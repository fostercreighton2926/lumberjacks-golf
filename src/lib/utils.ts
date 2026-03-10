export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function formatScore(score: number | null): string {
  if (score === null) return '--';
  if (score === 0) return 'E';
  if (score > 0) return `+${score}`;
  return `${score}`;
}

export function isBeforeDeadline(deadline: Date): boolean {
  return new Date() < new Date(deadline);
}

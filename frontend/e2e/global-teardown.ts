import fs from 'node:fs';
import { apiContext, readState, STATE_FILE } from './helpers';

// Soft-deletes every match the throw-away account created. Set E2E_KEEP_DATA=1 to keep them.
export default async function globalTeardown(): Promise<void> {
  if (!fs.existsSync(STATE_FILE) || process.env.E2E_KEEP_DATA) return;
  const state = readState();
  const login = await (await apiContext()).post('/api/auth/login', {
    data: { email: state.email, password: state.password },
  });
  if (!login.ok()) return;
  const api = await apiContext((await login.json()).accessToken);
  const mine = await api.get('/api/matches', { params: { page: 0, size: 100 } });
  for (const match of (await mine.json()).data ?? []) {
    await api.delete(`/api/matches/${match.id}`);
  }
  await api.dispose();
}

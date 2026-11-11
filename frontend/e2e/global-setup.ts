import fs from 'node:fs';
import { apiContext, STATE_FILE, writeState } from './helpers';

// Registers a throw-away ROLE_USER account so test data never mixes with real users.
export default async function globalSetup(): Promise<void> {
  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
  const api = await apiContext();
  const email = `e2e_${Date.now()}@badminton.vn`;
  const password = 'E2eTest@123';

  const register = await api.post('/api/auth/register', {
    data: { email, password, fullName: 'E2E Tester', badmintonLevel: 'INTERMEDIATE', gender: 'MALE', age: 22 },
  });
  if (!register.ok()) throw new Error(`register failed: ${register.status()} ${await register.text()}`);

  const login = await api.post('/api/auth/login', { data: { email, password } });
  if (!login.ok()) throw new Error(`login failed: ${login.status()} ${await login.text()}`);
  const body = await login.json();
  writeState({ email, password, accessToken: body.accessToken, refreshToken: body.refreshToken, user: body.user });
  await api.dispose();
}

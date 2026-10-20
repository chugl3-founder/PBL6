import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginRequest, RegisterRequest } from '../types/auth';
import { authApi } from '../api/authApi';
import { TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Khôi phục phiên đăng nhập khi mở App
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Đồng bộ lại thông tin mới nhất từ máy chủ trong background
          authApi
            .getCurrentUser()
            .then((freshUser) => {
              setUser(freshUser);
              AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(freshUser));
            })
            .catch(() => {
              // Nếu token hết hạn hoặc lỗi mạng, interceptor hoặc lần gọi tiếp theo sẽ xử lý
            });
        }
      } catch (e) {
        console.warn('Lỗi khi khôi phục phiên đăng nhập:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (data: LoginRequest) => {
    const res = await authApi.login(data);
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, res.accessToken);
    await AsyncStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, res.refreshToken);
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));

    setToken(res.accessToken);
    setUser(res.user);
  };

  const register = async (data: RegisterRequest) => {
    // 1. Tạo tài khoản người dùng mới trên backend
    await authApi.register(data);
    // 2. Tự động đăng nhập để nhận JWT token và profile
    await login({
      email: data.email,
      password: data.password,
    });
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


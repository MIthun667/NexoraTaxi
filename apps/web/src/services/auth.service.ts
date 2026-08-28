import { apiClient } from '@/lib/api-client';
import { LoginResponse } from '@/types/auth';

export const authService = {
  login(email: string, password: string) {
    return apiClient.post<LoginResponse>('/auth/login', { email, password });
  },
  me() {
    return apiClient.get<LoginResponse['user']>('/auth/me');
  },
};

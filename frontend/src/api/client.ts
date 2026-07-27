// 백엔드와 통신하는 단일 axios 인스턴스. 요청에 JWT를 자동으로 싣고, 401 응답 시 로그아웃 처리한다.
import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const API_ORIGIN = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export const apiClient = axios.create({ baseURL: `${API_ORIGIN}/api` });

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // 토큰 만료/무효 시 전역 로그아웃 — 라우터의 ProtectedRoute가 /login으로 되돌린다.
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

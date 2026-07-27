// 라우트 정의. 인증 여부에 따라 /login <-> /dashboard로 갈린다(SPEC F5).
import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { ProtectedRoute } from "@/router/ProtectedRoute";
import { useAuthStore } from "@/store/authStore";

export default function App() {
  const token = useAuthStore((state) => state.token);
  const fallback = token ? "/dashboard" : "/login";

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to={fallback} replace />} />
      <Route path="*" element={<Navigate to={fallback} replace />} />
    </Routes>
  );
}

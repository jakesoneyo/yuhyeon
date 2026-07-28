// 로그인 화면. 일반 로그인 폼 + 데모 관리자 원클릭 로그인 버튼(SPEC §5) 제공.
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Building2, LogIn } from "lucide-react";
import { login } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "admin";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const mutation = useMutation({
    mutationFn: (credentials: { username: string; password: string }) =>
      login(credentials.username, credentials.password),
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user);
      navigate("/dashboard", { replace: true });
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({ username, password });
  };

  // 원클릭 데모 로그인: 폼에도 값이 보이도록 채운 뒤 즉시 로그인 시도한다.
  const handleDemoLogin = () => {
    setUsername(DEMO_USERNAME);
    setPassword(DEMO_PASSWORD);
    mutation.mutate({ username: DEMO_USERNAME, password: DEMO_PASSWORD });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-text">
          <Building2 className="text-accent" size={24} />
          <span className="text-lg font-bold">유현건설</span>
        </div>
        <p className="mb-6 text-sm text-muted">
          건설현장 계측 데이터 모니터링 대시보드
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-text">
            아이디
            <input
              className="rounded-chip border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="user@example.com"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text">
            비밀번호
            <input
              type="password"
              className="rounded-chip border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          {mutation.isError && (
            <p className="text-sm text-danger" role="alert">
              아이디 또는 비밀번호가 올바르지 않습니다.
            </p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="mt-2 flex items-center justify-center gap-2 rounded-chip bg-accent px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
          >
            <LogIn size={16} />
            로그인
          </button>
        </form>

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={mutation.isPending}
          className="mt-3 w-full rounded-chip border border-accent bg-accent-soft px-4 py-2 text-sm font-semibold text-accent transition disabled:opacity-60"
        >
          회원가입 없이 데모로 둘러보기
        </button>
        <p className="mt-2 text-center text-xs text-muted">
          회원가입 없이 admin 계정으로 바로 대시보드를 체험할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

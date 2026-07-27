// 사람 경계 인증 API 호출. 응답은 Zod로 파싱해 계약 이탈을 즉시 드러낸다.
import { apiClient } from "./client";
import { loginResponseSchema } from "@/types/auth.schema";

/** 로그인. 실패(401)는 axios 예외로 전달되어 호출부(useMutation)의 onError에서 처리된다. */
export async function login(username: string, password: string) {
  const { data } = await apiClient.post("/auth/login", { username, password });
  return loginResponseSchema.parse(data);
}

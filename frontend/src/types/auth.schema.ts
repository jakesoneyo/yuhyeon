// 백엔드 /api/auth* 응답 계약(API.md)을 검증하는 Zod 스키마.
import { z } from "zod";

export const authUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  role: z.enum(["ADMIN", "USER"]),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  user: authUserSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

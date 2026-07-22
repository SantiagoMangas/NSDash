import { post } from "@/lib/api/client";

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return post<LoginResponse>("/auth/login", {
    email,
    password,
  });
}

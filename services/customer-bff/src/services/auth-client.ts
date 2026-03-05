/**
 * Auth Service Client — Typed wrapper for calling Auth Service endpoints.
 *
 * Instead of raw HTTP calls scattered throughout routes, we centralize
 * all Auth Service interactions here. Benefits:
 * - Type-safe: return types match what Auth Service actually returns
 * - One place to update if Auth Service API changes
 * - Easy to mock in tests
 */

import { type AuthTokens, type UserRole } from '@dashdine/types';

import { ServiceClient } from '../lib/service-client.js';

interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  firstName: string;
  role: UserRole;
}

interface RegisterResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export class AuthClient {
  private readonly client: ServiceClient;

  constructor(client: ServiceClient) {
    this.client = client;
  }

  async register(data: {
    email?: string;
    phone?: string;
    password?: string;
    firstName: string;
    lastName?: string;
  }): Promise<RegisterResponse> {
    return this.client.post<RegisterResponse>('/api/v1/auth/register', data);
  }

  async login(data: { email: string; password: string }): Promise<LoginResponse> {
    return this.client.post<LoginResponse>('/api/v1/auth/login', data);
  }

  async refresh(data: { refreshToken: string }): Promise<RefreshResponse> {
    return this.client.post<RefreshResponse>('/api/v1/auth/refresh', data);
  }

  async logout(data: { refreshToken: string }): Promise<void> {
    await this.client.post('/api/v1/auth/logout', data);
  }
}

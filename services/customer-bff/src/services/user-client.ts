/**
 * User Service Client — Typed wrapper for calling User Service endpoints.
 */

import { ServiceClient } from '../lib/service-client.js';

interface UserProfile {
  id: string;
  firstName: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  defaultAddressId?: string;
  preferredLanguage: string;
  createdAt: string;
  updatedAt: string;
}

interface Address {
  id: string;
  userId: string;
  label: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: string;
  longitude: string;
  isDefault: boolean;
  createdAt: string;
}

export class UserClient {
  private readonly client: ServiceClient;

  constructor(client: ServiceClient) {
    this.client = client;
  }

  async getProfile(userId: string): Promise<UserProfile> {
    return this.client.get<UserProfile>(`/api/v1/users/profiles/${userId}`);
  }

  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      displayName?: string;
      avatarUrl?: string;
      dateOfBirth?: string;
      gender?: string;
      preferredLanguage?: string;
    },
  ): Promise<UserProfile> {
    return this.client.put<UserProfile>(`/api/v1/users/profiles/${userId}`, data);
  }

  async getAddresses(userId: string): Promise<Address[]> {
    return this.client.get<Address[]>(`/api/v1/users/profiles/${userId}/addresses`);
  }

  async addAddress(
    userId: string,
    data: {
      label: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      postalCode: string;
      latitude: number;
      longitude: number;
      isDefault?: boolean;
    },
  ): Promise<Address> {
    return this.client.post<Address>(`/api/v1/users/profiles/${userId}/addresses`, data);
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    await this.client.delete(`/api/v1/users/profiles/${userId}/addresses/${addressId}`);
  }
}

import { supabase } from "../supabaseClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Request failed");
  }

  return data;
}

export type Address = {
  address_id: number;
  user_id: string;
  label: string | null;
  street_line_1: string;
  street_line_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AddressPayload = {
  label?: string | null;
  street_line_1: string;
  street_line_2?: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default?: boolean;
};

type GetAddressesResponse = {
  status: string;
  addresses: Address[];
};

type CreateAddressResponse = {
  status: string;
  address: Address;
};

type UpdateAddressResponse = {
  status: string;
  address: Address;
};

type DeleteAddressResponse = {
  status: string;
  message: string;
  address: {
    address_id: number;
    user_id: string;
  };
};

export async function getMyAddresses(): Promise<Address[]> {
  const data = await apiFetch<GetAddressesResponse>("/profile/me/addresses");
  return data.addresses;
}

export async function createMyAddress(payload: AddressPayload): Promise<Address> {
  const data = await apiFetch<CreateAddressResponse>("/profile/me/addresses", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return data.address;
}

export async function updateMyAddress(
  addressId: number,
  payload: AddressPayload
): Promise<Address> {
  const data = await apiFetch<UpdateAddressResponse>(`/profile/me/addresses/${addressId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return data.address;
}

export async function deleteMyAddress(addressId: number): Promise<number> {
  const data = await apiFetch<{
    status: string;
    message: string;
    address: {
      address_id: number;
      user_id: string;
    };
  }>(`/profile/me/addresses/${addressId}`, {
    method: "DELETE",
  });

  return data.address.address_id;
}

export type Profile = {
  account_id: number;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  country: string | null;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
};

export type UpdateProfilePayload = {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  country?: string | null;
  avatar_url?: string | null;
};

type GetProfileResponse = {
  status: string;
  profile: Profile;
};

type UpdateProfileResponse = {
  status: string;
  profile: Profile;
};

export async function getMyProfile(): Promise<Profile> {
  const data = await apiFetch<GetProfileResponse>("/profile/me");
  return data.profile;
}

export async function updateMyProfile(
  payload: UpdateProfilePayload
): Promise<Profile> {
  const data = await apiFetch<UpdateProfileResponse>("/profile/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  return data.profile;
}

export type UserBadge = {
  badge_id: number;
  name: string;
  description: string | null;
  icon_url: string | null;
  type: string | null;
  created_at?: string;
  earned_at?: string;
};

type GetMyBadgesResponse = {
  status: string;
  badges: UserBadge[];
};

export async function getMyBadges(): Promise<UserBadge[]> {
  const data = await apiFetch<GetMyBadgesResponse>("/profile/me/badges");
  return data.badges;
}
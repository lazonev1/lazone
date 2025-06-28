export type UserRole = 'requester' | 'provider' | 'admin';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  role: UserRole;
  preferences?: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  notifications: boolean;
  emailUpdates: boolean;
  language: string;
  currency: string;
  theme: 'light' | 'dark' | 'system';
}

export interface MenuItem {
  id: string;
  label: string;
  route: string;
  icon?: string;
  requiresAuth?: boolean;
  roleAccess?: UserRole[];
}
export interface PaymentMethod {
  id: number;
  vendor: string
  label: string;
  type: 'mobile';
  vendorLogoSource: string;
  isDefault?: boolean;
  mobileNumber: string;
};

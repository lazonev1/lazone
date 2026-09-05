import { Certification, CertificationErrors, CertificationValidationResult } from '@/types/provider';
import i18n from '@/localization';

export type ValidationError = {
  field: string;
  message: string;
};

// Validation rules
const validateRequired = (value: any): string | null => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return i18n.t('common:validation.required');
  }
  return null;
};

const validatePrice = (value: string): string | null => {
  if (!/^\d+$/.test(value)) {
    return i18n.t('common:validation.invalidPrice');
  }
  return null;
};

const validateDate = (value: string): string | null => {
  if (!/^\d{2}\/\d{4}$/.test(value)) {
    return i18n.t('common:validation.dateFormat');
  }
  return null;
};

// Validation functions for each form
export const validateBusinessInfo = (data: any) => {
  const errors: Record<string, string> = {};

  if (!data.businessName) errors.businessName = validateRequired(data.businessName) ?? i18n.t('common:validation.required');
  if (!data.serviceCategory) errors.serviceCategory = validateRequired(data.serviceCategory) ?? i18n.t('common:validation.required');
  if (!data.description) errors.description = validateRequired(data.description) ?? i18n.t('common:validation.required');
  
  // Location validation
  if (!data.location || !data.location.country) {
    errors.country = validateRequired(data?.location?.country) ?? i18n.t('common:validation.required');
  }
  if (!data.location || !data.location.city) {
    errors.city = validateRequired(data?.location?.city) ?? i18n.t('common:validation.required');
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateService = (service: any) => {
  const errors: Record<string, string> = {};

  if (!service.name?.trim()) errors.name = validateRequired(service.name) ?? i18n.t('common:validation.required');
  const priceError = validatePrice(service.price?.trim?.() ?? '');
  if (priceError) errors.price = priceError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateCertification = (cert: Certification): CertificationValidationResult => {
  const errors: CertificationErrors = {};

  // Basic field validation
  if (!cert.name?.trim()) errors.name = i18n.t('common:validation.requiredShort');
  if (!cert.issuer?.trim()) errors.issuer = i18n.t('common:validation.requiredShort');
  
  // Date validation with format check
  if (!cert.date?.trim()) {
    errors.date = i18n.t('common:validation.requiredShort');
  } else if (!/^\d{2}\/\d{4}$/.test(cert.date)) {
    errors.date = i18n.t('common:validation.dateFormatShort');
  }

  // Document validation
  if (!cert.document) errors.document = i18n.t('common:validation.requiredShort');

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

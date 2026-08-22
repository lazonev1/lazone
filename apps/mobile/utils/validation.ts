import { Certification, CertificationErrors, CertificationValidationResult } from '@/types/provider';

export type ValidationError = {
  field: string;
  message: string;
};

// Validation rules
const validateRequired = (value: any): string | null => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return 'This field is required';
  }
  return null;
};

const validatePrice = (value: string): string | null => {
  if (!/^\d+$/.test(value)) {
    return 'Please enter a valid price';
  }
  return null;
};

const validateDate = (value: string): string | null => {
  if (!/^\d{2}\/\d{4}$/.test(value)) {
    return 'Date must be in MM/YYYY format';
  }
  return null;
};

// Validation functions for each form
export const validateBusinessInfo = (data: any) => {
  const errors: Record<string, string> = {};

  if (!data.businessName) errors.businessName = validateRequired(data.businessName) ?? 'This field is required';
  if (!data.serviceCategory) errors.serviceCategory = validateRequired(data.serviceCategory) ?? 'This field is required';
  if (!data.description) errors.description = validateRequired(data.description) ?? 'This field is required';
  
  // Location validation
  if (!data.location || !data.location.country) {
    errors.country = validateRequired(data?.location?.country) ?? 'This field is required';
  }
  if (!data.location || !data.location.city) {
    errors.city = validateRequired(data?.location?.city) ?? 'This field is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateService = (service: any) => {
  const errors: Record<string, string> = {};

  if (!service.name?.trim()) errors.name = validateRequired(service.name) ?? 'This field is required';
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
  if (!cert.name?.trim()) errors.name = 'Required';
  if (!cert.issuer?.trim()) errors.issuer = 'Required';
  
  // Date validation with format check
  if (!cert.date?.trim()) {
    errors.date = 'Required';
  } else if (!/^\d{2}\/\d{4}$/.test(cert.date)) {
    errors.date = 'Use MM/YYYY format';
  }

  // Document validation
  if (!cert.document) errors.document = 'Required';

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

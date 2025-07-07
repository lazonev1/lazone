import { ServiceItem, Certification, CertificationErrors } from '@/types/provider';

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

  if (!data.businessName) errors.businessName = validateRequired(data.businessName);
  if (!data.serviceCategory) errors.serviceCategory = validateRequired(data.serviceCategory);
  if (!data.description) errors.description = validateRequired(data.description);
  
  // Location validation
  if (!data.location || !data.location.country) {
    errors.country = validateRequired(data?.location?.country);
  }
  if (!data.location || !data.location.city) {
    errors.city = validateRequired(data?.location?.city);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateService = (service: any) => {
  const errors: Record<string, string> = {};

  if (!service.name) errors.name = validateRequired(service.name);
  const priceError = validatePrice(service.price);
  if (priceError) errors.price = priceError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateCertification = (cert: Certification): CertificationErrors => {
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

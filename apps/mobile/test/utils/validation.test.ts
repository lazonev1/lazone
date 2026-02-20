import {
  validateBusinessInfo,
  validateService,
  validateCertification,
} from '../../utils/validation';

describe('validateBusinessInfo', () => {
  it('returns valid when all required fields are present', () => {
    const data = {
      businessName: 'My Business',
      serviceCategory: 'Plumbing',
      description: 'We fix pipes',
      location: { country: 'Canada', city: 'Montreal' },
    };
    const result = validateBusinessInfo(data);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('returns errors when all fields are missing', () => {
    const result = validateBusinessInfo({});
    expect(result.isValid).toBe(false);
    expect(result.errors.businessName).toBeDefined();
    expect(result.errors.serviceCategory).toBeDefined();
    expect(result.errors.description).toBeDefined();
    expect(result.errors.country).toBeDefined();
    expect(result.errors.city).toBeDefined();
  });

  it('returns error when businessName is empty string', () => {
    const data = {
      businessName: '',
      serviceCategory: 'Plumbing',
      description: 'desc',
      location: { country: 'Canada', city: 'Montreal' },
    };
    const result = validateBusinessInfo(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.businessName).toBeDefined();
  });

  it('returns error when location exists but country is missing', () => {
    const data = {
      businessName: 'Biz',
      serviceCategory: 'Plumbing',
      description: 'desc',
      location: { city: 'Montreal' },
    };
    const result = validateBusinessInfo(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.country).toBeDefined();
  });

  it('returns error when location exists but city is missing', () => {
    const data = {
      businessName: 'Biz',
      serviceCategory: 'Plumbing',
      description: 'desc',
      location: { country: 'Canada' },
    };
    const result = validateBusinessInfo(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.city).toBeDefined();
  });

  it('returns error when location is null', () => {
    const data = {
      businessName: 'Biz',
      serviceCategory: 'Plumbing',
      description: 'desc',
      location: null,
    };
    const result = validateBusinessInfo(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.country).toBeDefined();
    expect(result.errors.city).toBeDefined();
  });

  it('returns error for empty businessName', () => {
    const data = {
      businessName: '',
      serviceCategory: 'Plumbing',
      description: 'desc',
      location: { country: 'Canada', city: 'Montreal' },
    };
    const result = validateBusinessInfo(data);
    expect(result.isValid).toBe(false);
  });
  it('returns error for tab-only businessName', () => {
    const data = {
      businessName: '   ',
      serviceCategory: 'Plumbing',
      description: 'desc',
      location: { country: 'Canada', city: 'Montreal' },
    };
    const result = validateBusinessInfo(data);
    expect(result.isValid).toBe(false);
  });
  it('returns error for whitespace-only businessName', () => {
    const data = {
      businessName: ' ',
      serviceCategory: 'Plumbing',
      description: 'desc',
      location: { country: 'Canada', city: 'Montreal' },
    };
    const result = validateBusinessInfo(data);
    expect(result.isValid).toBe(false);
  });
});

describe('validateService', () => {
  it('returns valid for a correct service', () => {
    const service = { name: 'Pipe Repair', price: '50' };
    const result = validateService(service);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('returns error when name is missing', () => {
    const service = { name: '', price: '50' };
    const result = validateService(service);
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('returns error when price is not numeric', () => {
    const service = { name: 'Repair', price: 'abc' };
    const result = validateService(service);
    expect(result.isValid).toBe(false);
    expect(result.errors.price).toBeDefined();
  });

  it('returns error when price contains decimals', () => {
    const service = { name: 'Repair', price: '19.99' };
    const result = validateService(service);
    expect(result.isValid).toBe(false);
    expect(result.errors.price).toBeDefined();
  });

  it('accepts price of zero', () => {
    const service = { name: 'Free Consultation', price: '0' };
    const result = validateService(service);
    // '0' matches /^\d+$/ so it should be valid
    expect(result.isValid).toBe(true);
  });

  it('returns errors when both name and price are invalid', () => {
    const service = { name: '', price: 'free' };
    const result = validateService(service);
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.price).toBeDefined();
  });
});

describe('validateCertification', () => {
  const validCert = {
    id: '1',
    name: 'Master Plumber',
    issuer: 'Plumbing Board',
    date: '06/2023',
    document: 'cert.pdf',
  };
/*
  it('returns valid for a complete certification', () => {
    const result = validateCertification(validCert);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('returns error when name is missing', () => {
    const result = validateCertification({ ...validCert, name: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors!.name).toBe('Required');
  });

  it('returns error when issuer is missing', () => {
    const result = validateCertification({ ...validCert, issuer: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors!.issuer).toBe('Required');
  });

  it('returns error when date is missing', () => {
    const result = validateCertification({ ...validCert, date: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors!.date).toBe('Required');
  });

  it('returns error when date format is invalid', () => {
    const result = validateCertification({ ...validCert, date: '2023-06' });
    expect(result.isValid).toBe(false);
    expect(result.errors!.date).toBe('Use MM/YYYY format');
  });

  it('accepts valid MM/YYYY date format', () => {
    const result = validateCertification({ ...validCert, date: '12/2025' });
    expect(result.isValid).toBe(true);
  });

  it('returns error when document is missing', () => {
    const result = validateCertification({ ...validCert, document: undefined });
    expect(result.isValid).toBe(false);
    expect(result.errors!.document).toBe('Required');
  });

  it('returns multiple errors when several fields are invalid', () => {
    const result = validateCertification({
      id: '1',
      name: '',
      issuer: '',
      date: 'invalid',
      document: undefined,
    });
    expect(result.isValid).toBe(false);
    expect(result.errors!.name).toBeDefined();
    expect(result.errors!.issuer).toBeDefined();
    expect(result.errors!.date).toBeDefined();
    expect(result.errors!.document).toBeDefined();
  });

  it('returns error for whitespace-only name', () => {
    const result = validateCertification({ ...validCert, name: '   ' });
    expect(result.isValid).toBe(false);
    expect(result.errors!.name).toBe('Required');
  });
  */
});

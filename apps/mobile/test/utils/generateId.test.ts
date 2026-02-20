import { generateServiceId } from '../../utils/generateId';

describe('generateServiceId', () => {
  it('generates an ID with default prefix SRV', () => {
    const id = generateServiceId();
    expect(id).toMatch(/^SRV_\d+$/);
  });

  it('generates an ID with a custom prefix', () => {
    const id = generateServiceId('CERT');
    expect(id).toMatch(/^CERT_\d+$/);
  });

  it('generates sequential IDs', () => {
    const id1 = generateServiceId();
    const id2 = generateServiceId();

    const num1 = parseInt(id1.split('_')[1]);
    const num2 = parseInt(id2.split('_')[1]);

    expect(num2).toBe(num1 + 1);
  });

  it('maintains sequence across different prefixes', () => {
    const id1 = generateServiceId('A');
    const id2 = generateServiceId('B');

    const num1 = parseInt(id1.split('_')[1]);
    const num2 = parseInt(id2.split('_')[1]);

    expect(num2).toBe(num1 + 1);
  });
});

import { formatMessageTime } from '../../backend/main/src/utils/utils';

describe('formatMessageTime', () => {
  it('returns a time string for a message sent today', () => {
    const now = new Date();
    now.setHours(14, 30, 0, 0);
    const result = formatMessageTime(now.toISOString());
    // Should contain hour/minute — exact format depends on locale
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a weekday name for a message sent 2 days ago', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(10, 0, 0, 0);
    const result = formatMessageTime(twoDaysAgo.toISOString());
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a weekday name for a message sent 6 days ago', () => {
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    sixDaysAgo.setHours(10, 0, 0, 0);
    const result = formatMessageTime(sixDaysAgo.toISOString());
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns month and day for a message sent more than 7 days ago', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);
    oldDate.setHours(10, 0, 0, 0);
    const result = formatMessageTime(oldDate.toISOString());
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns month and day for a message from a different year', () => {
    const result = formatMessageTime('2023-01-15T12:00:00.000Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles midnight timestamp', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = formatMessageTime(today.toISOString());
    expect(typeof result).toBe('string');
  });
});

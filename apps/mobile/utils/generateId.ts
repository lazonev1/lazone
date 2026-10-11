export const generateServiceId = (prefix: string = 'SRV') => {
  // Service IDs are stable public identifiers, not security tokens. Combining
  // time with two random segments avoids the process-local counter collisions
  // that occurred after app restarts and when editing an existing catalogue.
  const time = Date.now().toString(36);
  const random = `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${time}_${random}`;
};

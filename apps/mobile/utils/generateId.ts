let serviceIdCounter = 0;

export const generateServiceId = (prefix: string = 'SRV') => {
  serviceIdCounter += 1;
  return `${prefix}_${serviceIdCounter}`;
};

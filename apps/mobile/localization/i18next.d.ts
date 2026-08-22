// Makes t() keys compile-time checked against the French resources
// (French is the fallback language and source of truth; en must mirror its key structure).
import 'i18next';
import type { defaultNS, resources } from './index';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['fr'];
  }
}

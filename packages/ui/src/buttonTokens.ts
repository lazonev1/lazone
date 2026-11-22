/** Default text/surface pairs are contrast-tested. Custom color overrides must
 * be audited by their caller; these tokens do not certify an entire screen. */
export const buttonColors = {
  primary: { background: '#0A58A5', foreground: '#FFFFFF' },
  secondary: { background: '#FF9900', foreground: '#1B1B1B' },
  success: { background: '#287A16', foreground: '#FFFFFF' },
  disabled: { background: '#E2E8F0', foreground: '#475569' },
} as const;

export const buttonMinimumTarget = 48;

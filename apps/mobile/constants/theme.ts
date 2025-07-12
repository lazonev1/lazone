export const Theme = {
  // Spacing scale
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Typography scale
  typography: {
    size: {
      caption: 12,
      body: 14,
      bodyLarge: 16,
      subtitle: 18,
      title: 20,
      heading: 24,
      display: 32,
    },
    weight: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
  },

  // Border radii
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    pill: 9999,
  },

  // Shadows
  shadows: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 3,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    },
  },

  // Colors
  colors: {
    // Primary palette
    primary: "#0A58A5",
    primaryLight: "#3A85D9",
    primaryDark: "#084178",

    // Secondary palette
    secondary: "#e1a100",
    secondaryLight: "#FFD54F",
    secondaryDark: "#b78000",

    // Semantic colors
    success: "#34C759",
    warning: "#FF9500",
    error: "#FF3B30",
    info: "#5AC8FA",

    // UI grays (light mode)
    light: {
      background: "#FFFFFF",
      card: "#F2F2F7",
      border: "#E0E0E0",
      divider: "#E0E0E0",
      textPrimary: "#000000",
      textSecondary: "#6E6E73",
      textTertiary: "#8E8E93",
    },

    // UI grays (dark mode)
    dark: {
      background: "#171617",
      card: "#1C1C1E",
      border: "#2C2C2E",
      divider: "#444",
      textPrimary: "#FFFFFF",
      textSecondary: "#AEAEB2",
      textTertiary: "#8E8E93",
    },
  },
};

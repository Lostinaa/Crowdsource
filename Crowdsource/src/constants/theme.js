// Great Run Brand Theme (Company Standard)
export const theme = {
  // Brand color
  brand: "#8ec63f", // Brand green color

  // Primary gradient colors - using brand color
  gradient: {
    primary: ["#8ec63f", "#6db02f"], // Brand green → Darker green
    secondary: ["#6db02f", "#8ec63f"], // Darker green → Brand green
    accent: ["#8ec63f", "#a0d657"], // Brand green → Light green
  },

  // Solid colors - using brand color as primary
  colors: {
    primary: "#8ec63f", // Brand green color
    secondary: "#6db02f", // Darker green accent
    accent: "#a0d657", // Light green
    danger: "#EF4444", // Red for errors
    success: "#22c55e", // Green for success
    warning: "#FACC15", // Yellow for warnings
    error: "#EF4444", // Red for errors
    info: "#009FE3", // Blue for info
    gray: "#6b7280", // Gray
    purple: "#8B5CF6", // Purple
    black: "#000000", // Black
    white: "#ffffff", // White
    lightGray: "#f3f4f6", // Light gray
    dangerLight: "#fef2f2", // Light red background
    warningLight: "#fefce8", // Light yellow background
    primaryLight: "#e7fbe9", // Light brand green background
    textSecondary: "#6b7280", // Medium gray for secondary text
    
    // Accessibility-friendly colors
    accessible: {
      primary: "#6db02f", // Darker green for better contrast
      secondary: "#5a9a28", // Even darker green for better contrast
      text: "#212121", // Dark gray for better readability
      background: "#FAFAFA", // Light background for better contrast
    },

    // Text colors
    text: {
      primary: "#1f2937", // Dark gray
      secondary: "#6b7280", // Medium gray
      light: "#9ca3af", // Light gray
      white: "#ffffff", // White
    },

    // Background colors
    background: {
      primary: "#ffffff", // White
      secondary: "#f9fafb", // Light gray
      card: "#ffffff", // White
      gradient: ["#8ec63f", "#6db02f"], // Brand green gradient
    },

    // Border colors
    border: {
      light: "#e5e7eb", // Light gray
      medium: "#d1d5db", // Medium gray
      dark: "#9ca3af", // Dark gray
    },
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Border radius
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  // Shadows
  shadows: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

export default theme;

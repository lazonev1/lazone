import { ViewStyle, TextStyle, ImageStyle } from "react-native";
import { Theme } from "@/constants/theme";

type StyleValue = ViewStyle | TextStyle | ImageStyle;

// Spacing utility
export const spacing = (value: keyof typeof Theme.spacing | number) => {
  if (typeof value === "number") return value;
  return Theme.spacing[value];
};

// Padding utility
export const padding = {
  all: (value: keyof typeof Theme.spacing | number): ViewStyle => ({
    padding: spacing(value),
  }),
  horizontal: (value: keyof typeof Theme.spacing | number): ViewStyle => ({
    paddingHorizontal: spacing(value),
  }),
  vertical: (value: keyof typeof Theme.spacing | number): ViewStyle => ({
    paddingVertical: spacing(value),
  }),
  top: (value: keyof typeof Theme.spacing | number): ViewStyle => ({
    paddingTop: spacing(value),
  }),
  bottom: (value: keyof typeof Theme.spacing | number): ViewStyle => ({
    paddingBottom: spacing(value),
  }),
};

// Margin utility
export const margin = {
  all: (value: keyof typeof Theme.spacing | number): ViewStyle => ({
    margin: spacing(value),
  }),
  horizontal: (value: keyof typeof Theme.spacing | number): ViewStyle => ({
    marginHorizontal: spacing(value),
  }),
  vertical: (value: keyof typeof Theme.spacing | number): ViewStyle => ({
    marginVertical: spacing(value),
  }),
  top: (value: keyof typeof Theme.spacing | number): ViewStyle => ({
    marginTop: spacing(value),
  }),
  bottom: (value: keyof typeof Theme.spacing | number): ViewStyle => ({
    marginBottom: spacing(value),
  }),
  right: (value: keyof typeof Theme.spacing | number): ViewStyle => ({
    marginRight: spacing(value),
  }),
  left: (value: keyof typeof Theme.spacing | number): ViewStyle => ({
    marginLeft: spacing(value),
  }),
};

// Get theme color
export const getColor = (
  colorName: string,
  mode: "light" | "dark" = "light"
): string => {
  // Nested color paths like 'light.background'
  if (colorName.includes(".")) {
    const [category, name] = colorName.split(".");
    return Theme.colors[category][name];
  }

  // Direct color references like 'primary'
  if (Theme.colors[colorName]) {
    return Theme.colors[colorName];
  }

  // Mode-specific UI colors
  if (Theme.colors[mode][colorName]) {
    return Theme.colors[mode][colorName];
  }

  return colorName;
};
// Border radius utility
export const borderRadius = {
  all: (size: keyof typeof Theme.borderRadius): ViewStyle => ({
    borderRadius: Theme.borderRadius[size],
  }),
  top: (size: keyof typeof Theme.borderRadius): ViewStyle => ({
    borderTopLeftRadius: Theme.borderRadius[size],
    borderTopRightRadius: Theme.borderRadius[size],
  }),
  bottom: (size: keyof typeof Theme.borderRadius): ViewStyle => ({
    borderBottomLeftRadius: Theme.borderRadius[size],
    borderBottomRightRadius: Theme.borderRadius[size],
  }),
  left: (size: keyof typeof Theme.borderRadius): ViewStyle => ({
    borderTopLeftRadius: Theme.borderRadius[size],
    borderBottomLeftRadius: Theme.borderRadius[size],
  }),
  right: (size: keyof typeof Theme.borderRadius): ViewStyle => ({
    borderTopRightRadius: Theme.borderRadius[size],
    borderBottomRightRadius: Theme.borderRadius[size],
  }),
};
// Typography utility
export const typography = {
  size: (size: keyof typeof Theme.typography.size): TextStyle => ({
    fontSize: Theme.typography.size[size],
  }),
  weight: (weight: keyof typeof Theme.typography.weight): TextStyle => ({
    fontWeight: Theme.typography.weight[weight],
  }),
  style: (
    size: keyof typeof Theme.typography.size,
    weight: keyof typeof Theme.typography.weight
  ): TextStyle => ({
    fontSize: Theme.typography.size[size],
    fontWeight: Theme.typography.weight[weight],
  }),
};

// Shadow utility
export const shadow = (size: keyof typeof Theme.shadows): ViewStyle => {
  return Theme.shadows[size];
};
// Style composition utility
export const compose = (...styles: StyleValue[]): StyleValue => {
  return Object.assign({}, ...styles);
};

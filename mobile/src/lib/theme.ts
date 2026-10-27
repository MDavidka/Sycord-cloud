export const dark = {
  background: "#141416",
  elevated: "#1A1A1D",
  surface: "#202023",
  composer: "#242427",
  control: "#2D2D31",
  pressed: "#36363B",
  border: "#303035",
  focus: "#48484E",
  text: "#F5F5F7",
  secondary: "#B3B3BC",
  muted: "#9898A2",
  disabled: "#777780",
  icon: "#F0F0F3",
  accent: "#8FAEFF",
  success: "#4BCA8C",
  danger: "#FF6B73",
  scrim: "rgba(0,0,0,0.54)",
};
export const light: typeof dark = {
  background: "#F7F7F8",
  elevated: "#FFFFFF",
  surface: "#FFFFFF",
  composer: "#FFFFFF",
  control: "#F0F0F3",
  pressed: "#E6E6EA",
  border: "#E5E5EA",
  focus: "#CACAD0",
  text: "#19191C",
  secondary: "#555560",
  muted: "#666672",
  disabled: "#8E8E98",
  icon: "#242428",
  accent: "#345FD4",
  success: "#19784A",
  danger: "#C82D3D",
  scrim: "rgba(0,0,0,0.30)",
};
export type Palette = typeof dark;
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
};
export const geometry = {
  touch: 44,
  header: 56,
  composer: 60,
  radius: 16,
  multiline: 24,
  column: 760,
};
export const typography = {
  title: 20,
  body: 17,
  input: 16,
  supporting: 14,
  line: 25,
};
export const motion = { fast: 140, normal: 200, sheet: 280 };

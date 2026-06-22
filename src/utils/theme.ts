export const COLORS = {
  // Primary palette — deep golf green + gold accent
  primary: '#1B5E20',
  primaryLight: '#2E7D32',
  primaryDark: '#0D3B12',
  accent: '#FFD700',
  accentLight: '#FFE44D',

  // Backgrounds
  background: '#0A0F0A',
  surface: '#141E14',
  surfaceLight: '#1E2E1E',
  card: '#1A2B1A',
  cardHover: '#243524',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A8C5A8',
  textMuted: '#6B8F6B',
  textDark: '#1B1B1B',

  // Status
  success: '#4CAF50',
  error: '#EF5350',
  warning: '#FFA726',
  info: '#42A5F5',

  // Trail / overlay
  trailOrange: '#FF3D00',
  trailGlow: '#FFAB91',
  landingGreen: '#00E676',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.6)',
  divider: 'rgba(255,255,255,0.08)',
  transparent: 'transparent',
};

export const FONTS = {
  light: { fontWeight: '300' as const },
  regular: { fontWeight: '400' as const },
  medium: { fontWeight: '500' as const },
  semiBold: { fontWeight: '600' as const },
  bold: { fontWeight: '700' as const },
};

export const SIZES = {
  // Global
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,

  // Font
  fontXs: 10,
  fontSm: 12,
  fontMd: 14,
  fontLg: 16,
  fontXl: 20,
  fontXxl: 28,
  fontHero: 36,

  // Radius
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 24,
  radiusFull: 999,

  // Components
  headerHeight: 60,
  tabBarHeight: 70,
  buttonHeight: 52,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  glow: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
};

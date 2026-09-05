export const COLORS = {
  bg: '#FFFFFF',
  surface: '#F5F5F5',
  border: '#E0E0E0',
  primary: '#E02020',
  primaryDark: '#CC0000',
  text: '#111111',
  textMuted: '#555555',
};

export const FONT = {
  main: 'Inter, system-ui, sans-serif',
};

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
};

export const SCENES = {
  hook: 90,
  problem: 120,
  promise: 90,
  point1: 120,
  point2: 120,
  point3: 120,
  recap: 90,
  cta: 150,
};

export const TOTAL_FRAMES = Object.values(SCENES).reduce((a, b) => a + b, 0);

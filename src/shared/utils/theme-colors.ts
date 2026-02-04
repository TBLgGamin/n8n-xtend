import { type Theme, getCurrentTheme, onThemeChange } from './theme';

export interface ThemeColors {
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDim: string;
  textButton: string;
  bgPrimary: string;
  bgHover: string;
  bgDragOver: string;
  bgDragContainer: string;
  borderPrimary: string;
  borderSecondary: string;
  borderButton: string;
  brandPrimary: string;
  brandHover: string;
  scrollbarTrack: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
  toggleKnob: string;
  shadow: string;
  overlay: string;
}

const LIGHT_COLORS: ThemeColors = {
  textPrimary: 'rgb(43, 43, 43)',
  textSecondary: 'rgb(117, 117, 117)',
  textMuted: 'rgb(148, 148, 148)',
  textDim: 'rgb(109, 109, 109)',
  textButton: 'rgb(77, 77, 77)',
  bgPrimary: 'rgb(255, 255, 255)',
  bgHover: 'rgb(245, 245, 245)',
  bgDragOver: 'rgb(240, 240, 240)',
  bgDragContainer: 'rgb(250, 250, 250)',
  borderPrimary: 'rgb(224, 224, 224)',
  borderSecondary: 'rgb(204, 204, 204)',
  borderButton: 'rgb(173, 173, 173)',
  brandPrimary: 'rgb(255, 109, 90)',
  brandHover: 'rgb(255, 85, 69)',
  scrollbarTrack: 'rgb(245, 245, 245)',
  scrollbarThumb: 'rgb(204, 204, 204)',
  scrollbarThumbHover: 'rgb(173, 173, 173)',
  toggleKnob: 'rgb(255, 255, 255)',
  shadow: 'rgba(68, 28, 23, 0.06)',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

const DARK_COLORS: ThemeColors = {
  textPrimary: 'rgb(224, 224, 224)',
  textSecondary: 'rgb(144, 144, 144)',
  textMuted: 'rgb(125, 125, 125)',
  textDim: 'rgb(109, 109, 109)',
  textButton: 'rgb(200, 200, 200)',
  bgPrimary: 'rgb(30, 30, 30)',
  bgHover: 'rgb(45, 45, 45)',
  bgDragOver: 'rgb(51, 51, 51)',
  bgDragContainer: 'rgb(37, 37, 37)',
  borderPrimary: 'rgb(74, 74, 74)',
  borderSecondary: 'rgb(60, 60, 60)',
  borderButton: 'rgb(100, 100, 100)',
  brandPrimary: 'rgb(255, 109, 90)',
  brandHover: 'rgb(255, 85, 69)',
  scrollbarTrack: 'rgb(42, 42, 42)',
  scrollbarThumb: 'rgb(74, 74, 74)',
  scrollbarThumbHover: 'rgb(90, 90, 90)',
  toggleKnob: 'rgb(224, 224, 224)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export function getThemeColors(theme?: Theme): ThemeColors {
  const currentTheme = theme ?? getCurrentTheme();
  return currentTheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
}

export function onThemeColorsChange(callback: (colors: ThemeColors) => void): () => void {
  return onThemeChange((theme) => {
    callback(getThemeColors(theme));
  });
}

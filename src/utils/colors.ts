/**
 * 颜色处理工具
 */

/**
 * 将十六进制颜色转换为RGB对象
 * @param hex 十六进制颜色值
 * @returns RGB对象
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

/**
 * 将RGB值转换为十六进制颜色
 * @param r 红色值 (0-255)
 * @param g 绿色值 (0-255)
 * @param b 蓝色值 (0-255)
 * @returns 十六进制颜色值
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((x) => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
}

/**
 * 调整颜色亮度
 * @param hex 十六进制颜色值
 * @param percent 亮度调整百分比（负值变暗，正值变亮）
 * @returns 调整后的十六进制颜色值
 */
export function adjustBrightness(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const { r, g, b } = rgb;
  const adjustedR = Math.max(0, Math.min(255, r + (r * percent) / 100));
  const adjustedG = Math.max(0, Math.min(255, g + (g * percent) / 100));
  const adjustedB = Math.max(0, Math.min(255, b + (b * percent) / 100));

  return rgbToHex(adjustedR, adjustedG, adjustedB);
}

/**
 * 调整颜色透明度
 * @param hex 十六进制颜色值
 * @param alpha 透明度 (0-1)
 * @returns RGBA颜色字符串
 */
export function setAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const { r, g, b } = rgb;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

/**
 * 混合两种颜色
 * @param color1 第一种颜色
 * @param color2 第二种颜色
 * @param ratio 混合比例 (0-1，0表示全color1，1表示全color2)
 * @returns 混合后的颜色
 */
export function mixColors(color1: string, color2: string, ratio: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return color1;

  const clampedRatio = Math.max(0, Math.min(1, ratio));
  
  const r = rgb1.r + (rgb2.r - rgb1.r) * clampedRatio;
  const g = rgb1.g + (rgb2.g - rgb1.g) * clampedRatio;
  const b = rgb1.b + (rgb2.b - rgb1.b) * clampedRatio;

  return rgbToHex(r, g, b);
}

/**
 * 生成渐变色数组
 * @param startColor 起始颜色
 * @param endColor 结束颜色
 * @param steps 步数
 * @returns 颜色数组
 */
export function generateGradient(
  startColor: string,
  endColor: string,
  steps: number
): string[] {
  const colors: string[] = [];
  
  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    colors.push(mixColors(startColor, endColor, ratio));
  }
  
  return colors;
}

/**
 * 获取颜色的发光版本
 * @param hex 基础颜色
 * @param intensity 发光强度 (0-1)
 * @returns 发光颜色
 */
export function getGlowColor(hex: string, intensity: number = 0.5): string {
  return setAlpha(adjustBrightness(hex, 30), intensity);
}

/**
 * 判断颜色是亮还是暗
 * @param hex 十六进制颜色值
 * @returns true表示亮色，false表示暗色
 */
export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;

  // 计算亮度（YIQ公式）
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128;
}

/**
 * 获取适合背景色的文字颜色
 * @param bgColor 背景色
 * @returns 白色或黑色
 */
export function getContrastTextColor(bgColor: string): string {
  return isLightColor(bgColor) ? '#000000' : '#FFFFFF';
}

/**
 * 创建径向渐变字符串
 * @param centerColor 中心颜色
 * @param edgeColor 边缘颜色
 * @returns Canvas径向渐变字符串
 */
export function createRadialGradient(
  centerColor: string,
  edgeColor: string
): string {
  return `radial-gradient(circle, ${centerColor}, ${edgeColor})`;
}

/**
 * 颜色主题
 */
export const COLOR_THEME = {
  // 主色调
  primary: '#6B30FF',
  primaryDark: '#452F8F',
  primaryLight: '#A78BFF',
  
  // 强调色
  accentBlue: '#2895F7',
  accentGreen: '#00C853',
  accentCyan: '#00BCD4',
  accentPink: '#E91E63',
  accentOrange: '#FF9800',
  
  // 中性色
  background: '#000000',
  surface: '#0A0A0A',
  surfaceLight: '#141414',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#666666',
  
  // 状态色
  success: '#00C853',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2895F7'
} as const;

/**
 * 获取节点状态颜色
 * @param baseColor 基础颜色
 * @param status 节点状态
 * @returns 状态对应的颜色
 */
export function getStatusColor(
  baseColor: string,
  status: string
): { fill: string; stroke: string; glow: string } {
  switch (status) {
    case 'seed':
      return {
        fill: setAlpha(baseColor, 0.3),
        stroke: setAlpha(baseColor, 0.5),
        glow: setAlpha(baseColor, 0.2)
      };
    case 'sprout':
      return {
        fill: setAlpha(baseColor, 0.5),
        stroke: setAlpha(baseColor, 0.7),
        glow: setAlpha(baseColor, 0.4)
      };
    case 'flowering':
      return {
        fill: setAlpha(baseColor, 0.7),
        stroke: baseColor,
        glow: setAlpha(adjustBrightness(baseColor, 30), 0.6)
      };
    case 'fruit':
      return {
        fill: baseColor,
        stroke: adjustBrightness(baseColor, -20),
        glow: setAlpha(baseColor, 0.3)
      };
    default:
      return {
        fill: setAlpha(baseColor, 0.5),
        stroke: baseColor,
        glow: setAlpha(baseColor, 0.3)
      };
  }
}

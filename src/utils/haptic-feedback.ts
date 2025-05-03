
/**
 * Provides haptic feedback if supported by the device
 * @param pattern - Vibration pattern in milliseconds (on-off-on-off...)
 */
export function vibrate(pattern: number | number[] = 50) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
    return true;
  }
  return false;
}

/**
 * Different types of haptic feedback for different interactions
 */
export const haptics = {
  light: () => vibrate(10),
  medium: () => vibrate(50),
  heavy: () => vibrate(100),
  success: () => vibrate([15, 50, 50]),
  error: () => vibrate([50, 30, 100, 30, 50]),
  warning: () => vibrate([30, 50, 30]),
  buttonPress: () => vibrate(15),
  selection: () => vibrate(25),
};

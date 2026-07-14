/**
 * Haptic Feedback utility - uses Vibration API for native-feel feedback
 */

export function haptic(pattern = 10) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

export function hapticLight() {
  haptic(10)
}

export function hapticMedium() {
  haptic(20)
}

export function hapticHeavy() {
  haptic([20, 30, 20])
}

export function hapticSuccess() {
  haptic([10, 30, 10])
}

export function hapticError() {
  haptic([40, 30, 40])
}

export function hapticSelection() {
  haptic(8)
}

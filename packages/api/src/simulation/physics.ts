export class RealisticTrainPhysics {
  private readonly MAX_SPEED = 160; // km/h
  private readonly ACCELERATION = 1.1; // m/s^2
  private readonly DECELERATION = 1.2; // m/s^2 (service braking)
  private readonly EMERGENCY_BRAKE = 3.5; // m/s^2

  /**
   * Compute next speed (km/h) using simple physics:
   * - Accelerate up to max speed when far from next station
   * - Service-brake such that speed reaches ~0 at station
   * - Emergency-brake when extremely close but too fast
   * - Gradient (permille) slightly modifies effective acceleration
   */
  calculateRealisticSpeed(
    distanceToNextStation: number, // meters
    currentSpeedKmh: number, // km/h
    timeInMotionSec: number, // seconds since departure
    gradientPermille: number = 0 // ‰ (positive = uphill)
  ): number {
    const maxSpeedKmh = this.MAX_SPEED;
    const maxSpeedMs = this.kmhToMs(maxSpeedKmh);
    const currentMs = this.kmhToMs(Math.max(0, currentSpeedKmh));

    // Effective acceleration influenced by gradient (very small effect)
    // Uphill reduces acceleration; downhill increases a bit
    const gradFactor = 1 - (gradientPermille / 1000) * 0.5; // +/-0.5 m/s^2 per 1000‰ extents
    const accel = Math.max(0.1, this.ACCELERATION * gradFactor);
    const serviceDecel = Math.max(0.5, this.DECELERATION / Math.max(0.5, gradFactor));

    // If extremely close to station and still moving too fast → emergency brake
    if (distanceToNextStation <= 50 && currentMs > 1) {
      const v = Math.max(0, currentMs - this.EMERGENCY_BRAKE);
      return this.msToKmh(v);
    }

    // Compute ideal speed to stop at station: v^2 = 2 a d → v = sqrt(2 * a * d)
    // Use service braking decel as a
    const targetStopSpeedMs = Math.sqrt(
      Math.max(0, 2 * serviceDecel * Math.max(0, distanceToNextStation))
    );

    // When within braking distance window, limit speed to targetStopSpeedMs
    const brakingWindow = 2500; // m
    let desiredMs = currentMs;
    if (distanceToNextStation <= brakingWindow) {
      desiredMs = Math.min(currentMs, targetStopSpeedMs);
    } else {
      // Far from station → accelerate toward max
      desiredMs = Math.min(maxSpeedMs, currentMs + accel);
    }

    // Apply gentle launch profile based on time since departure (S-curve envelope in km/h)
    const launchCapKmh = this.launchEnvelopeKmh(timeInMotionSec);
    desiredMs = Math.min(desiredMs, this.kmhToMs(launchCapKmh));

    // Numerical stability
    if (!Number.isFinite(desiredMs)) desiredMs = 0;
    return this.msToKmh(Math.max(0, Math.min(desiredMs, maxSpeedMs)));
  }

  private kmhToMs(kmh: number): number {
    return (kmh * 1000) / 3600;
  }
  private msToKmh(ms: number): number {
    return (ms * 3600) / 1000;
  }

  // Smooth acceleration envelope to avoid instant jump to max acceleration speeds
  private launchEnvelopeKmh(tSec: number): number {
    const max = this.MAX_SPEED;
    const T = 120; // seconds to reach near-cruise
    const x = Math.max(0, Math.min(1, tSec / T));
    // ease-in-out cubic
    const y = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    return max * y;
  }
}

export class EnergyMonitor {
  // Rough energy consumption estimate in kWh per tick based on speed and mass proxy
  calculateConsumption(speedKmh: number, massTons = 140): number {
    const speedMs = (speedKmh * 1000) / 3600;
    const rollingResistance = 1.5; // N per kN approx
    const airDrag = 0.5 * 1.2 * 8.0 * speedMs * speedMs; // rho * CdA * v^2
    const massN = massTons * 1000 * 9.81; // Newton
    const resistivePowerW = (rollingResistance * massN + airDrag) * speedMs; // W
    const efficiency = 0.85;
    const netPowerW = resistivePowerW / efficiency;
    // Tick length ~ 0.5s (TICK_MS default)
    const energyWh = (netPowerW * 0.5) / 3600;
    return Math.max(0, Math.round(energyWh * 100) / 100);
  }

  optimizeEnergyUsage(targetSpeedKmh: number, limitKwh: number): number {
    // Simple cap based on budget
    if (limitKwh <= 0) return Math.max(0, targetSpeedKmh - 10);
    return targetSpeedKmh;
  }
}

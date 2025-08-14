export interface PassengerSnapshot {
  onboard: number;
  boarding: number;
  alighting: number;
  loadFactor: number; // 0..1
}

export class PassengerSimulator {
  private capacity = 240;
  private onboard = 0;

  tick(atStation: boolean): PassengerSnapshot {
    const boarding = atStation ? Math.floor(Math.random() * 30) : 0;
    const alighting = atStation ? Math.floor(Math.random() * 25) : 0;
    this.onboard = Math.max(0, Math.min(this.capacity, this.onboard + boarding - alighting));
    const loadFactor = Math.round((this.onboard / this.capacity) * 100) / 100;
    return { onboard: this.onboard, boarding, alighting, loadFactor };
  }
}



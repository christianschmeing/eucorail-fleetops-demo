export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'foggy';

export interface WeatherSnapshot {
  condition: WeatherCondition;
  temperatureC: number;
  windSpeedKmh: number;
  visibilityM: number;
  precipitationMmH: number;
}

export class WeatherService {
  private readonly weatherStates: WeatherCondition[] = [
    'sunny',
    'cloudy',
    'rainy',
    'snowy',
    'foggy',
  ];

  getCurrentWeather(): WeatherSnapshot {
    return {
      condition: this.weatherStates[Math.floor(Math.random() * this.weatherStates.length)],
      temperatureC: Math.round((Math.random() * 35 - 5) * 10) / 10,
      windSpeedKmh: Math.round(Math.random() * 60),
      visibilityM: Math.round(Math.random() * 15000),
      precipitationMmH: Math.round(Math.random() * 12 * 10) / 10,
    };
  }

  getSpeedModifier(weather: WeatherSnapshot): number {
    switch (weather.condition) {
      case 'snowy':
        return 0.7;
      case 'foggy':
        return 0.8;
      case 'rainy':
        return 0.9;
      default:
        return 1.0;
    }
  }
}

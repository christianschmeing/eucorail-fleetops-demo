import type { DataSource } from './dataSource.js';
import { getDataSource as getSeedDataSource } from './dataSource.js';

export function getDataSource(): DataSource {
  // For now only seed-backed; extendable to db-backed later
  return getSeedDataSource();
}

#!/usr/bin/env node
import { freePortRobust } from './util.js';

const ports = [3001, 3002, 4100];
await Promise.all(ports.map((p) => freePortRobust(p)));
console.log(`Ports freed: ${ports.join(', ')}`);






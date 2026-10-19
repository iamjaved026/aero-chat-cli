#!/usr/bin/env node
import { run } from '../dist/index.js';
if (typeof run === 'function') {
  run();
}

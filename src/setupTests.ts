import '@testing-library/jest-dom/vitest';
import * as matchers from 'vitest-axe/matchers.js';
import { expect } from 'vitest';

expect.extend(matchers);

// Mock HTMLCanvasElement.prototype.getContext for clean axe color contrast evaluation in jsdom
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => null;
}

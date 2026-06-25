import { describe, it, expect } from 'vitest';
import pkg from '@/package.json';

describe('test harness smoke test', () => {
  it('resolves the @ alias to repo root and runs in the jsdom environment', () => {
    expect(pkg.name).toBeTruthy(); // proves @ alias resolved to the repo-root package.json
    expect(document.createElement('div')).toBeInstanceOf(HTMLElement); // proves jsdom is active
  });
});

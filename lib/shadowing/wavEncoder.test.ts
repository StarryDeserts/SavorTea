import { describe, it, expect } from 'vitest';
import { encodeWAV } from '@/lib/shadowing/wavEncoder';

function ascii(view: DataView, offset: number, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}

describe('encodeWAV', () => {
  it('writes a valid RIFF/WAVE header', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const buffer = encodeWAV(samples, 16000);
    const view = new DataView(buffer);
    expect(ascii(view, 0, 4)).toBe('RIFF');
    expect(ascii(view, 8, 4)).toBe('WAVE');
    expect(ascii(view, 36, 4)).toBe('data');
    // sample rate at offset 24, little-endian
    expect(view.getUint32(24, true)).toBe(16000);
    // 16-bit mono => byte length = 44 header + samples*2
    expect(buffer.byteLength).toBe(44 + samples.length * 2);
  });

  it('clamps samples to int16 range', () => {
    const buffer = encodeWAV(new Float32Array([2, -2]), 8000);
    const view = new DataView(buffer);
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(-32768);
  });
});

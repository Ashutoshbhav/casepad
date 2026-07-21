import { describe, it, expect } from 'vitest';
import { encodeWavPCM16 } from '@/lib/voice/pcm-wav';

function readWavHeader(buf: ArrayBuffer) {
  const view = new DataView(buf);
  const str = (offset: number, len: number) =>
    String.fromCharCode(...new Uint8Array(buf, offset, len));
  return {
    riff: str(0, 4),
    wave: str(8, 4),
    fmtId: str(12, 4),
    audioFormat: view.getUint16(20, true),
    numChannels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    bitsPerSample: view.getUint16(34, true),
    dataId: str(36, 4),
    dataSize: view.getUint32(40, true),
  };
}

describe('encodeWavPCM16', () => {
  it('writes a valid 16kHz mono PCM16 WAV header', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const buf = encodeWavPCM16(samples);
    const header = readWavHeader(buf);
    expect(header.riff).toBe('RIFF');
    expect(header.wave).toBe('WAVE');
    expect(header.fmtId).toBe('fmt ');
    expect(header.audioFormat).toBe(1);
    expect(header.numChannels).toBe(1);
    expect(header.sampleRate).toBe(16_000);
    expect(header.bitsPerSample).toBe(16);
    expect(header.dataId).toBe('data');
    expect(header.dataSize).toBe(samples.length * 2);
  });

  it('total byte length is exactly 44-byte header + 2 bytes per sample', () => {
    const samples = new Float32Array(1600); // 100ms at 16kHz
    const buf = encodeWavPCM16(samples);
    expect(buf.byteLength).toBe(44 + 1600 * 2);
  });

  it('clamps out-of-range samples instead of wrapping', () => {
    const samples = new Float32Array([2, -2, 1.5, -1.5]);
    const buf = encodeWavPCM16(samples);
    const view = new DataView(buf);
    expect(view.getInt16(44, true)).toBe(0x7fff); // +2 clamped to +1 -> max positive
    expect(view.getInt16(46, true)).toBe(-0x8000); // -2 clamped to -1 -> max negative
    expect(view.getInt16(48, true)).toBe(0x7fff); // 1.5 clamped to 1
    expect(view.getInt16(50, true)).toBe(-0x8000); // -1.5 clamped to -1
  });

  it('round-trips silence to all-zero PCM samples', () => {
    const samples = new Float32Array(10); // all zeros
    const buf = encodeWavPCM16(samples);
    const view = new DataView(buf);
    for (let i = 0; i < 10; i++) {
      expect(view.getInt16(44 + i * 2, true)).toBe(0);
    }
  });

  it('handles an empty sample array', () => {
    const buf = encodeWavPCM16(new Float32Array(0));
    expect(buf.byteLength).toBe(44);
    const header = readWavHeader(buf);
    expect(header.dataSize).toBe(0);
  });
});

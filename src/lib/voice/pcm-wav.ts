// pcm-wav.ts — pure, dependency-free encoder from the raw 16kHz mono PCM
// Float32Array that vad-web hands back on speech-end into a WAV Blob Groq's
// Whisper endpoint can accept (same endpoint /api/voice/transcribe already
// uses for the push-to-talk MediaRecorder blob — this is just a second
// producer of the same "audio Blob" contract). No browser APIs used, so this
// is fully unit-testable with synthetic Float32Arrays.

const SAMPLE_RATE = 16_000; // vad-web always resamples to 16kHz mono.
const BITS_PER_SAMPLE = 16;
const NUM_CHANNELS = 1;

/** Encodes 16kHz mono PCM samples (range [-1, 1]) into a standard PCM16 WAV file. */
export function encodeWavPCM16(samples: Float32Array): ArrayBuffer {
  const bytesPerSample = BITS_PER_SAMPLE / 8;
  const blockAlign = NUM_CHANNELS * bytesPerSample;
  const byteRate = SAMPLE_RATE * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, NUM_CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

export function encodeWavBlob(samples: Float32Array): Blob {
  return new Blob([encodeWavPCM16(samples)], { type: 'audio/wav' });
}

// Original, softly attacked three-note chime. Run with node scripts/create-chime.cjs.
const fs = require('node:fs');
const path = require('node:path');
const rate = 44100;
const duration = 3;
const count = rate * duration;
const wav = Buffer.alloc(44 + count * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(count * 2, 40);
const notes = [523.25, 659.25, 783.99];
for (let i = 0; i < count; i++) {
  const time = i / rate;
  let value = 0;
  notes.forEach((frequency, index) => {
    const t = time - index * 0.38;
    if (t < 0) return;
    const envelope = (1 - Math.exp(-t / 0.035)) * Math.exp(-t / 0.55);
    value += 0.22 * envelope * (Math.sin(2 * Math.PI * frequency * t)
      + 0.12 * Math.sin(2 * Math.PI * frequency * 2 * t));
  });
  value *= Math.min(1, (duration - time) / 0.25);
  wav.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
}
const directory = path.join(__dirname, '../assets/audio');
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, 'departure.wav'), wav);

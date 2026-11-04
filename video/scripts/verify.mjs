// Verificación del render: duración, resolución y fotogramas por escena.
// Uso: npm run verify
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const videoDir = path.resolve(root, '..');
const mp4 = path.join(videoDir, 'out', 'manufacturing-90s.mp4');
const framesDir = path.join(videoDir, 'out', 'frames');

if (!fs.existsSync(mp4)) {
  console.error('✗ No existe out/manufacturing-90s.mp4');
  process.exit(1);
}

const probe = JSON.parse(
  execFileSync('ffprobe', [
    '-v', 'error',
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate,duration',
    '-show_entries', 'format=duration,size,bit_rate',
    '-of', 'json',
    mp4,
  ]).toString()
);

const stream = probe.streams[0];
const fmt = probe.format;
const duration = Number(fmt.duration);
const sizeMb = Number(fmt.size) / 1024 / 1024;

console.log(`resolución: ${stream.width}x${stream.height}`);
console.log(`fps: ${stream.r_frame_rate}`);
console.log(`duración: ${duration.toFixed(2)} s`);
console.log(`tamaño: ${sizeMb.toFixed(2)} MB`);
console.log(`bitrate: ${(Number(fmt.bit_rate) / 1000).toFixed(0)} kbps`);

fs.mkdirSync(framesDir, { recursive: true });
const offsets = [5, 14, 23, 34, 46, 57, 68, 84];
offsets.forEach((sec, i) => {
  const out = path.join(framesDir, `scene-${i + 1}-${sec}s.png`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(sec), '-i', mp4, '-frames:v', '1', out]);
});

const okSize = stream.width === 1920 && stream.height === 1080;
const okDuration = duration >= 85 && duration <= 95;
console.log(`\n${okSize ? '✓' : '✗'} 1920x1080`);
console.log(`${okDuration ? '✓' : '✗'} duración 85-95 s`);
console.log(`✓ fotogramas en ${path.relative(videoDir, framesDir)}/`);

if (!okSize || !okDuration) process.exit(1);

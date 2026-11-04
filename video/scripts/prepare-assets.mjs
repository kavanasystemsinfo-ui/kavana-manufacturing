// Copia los artefactos de la última grabación al proyecto Remotion.
// Uso: npm run prepare (tras npm run record)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const videoDir = path.resolve(root, '..');
const recDir = path.join(videoDir, 'recordings');
const remotionDir = path.join(videoDir, 'remotion');

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(recDir)) fail('No existe recordings/. Ejecuta antes: npm run record');

const webms = fs
  .readdirSync(path.join(recDir, 'videos'))
  .filter(f => f.endsWith('.webm'))
  .map(f => ({ f, mtime: fs.statSync(path.join(recDir, 'videos', f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

if (webms.length === 0) fail('No hay ningún .webm en recordings/videos/');

const src = path.join(recDir, 'videos', webms[0].f);
fs.mkdirSync(path.join(remotionDir, 'public'), { recursive: true });
fs.copyFileSync(src, path.join(remotionDir, 'public', 'recording.webm'));

// Transcodifica a MP4 con keyframe cada segundo: el montaje busca por frame y
// sobre WebM (sin índice de keyframes) el render se vuelve lentísimo.
console.log('· transcodificando a recording.mp4 (keyframe cada 1 s)…');
execFileSync('ffmpeg', [
  '-y', '-v', 'error', '-i', src, '-an',
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
  '-g', '30', '-keyint_min', '30', '-sc_threshold', '0',
  '-r', '30', '-pix_fmt', 'yuv420p',
  path.join(remotionDir, 'public', 'recording.mp4'),
]);
console.log('✓ recording.mp4 generado');

if (!fs.existsSync(path.join(recDir, 'timeline.json'))) fail('Falta recordings/timeline.json');
fs.copyFileSync(path.join(recDir, 'timeline.json'), path.join(remotionDir, 'public', 'timeline.json'));

fs.mkdirSync(path.join(remotionDir, 'src', 'data'), { recursive: true });
fs.copyFileSync(path.join(videoDir, 'script.manufacturing.json'), path.join(remotionDir, 'src', 'data', 'script.json'));
fs.copyFileSync(path.join(recDir, 'timeline.json'), path.join(remotionDir, 'src', 'data', 'timeline.json'));

const size = fs.statSync(src).size;
console.log(`✓ recording.webm ← ${webms[0].f} (${(size / 1024 / 1024).toFixed(1)} MB)`);
console.log('✓ timeline.json y script.json actualizados en remotion/');

// Música CC0 generada con ffmpeg (sin samples de terceros) si no existe.
const music = path.join(remotionDir, 'public', 'music.mp3');
if (!fs.existsSync(music)) {
  console.log('· generando music.mp3 con ffmpeg…');
  execFileSync('ffmpeg', [
    '-y', '-f', 'lavfi', '-i',
    'aevalsrc=0.055*sin(2*PI*110*t)+0.045*sin(2*PI*164.81*t)+0.035*sin(2*PI*220*t)+0.025*sin(2*PI*329.63*t)+0.02*sin(2*PI*440*t):s=44100:d=90',
    '-af', 'tremolo=f=0.12:d=0.35,lowpass=f=1600,highpass=f=55,afade=t=in:st=0:d=4,afade=t=out:st=84:d=6',
    '-c:a', 'libmp3lame', '-b:a', '128k', music,
  ]);
  console.log('✓ music.mp3 generada (CC0)');
}

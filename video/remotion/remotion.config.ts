import { Config } from '@remotion/cli/config';

// JPEG intermedio: rápido y suficiente para capturas de UI.
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(88);
Config.setChromiumOpenGlRenderer('angle');
// Bitrate objetivo ~1,2 Mbps → 90 s ≈ 13,5 MB (por debajo del límite de 15 MB).
Config.setVideoBitrate('1.2M');
Config.setCodec('h264');
Config.setOverwriteOutput(true);

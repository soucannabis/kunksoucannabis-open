/**
 * Acrescenta vídeos ao fim da trilha V1 de um projeto Shotcut (.mlt).
 *
 * O projeto é sempre o mesmo arquivo: edições feitas no Shotcut são
 * preservadas, pois o XML existente é reaproveitado (só inserimos o novo
 * producer e a nova entry).
 *
 * Uso:
 *   node scripts/shotcut-append.mjs <video.webm> [outro.webm ...]
 *   node scripts/shotcut-append.mjs demos/output/triagem        # pega o mais recente da pasta
 *   node scripts/shotcut-append.mjs --project outro.mlt <video>
 *
 * Env:
 *   SHOTCUT_PROJECT — caminho do .mlt (default demos/output/kunk-demos.mlt)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(__dirname, '..');
const DEFAULT_PROJECT =
  process.env.SHOTCUT_PROJECT ||
  join(APP_ROOT, 'demos', 'output', 'kunk-demos.mlt');

function parseArgs(argv) {
  const videos = [];
  let project = DEFAULT_PROJECT;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--project') {
      project = resolve(argv[i + 1] || '');
      i += 1;
      continue;
    }
    videos.push(argv[i]);
  }
  return { project, videos };
}

/** Aceita arquivo ou pasta (nesse caso usa o vídeo mais recente). */
function resolveVideo(input) {
  const path = resolve(input);
  if (!existsSync(path)) throw new Error(`Arquivo não encontrado: ${path}`);
  if (!statSync(path).isDirectory()) return path;

  const candidates = readdirSync(path)
    .filter((name) => /\.(webm|mp4|mov|mkv)$/i.test(name))
    .map((name) => join(path, name))
    .filter((file) => statSync(file).size > 0)
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  if (!candidates.length) throw new Error(`Sem vídeos em ${path}`);
  return candidates[0];
}

function ffprobeJson(args) {
  return JSON.parse(
    execFileSync('ffprobe', ['-v', 'error', ...args, '-of', 'json'], {
      encoding: 'utf8',
    })
  );
}

/**
 * Vídeos gravados pelo Playwright às vezes saem sem duração no container
 * (arquivo finalizado abruptamente); nesse caso contamos os pacotes.
 */
function probe(path) {
  const data = ffprobeJson([
    '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate',
    '-show_entries', 'format=duration',
    path,
  ]);
  const stream = data.streams?.[0] || {};
  const [num, den] = String(stream.r_frame_rate || '25/1').split('/');
  const fps = Number(den) > 0 ? Number(num) / Number(den) : 25;
  let duration = Number(data.format?.duration || 0);

  if (!duration) {
    const counted = ffprobeJson([
      '-count_packets',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=nb_read_packets',
      path,
    ]);
    const packets = Number(counted.streams?.[0]?.nb_read_packets || 0);
    duration = packets / fps;
  }

  return {
    duration,
    width: Number(stream.width || 1366),
    height: Number(stream.height || 768),
  };
}

function toTimecode(seconds) {
  const total = Math.max(0, seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s
    .toFixed(3)
    .padStart(6, '0')}`;
}

function toSeconds(timecode) {
  const [h, m, s] = String(timecode).split(':');
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function projectFps(xml) {
  const num = Number(/frame_rate_num="(\d+)"/.exec(xml)?.[1] || 25);
  const den = Number(/frame_rate_den="(\d+)"/.exec(xml)?.[1] || 1);
  return den > 0 ? num / den : 25;
}

function createProject(videoMeta) {
  const { width, height } = videoMeta;
  return `<?xml version="1.0" standalone="no"?>
<mlt LC_NUMERIC="C" version="7.32.0" title="Shotcut version 26.8.1" producer="main_bin">
  <profile description="custom" width="${width}" height="${height}" progressive="1" sample_aspect_num="1" sample_aspect_den="1" display_aspect_num="${width}" display_aspect_den="${height}" frame_rate_num="25" frame_rate_den="1" colorspace="709"/>
  <playlist id="main_bin">
    <property name="xml_retain">1</property>
  </playlist>
  <playlist id="playlist0">
    <property name="shotcut:video">1</property>
    <property name="shotcut:name">V1</property>
  </playlist>
  <tractor id="tractor0" title="Kunk demos" in="00:00:00.000" out="00:00:00.000">
    <property name="shotcut">1</property>
    <property name="shotcut:projectAudioChannels">2</property>
    <track producer="playlist0"/>
  </tractor>
</mlt>
`;
}

/** Bloco da trilha de vídeo principal (V1). */
function findVideoTrack(xml) {
  const re = /<playlist id="([^"]+)"[^>]*>([\s\S]*?)<\/playlist>/g;
  let match;
  while ((match = re.exec(xml)) !== null) {
    if (match[1] === 'main_bin') continue;
    if (!/shotcut:video">1</.test(match[2])) continue;
    return { id: match[1], start: match.index, end: re.lastIndex, block: match[0] };
  }
  throw new Error('Trilha de vídeo (V1) não encontrada no projeto');
}

function nextProducerId(xml) {
  const re = /\bid="(?:producer|chain)(\d+)"/g;
  let max = -1;
  let match;
  while ((match = re.exec(xml)) !== null) {
    max = Math.max(max, Number(match[1]));
  }
  return `producer${max + 1}`;
}

/** Soma entries + blanks da trilha, em segundos. */
function trackDuration(trackBlock, fps) {
  const frame = 1 / fps;
  let total = 0;
  const entryRe = /<entry[^>]*\bin="([^"]+)"[^>]*\bout="([^"]+)"[^>]*\/?>/g;
  let match;
  while ((match = entryRe.exec(trackBlock)) !== null) {
    total += toSeconds(match[2]) - toSeconds(match[1]) + frame;
  }
  const blankRe = /<blank[^>]*\blength="([^"]+)"[^>]*\/?>/g;
  while ((match = blankRe.exec(trackBlock)) !== null) {
    const length = match[1];
    total += length.includes(':') ? toSeconds(length) : Number(length) * frame;
  }
  return total;
}

function appendVideo(xml, videoPath) {
  const meta = probe(videoPath);
  if (!meta.duration) throw new Error(`Duração inválida: ${videoPath}`);

  const fps = projectFps(xml);
  const frame = 1 / fps;
  const length = toTimecode(meta.duration);
  const out = toTimecode(Math.max(0, meta.duration - frame));
  const id = nextProducerId(xml);
  const caption = videoPath.split('/').pop();

  const producer = `  <producer id="${id}" in="00:00:00.000" out="${out}">
    <property name="length">${length}</property>
    <property name="eof">pause</property>
    <property name="resource">${xmlEscape(videoPath)}</property>
    <property name="mlt_service">avformat</property>
    <property name="shotcut:caption">${xmlEscape(caption)}</property>
  </producer>
`;

  const track = findVideoTrack(xml);
  const lineStart = xml.lastIndexOf('\n', track.start) + 1;
  let next = xml.slice(0, lineStart) + producer + xml.slice(lineStart);

  const updated = findVideoTrack(next);
  const entry = `    <entry producer="${id}" in="00:00:00.000" out="${out}"/>\n  `;
  const withEntry = updated.block.replace(/\s*<\/playlist>$/, `\n${entry}</playlist>`);
  next = next.slice(0, updated.start) + withEntry + next.slice(updated.end);

  const total = trackDuration(findVideoTrack(next).block, fps);
  next = next.replace(/(<tractor\b[^>]*\bout=")([^"]+)(")/, (full, pre, current, post) => {
    const value = Math.max(toSeconds(current), Math.max(0, total - frame));
    return `${pre}${toTimecode(value)}${post}`;
  });

  return { xml: next, caption, length, total };
}

function main() {
  const { project, videos } = parseArgs(process.argv.slice(2));
  if (!videos.length) {
    console.error(
      'Uso: node scripts/shotcut-append.mjs <video|pasta> [...] [--project arquivo.mlt]'
    );
    process.exit(1);
  }

  mkdirSync(dirname(project), { recursive: true });

  const resolved = videos.map(resolveVideo);
  let xml = existsSync(project)
    ? readFileSync(project, 'utf8')
    : createProject(probe(resolved[0]));

  if (!existsSync(project)) {
    console.log(`projeto criado: ${project}`);
  }

  let total = 0;
  for (const video of resolved) {
    const result = appendVideo(xml, video);
    xml = result.xml;
    total = result.total;
    console.log(`+ ${result.caption} (${result.length})`);
  }

  writeFileSync(project, xml);
  console.log(`projeto: ${project}`);
  console.log(`timeline: ${toTimecode(total)}`);
}

main();

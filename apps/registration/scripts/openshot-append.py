#!/usr/bin/env python3
"""Acrescenta vídeos no fim da timeline do projeto OpenShot principal."""

import argparse
import json
import os
import tempfile
import uuid
from pathlib import Path

import openshot


APP_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PROJECT = APP_ROOT / "demos" / "output" / "kunk-demos.osp"


def timeline_end(clips):
    """Retorna o fim ocupado da timeline em segundos."""
    end = 0.0
    for clip in clips:
        position = float(clip.get("position") or 0)
        source_start = float(clip.get("start") or 0)
        source_end = float(clip.get("end") or source_start)
        end = max(end, position + max(0.0, source_end - source_start))
    return end


def append_video(project, video_path):
    video = Path(video_path).resolve()
    if not video.is_file() or video.stat().st_size == 0:
        raise ValueError(f"Vídeo inválido: {video}")

    files = project.setdefault("files", [])
    clips = project.setdefault("clips", [])
    if any(Path(item.get("path", "")).resolve() == video for item in files):
        raise ValueError(f"Vídeo já está no projeto: {video.name}")

    source = openshot.Clip(str(video))
    clip = json.loads(source.Json())
    reader = dict(clip.get("reader") or {})
    duration = float(reader.get("duration") or clip.get("duration") or 0)
    if duration <= 0:
        raise ValueError(f"Não foi possível obter a duração: {video}")

    file_id = str(uuid.uuid4())
    reader.update(
        {
            "id": file_id,
            "path": str(video),
            "media_type": "video",
            "name": video.name,
        }
    )

    position = timeline_end(clips)
    existing_layers = [
        int(item.get("layer") or 0) for item in clips if item.get("layer") is not None
    ]
    project_layers = [
        int(item.get("number") or 0)
        for item in project.get("layers", [])
        if item.get("number") is not None
    ]
    layer = max(existing_layers + project_layers + [5_000_000])

    clip.update(
        {
            "id": clip.get("id") or str(uuid.uuid4()),
            "file_id": file_id,
            "title": video.name,
            "reader": reader,
            "position": position,
            "layer": layer,
            "start": 0.0,
            "end": duration,
            "duration": duration,
        }
    )

    files.append(reader)
    clips.append(clip)
    project["duration"] = max(
        float(project.get("duration") or 0),
        position + duration + 30,
    )
    project["playhead_position"] = position
    return position, duration


def remove_video(project, video_path):
    """Remove da timeline e da mídia todas as ocorrências do caminho informado."""
    video = Path(video_path).resolve()
    files = project.setdefault("files", [])
    removed_ids = {
        item.get("id")
        for item in files
        if item.get("path") and Path(item["path"]).resolve() == video
    }
    if not removed_ids:
        raise ValueError(f"Vídeo não está no projeto: {video.name}")

    clips = project.setdefault("clips", [])
    before = len(clips)
    project["clips"] = [
        clip for clip in clips if clip.get("file_id") not in removed_ids
    ]
    project["files"] = [item for item in files if item.get("id") not in removed_ids]
    return before - len(project["clips"])


def save_atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_path = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(temp_path, path)
    finally:
        if os.path.exists(temp_path):
            os.unlink(temp_path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("videos", nargs="+")
    parser.add_argument("--project", default=str(DEFAULT_PROJECT))
    parser.add_argument(
        "--replace-video",
        help="remove este vídeo existente antes de acrescentar os novos",
    )
    args = parser.parse_args()

    project_path = Path(args.project).resolve()
    if not project_path.is_file():
        raise SystemExit(f"Projeto não encontrado: {project_path}")

    project = json.loads(project_path.read_text(encoding="utf-8"))
    if args.replace_video:
        removed = remove_video(project, args.replace_video)
        print(f"- {Path(args.replace_video).name} | clipes removidos={removed}")
    for video in args.videos:
        position, duration = append_video(project, video)
        print(
            f"+ {Path(video).name} | posição={position:.3f}s | duração={duration:.3f}s"
        )

    save_atomic(project_path, project)
    print(f"projeto: {project_path}")
    print(f"fim da timeline: {timeline_end(project['clips']):.3f}s")


if __name__ == "__main__":
    main()

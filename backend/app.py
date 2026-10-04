"""FirstSong backend.

    python -m uvicorn backend.app:app --reload --port 8000

    GET  /api/worlds              list built worlds
    GET  /api/worlds/{id}         the world manifest
    GET  /api/worlds/{id}/status  pipeline progress
    POST /api/worlds              upload audio, build in the background
    GET  /cache/{id}/...          stems and .glb files
"""
import json
import pathlib
import shutil
import subprocess
import sys

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.pipeline import build, config

app = FastAPI(title="FirstSong")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/cache", StaticFiles(directory=str(config.CACHE_DIR)), name="cache")

UPLOAD_DIR = config.CACHE_DIR / "_uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED = {".mp3", ".wav", ".flac", ".ogg", ".m4a"}
ROOT = pathlib.Path(__file__).resolve().parents[1]

# After the instruments: lighter textures for the web, then the sung words as
# objects. Both are extras: if one fails the world still opens, just without
# words. The last status says "world ready", which is what the page waits
# for; build_world's own "ready" only means the instruments are done.
FINISHING = [
    ("shaping the models", 92, "slim_models.py"),
    ("listening to the words", 95, "transcribe_lyrics.py"),
    ("making the words", 97, "build_words.py"),
]


def full_build(upload_path, title, world_id, dedication):
    build.build_world(upload_path, title, world_id, True, "auto", None, dedication)
    world_dir = config.CACHE_DIR / world_id
    status = _read_json(world_dir / "status.json") or {}
    if status.get("state") != "done":
        return
    for step, pct, script in FINISHING:
        build._write_status(world_dir, "running", step, pct)
        subprocess.run([sys.executable, str(ROOT / "scripts" / script), world_id],
                       cwd=str(ROOT), check=False)
    build._write_status(world_dir, "done", "world ready", 100)


def _read_json(path: pathlib.Path) -> dict | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


@app.get("/api/worlds")
def list_worlds():
    worlds = []
    for manifest in sorted(config.CACHE_DIR.glob("*/world.json")):
        data = _read_json(manifest)
        # A world with no Tripo models is a test fixture, not something to
        # offer in the menu.
        if data and any(stem.get("model") for stem in data.get("stems", [])):
            worlds.append({
                "id": data["id"],
                "title": data["title"],
                "dedication": data.get("dedication", ""),
                "created": data.get("created", 0),
                "stems": len(data.get("stems", [])),
            })
    return sorted(worlds, key=lambda w: w["created"], reverse=True)


@app.get("/api/worlds/{world_id}")
def get_world(world_id: str):
    data = _read_json(config.CACHE_DIR / world_id / "world.json")
    if not data:
        raise HTTPException(404, "world not found")
    return data


@app.get("/api/worlds/{world_id}/status")
def get_status(world_id: str):
    data = _read_json(config.CACHE_DIR / world_id / "status.json")
    if not data:
        raise HTTPException(404, "no such job")
    return data


@app.post("/api/worlds", status_code=202)
async def create_world(background: BackgroundTasks,
                       file: UploadFile = File(...),
                       title: str = Form(""),
                       dedication: str = Form("")):
    suffix = pathlib.Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED:
        raise HTTPException(400, f"unsupported format {suffix}, use one of {sorted(ALLOWED)}")

    title = title or pathlib.Path(file.filename).stem
    world_id = build.slugify(title)

    upload_path = UPLOAD_DIR / f"{world_id}{suffix}"
    with open(upload_path, "wb") as handle:
        shutil.copyfileobj(file.file, handle)

    world_dir = config.CACHE_DIR / world_id
    world_dir.mkdir(parents=True, exist_ok=True)
    (world_dir / "status.json").write_text(
        json.dumps({"state": "queued", "step": "waiting", "progress": 0, "error": ""}),
        encoding="utf-8")

    background.add_task(full_build, upload_path, title, world_id, dedication)

    return JSONResponse({"id": world_id, "status_url": f"/api/worlds/{world_id}/status"},
                        status_code=202)

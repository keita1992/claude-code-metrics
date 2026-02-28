"""Claude Code Metrics バックエンド"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from routers import daily, insights, models, overview, projects

# フロントエンドビルド成果物のディレクトリ
# FRONTEND_DIR 環境変数で上書き可能（開発時に便利）
_default_frontend = Path(__file__).parent.parent / "frontend" / "dist"
FRONTEND_DIR = Path(os.environ.get("FRONTEND_DIR", _default_frontend))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時に初期キャッシュ読み込み
    try:
        from services.stats_cache import load_stats_cache
        load_stats_cache()
    except FileNotFoundError:
        pass
    try:
        from services.aggregator import get_aggregated_data
        get_aggregated_data()
    except Exception:
        pass
    yield


app = FastAPI(
    title="Claude Code Metrics API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3099", "http://127.0.0.1:3099"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(overview.router)
app.include_router(daily.router)
app.include_router(models.router)
app.include_router(projects.router)
app.include_router(insights.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# 静的ファイル配信（frontend/dist/ が存在する場合のみ）
if FRONTEND_DIR.is_dir():
    assets_dir = FRONTEND_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_catch_all(full_path: str):
        """SPA ルーティング対応: 実ファイルがあればそれを返し、なければ index.html を返す"""
        requested = FRONTEND_DIR / full_path
        if requested.is_file():
            return FileResponse(str(requested))
        return FileResponse(str(FRONTEND_DIR / "index.html"))

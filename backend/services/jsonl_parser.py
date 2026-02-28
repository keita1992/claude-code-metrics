"""JONLファイルのパーサー。693MB超のファイルを効率的に処理する。"""

from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo
from pathlib import Path

import orjson
import polars as pl

from config import PROJECTS_DIR

JST = ZoneInfo("Asia/Tokyo")


def _to_jst_date_hour(timestamp: str) -> tuple[str, int]:
    """ISO8601タイムスタンプをJSTに変換し、日付と時を返す。"""
    ts = timestamp.replace("Z", "+00:00")
    dt = datetime.fromisoformat(ts)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    dt_jst = dt.astimezone(JST)
    return dt_jst.date().isoformat(), dt_jst.hour


def _extract_tool_names(content: list | None) -> list[str]:
    """assistantメッセージのcontent配列からtool_use名を抽出"""
    if not content or not isinstance(content, list):
        return []
    return [
        block["name"]
        for block in content
        if isinstance(block, dict) and block.get("type") == "tool_use" and "name" in block
    ]


def parse_jsonl_files(since_date: date | None = None) -> pl.DataFrame:
    """
    全プロジェクトのJONLファイルをパースしてDataFrameに変換。

    since_dateが指定された場合、そのJST日付以降のレコードのみを返す。
    693MBのファイルを効率処理するため、行単位パース + バッチ変換。
    """
    records: list[dict] = []
    projects_dir = PROJECTS_DIR

    if not projects_dir.exists():
        return _empty_dataframe()

    for project_dir in projects_dir.iterdir():
        if not project_dir.is_dir():
            continue

        dir_name = project_dir.name
        project_name = _resolve_project_name(dir_name)

        for jsonl_file in project_dir.glob("*.jsonl"):
            _parse_single_file(jsonl_file, since_date, dir_name, project_name, records)

    if not records:
        return _empty_dataframe()

    return pl.DataFrame(records)


def _parse_single_file(
    path: Path,
    since_date: date | None,
    dir_name: str,
    project_name: str,
    records: list[dict],
) -> None:
    """単一のJONLファイルを行単位でパース"""
    with open(path, "rb") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = orjson.loads(line)
            except (orjson.JSONDecodeError, ValueError):
                continue

            ts = obj.get("timestamp")
            if not ts:
                continue

            try:
                row_date, row_hour = _to_jst_date_hour(ts)
            except (TypeError, ValueError):
                continue

            # JST日付でフィルタ
            if since_date is not None and row_date < since_date.isoformat():
                continue

            msg_type = obj.get("type", "")
            session_id = obj.get("sessionId", "")
            cwd = obj.get("cwd", "")
            message = obj.get("message", {}) or {}
            message_id = message.get("id", "")

            model = ""
            input_tokens = 0
            output_tokens = 0
            cache_read = 0
            cache_creation = 0
            tool_names: list[str] = []

            if msg_type == "assistant":
                model = message.get("model", "")
                usage = message.get("usage") or {}
                input_tokens = usage.get("input_tokens", 0)
                output_tokens = usage.get("output_tokens", 0)
                cache_read = usage.get("cache_read_input_tokens", 0)
                cache_creation = usage.get("cache_creation_input_tokens", 0)
                tool_names = _extract_tool_names(message.get("content"))

            records.append({
                "timestamp": ts,
                "date": row_date,
                "hour": row_hour,
                "type": msg_type,
                "message_id": message_id,
                "session_id": session_id,
                "cwd": cwd,
                "dir_name": dir_name,
                "project_name": project_name,
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cache_read_tokens": cache_read,
                "cache_creation_tokens": cache_creation,
                "tool_names": tool_names,
            })


def _resolve_project_name(dir_name: str) -> str:
    """ディレクトリ名からプロジェクト名を抽出。
    例: '-Users-private-dev-musubi' → 'musubi'
    """
    parts = dir_name.strip("-").split("-")
    return parts[-1] if parts else dir_name


def _empty_dataframe() -> pl.DataFrame:
    return pl.DataFrame(
        schema={
            "timestamp": pl.Utf8,
            "date": pl.Utf8,
            "hour": pl.Int64,
            "type": pl.Utf8,
            "message_id": pl.Utf8,
            "session_id": pl.Utf8,
            "cwd": pl.Utf8,
            "dir_name": pl.Utf8,
            "project_name": pl.Utf8,
            "model": pl.Utf8,
            "input_tokens": pl.Int64,
            "output_tokens": pl.Int64,
            "cache_read_tokens": pl.Int64,
            "cache_creation_tokens": pl.Int64,
            "tool_names": pl.List(pl.Utf8),
        }
    )

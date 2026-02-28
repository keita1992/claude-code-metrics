#!/bin/sh
# Claude Code Metrics インストーラ
# 使い方: curl -fsSL https://raw.githubusercontent.com/keita1992/claude-code-metrics/main/install.sh | sh

set -e

REPO_URL="https://github.com/keita1992/claude-code-metrics.git"
INSTALL_DIR="$HOME/.local/share/claude-code-metrics"
BIN_DIR="$HOME/.local/bin"
BIN_PATH="$BIN_DIR/claude-code-metrics"

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { printf "${BLUE}[info]${NC} %s\n" "$1"; }
success() { printf "${GREEN}[ok]${NC}   %s\n" "$1"; }
warn()    { printf "${YELLOW}[warn]${NC} %s\n" "$1"; }
error()   { printf "${RED}[error]${NC} %s\n" "$1" >&2; }

# --------------------------------
# 1. 前提条件チェック
# --------------------------------
info "前提条件を確認しています..."

if ! command -v git >/dev/null 2>&1; then
    error "git がインストールされていません。git をインストールしてから再実行してください。"
    exit 1
fi
success "git: $(git --version)"

if ! command -v node >/dev/null 2>&1; then
    error "Node.js がインストールされていません。Node.js をインストールしてから再実行してください。"
    error "  → https://nodejs.org/"
    exit 1
fi
success "node: $(node --version)"

if ! command -v npm >/dev/null 2>&1; then
    error "npm がインストールされていません。"
    exit 1
fi
success "npm: $(npm --version)"

# --------------------------------
# 2. uv のインストール（未インストールの場合）
# --------------------------------
if ! command -v uv >/dev/null 2>&1; then
    info "uv が見つかりません。自動インストールを開始します..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    # PATH に追加（このセッション内で有効にする）
    export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$PATH"
    if ! command -v uv >/dev/null 2>&1; then
        error "uv のインストールに失敗しました。手動でインストールしてください: https://docs.astral.sh/uv/"
        exit 1
    fi
fi
success "uv: $(uv --version)"

# --------------------------------
# 3. リポジトリのクローン / 更新
# --------------------------------
if [ -d "$INSTALL_DIR/.git" ]; then
    info "既存のインストールを更新しています: $INSTALL_DIR"
    git -C "$INSTALL_DIR" fetch origin
    git -C "$INSTALL_DIR" reset --hard origin/main
    success "リポジトリを最新版に更新しました"
else
    info "リポジトリをクローンしています: $INSTALL_DIR"
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone "$REPO_URL" "$INSTALL_DIR"
    success "クローン完了"
fi

# --------------------------------
# 4. フロントエンドのビルド
# --------------------------------
info "フロントエンドをビルドしています..."
cd "$INSTALL_DIR/frontend"
npm ci --silent
npm run build
success "フロントエンドのビルド完了"

# --------------------------------
# 5. Python 環境の構築
# --------------------------------
info "Python 環境を構築しています（Python 3.13 を自動ダウンロード）..."
cd "$INSTALL_DIR/backend"
uv sync --no-dev
success "Python 環境の構築完了"

# --------------------------------
# 6. ランチャースクリプトの作成
# --------------------------------
info "ランチャースクリプトを作成しています: $BIN_PATH"
mkdir -p "$BIN_DIR"

cat > "$BIN_PATH" << 'LAUNCHER_EOF'
#!/bin/sh
# Claude Code Metrics ランチャー

INSTALL_DIR="$HOME/.local/share/claude-code-metrics"
DEFAULT_PORT=3099

usage() {
    cat << 'EOF'
Claude Code Metrics - Claude Code 利用状況ダッシュボード

使い方:
  claude-code-metrics [オプション]

オプション:
  --port PORT    ポート番号を指定（デフォルト: 3099）
  --update       最新版に更新
  --uninstall    アンインストール
  --help         このヘルプを表示

例:
  claude-code-metrics              # デフォルトポートで起動
  claude-code-metrics --port 8080  # ポート 8080 で起動
  claude-code-metrics --update     # 最新版に更新
EOF
}

PORT="$DEFAULT_PORT"

# 引数解析
while [ $# -gt 0 ]; do
    case "$1" in
        --port)
            PORT="$2"
            shift 2
            ;;
        --update)
            echo "最新版に更新しています..."
            curl -fsSL https://raw.githubusercontent.com/keita1992/claude-code-metrics/main/install.sh | sh
            exit 0
            ;;
        --uninstall)
            echo "Claude Code Metrics をアンインストールしています..."
            rm -rf "$INSTALL_DIR"
            rm -f "$HOME/.local/bin/claude-code-metrics"
            echo "アンインストール完了。"
            exit 0
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo "不明なオプション: $1" >&2
            usage >&2
            exit 1
            ;;
    esac
done

if [ ! -d "$INSTALL_DIR" ]; then
    echo "エラー: インストールディレクトリが見つかりません: $INSTALL_DIR" >&2
    echo "再インストールしてください:" >&2
    echo "  curl -fsSL https://raw.githubusercontent.com/keita1992/claude-code-metrics/main/install.sh | sh" >&2
    exit 1
fi

URL="http://127.0.0.1:${PORT}"
echo "Claude Code Metrics を起動しています..."
echo "  URL: $URL"
echo "  停止: Ctrl+C"
echo ""

# バックグラウンドでブラウザを開く
(
    sleep 2
    if command -v open >/dev/null 2>&1; then
        open "$URL"
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$URL"
    fi
) &

# サーバー起動（フォアグラウンド）
cd "$INSTALL_DIR/backend"
exec uv run uvicorn main:app \
    --host 127.0.0.1 \
    --port "$PORT" \
    --loop asyncio \
    --log-level warning
LAUNCHER_EOF

chmod +x "$BIN_PATH"
success "ランチャースクリプトを作成しました: $BIN_PATH"

# --------------------------------
# 7. PATH の確認・案内
# --------------------------------
echo ""
success "インストール完了！"
echo ""

# PATH チェック
case ":$PATH:" in
    *":$BIN_DIR:"*)
        printf "${GREEN}▶ すぐに使えます！以下のコマンドで起動してください:${NC}\n"
        printf "\n    claude-code-metrics\n\n"
        ;;
    *)
        printf "${YELLOW}▶ \$HOME/.local/bin が PATH に含まれていません。${NC}\n"
        echo "  以下をシェルの設定ファイル（~/.bashrc, ~/.zshrc など）に追加してください:"
        echo ""
        echo '    export PATH="$HOME/.local/bin:$PATH"'
        echo ""
        echo "  追加後、シェルを再起動するか以下を実行してください:"
        echo ""
        echo '    source ~/.bashrc  # または source ~/.zshrc'
        echo ""
        echo "  または、フルパスで直接実行することもできます:"
        echo ""
        echo "    $BIN_PATH"
        echo ""
        ;;
esac

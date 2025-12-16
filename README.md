# AI Chat with VoiceVox

VoiceVoxを使用したAI音声チャットアプリケーション

## 機能

- ChatGPT (GPT-5.2 Instant) / Claude (Sonnet 4) による会話
- VoiceVoxによる音声合成
- 複数のキャラクター（四国めたん、雨晴はう、春日部つむぎ、WhiteCUL、ずんだもん）
- 会話履歴の管理

## ローカル開発

### 必要なもの

- Python 3.11以上
- VoiceVox APIキー
- OpenAI APIキー
- Anthropic APIキー（オプション）

### セットアップ

1. リポジトリをクローン
```bash
git clone https://github.com/Fumiaki0604/AIChatwithVoiceVox.git
cd AIChatwithVoiceVox
```

2. 依存パッケージをインストール
```bash
pip install -r requirements.txt
```

3. 環境変数を設定

`.env`ファイルを作成し、以下の環境変数を設定：

```env
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
VOICEVOX_API_KEY=your_voicevox_api_key
FLASK_SECRET_KEY=your_secret_key
```

4. アプリケーションを起動
```bash
python app.py
```

アプリケーションは http://localhost:5000 で起動します。

## Renderへのデプロイ

### 手順

1. [Render](https://render.com)にサインアップ

2. 新しいWeb Serviceを作成
   - GitHubリポジトリを接続
   - `render.yaml`が自動検出されます

3. 環境変数を設定
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`（オプション）
   - `VOICEVOX_API_KEY`
   - `FLASK_SECRET_KEY`は自動生成されます

4. デプロイ
   - "Create Web Service"をクリック
   - 自動的にビルド・デプロイが開始されます

### 環境変数の設定方法

Renderのダッシュボードで：
1. Web Service → Environment
2. 各環境変数を追加
3. "Save Changes"

## 技術スタック

- **バックエンド**: Flask (Python)
- **AI**: OpenAI GPT-5.1 mini / Anthropic Claude Sonnet 4
- **音声合成**: VoiceVox
- **ホスティング**: Render
- **Webサーバー**: Gunicorn

## ライセンス

MIT License

import os
from openai import OpenAI

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
openai = OpenAI(api_key=OPENAI_API_KEY)

def get_chat_response(message, conversation_history=None, response_type="main_response"):
    try:
        # 会話履歴の初期化
        if conversation_history is None:
            conversation_history = []

        # valid_historyの初期化
        valid_history = []

        # システムメッセージの設定
        if response_type == "main_response":
            system_message = "You are a helpful assistant. Provide clear and concise responses."
        else:
            system_message = "You are reacting to another AI's response. Provide a brief, natural reaction to what was said."

        # メッセージ配列の作成
        messages = [{"role": "system", "content": system_message}]

        # 会話履歴の追加（型チェック付き）
        if conversation_history and isinstance(conversation_history, list):
            for msg in conversation_history:
                if isinstance(msg, dict) and 'role' in msg and 'content' in msg:
                    if isinstance(msg['role'], str) and isinstance(msg['content'], str):
                        valid_history.append({
                            "role": msg['role'],
                            "content": msg['content']
                        })
            messages.extend(valid_history)

        # 新しいユーザーメッセージを追加
        messages.append({
            "role": "user",
            "content": str(message)  # 文字列型に変換
        })

        # デバッグ用：送信するメッセージの構造を出力
        print("Sending messages to OpenAI:", messages)

        # OpenAI APIを呼び出し
        response = openai.chat.completions.create(
            model="gpt-4",  # 最新の安定版モデルを使用
            messages=messages,
            max_tokens=500  # トークン数を増やして、より長い応答を可能に
        )

        # アシスタントの応答を取得
        assistant_response = response.choices[0].message.content

        # 新しい会話履歴を作成（システムメッセージは除外）
        new_history = []
        for msg in valid_history:
            new_history.append(msg.copy())  # 既存の履歴をコピー

        # 新しいメッセージを履歴に追加
        new_history.extend([
            {"role": "user", "content": str(message)},
            {"role": "assistant", "content": assistant_response}
        ])

        return assistant_response, new_history
    except Exception as e:
        print(f"OpenAI APIエラー: {str(e)}")  # エラーログを追加
        raise Exception(f"Failed to get ChatGPT response: {str(e)}")
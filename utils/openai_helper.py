import os
from openai import OpenAI

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
openai = OpenAI(api_key=OPENAI_API_KEY)

def get_chat_response(message, conversation_history=None, response_type="main_response"):
    try:
        # 会話履歴がNoneの場合は空のリストを作成
        if conversation_history is None:
            conversation_history = []

        # システムメッセージの設定
        if response_type == "main_response":
            system_message = "You are a helpful assistant. Provide clear and concise responses."
        else:
            system_message = "You are reacting to another AI's response. Provide a brief, natural reaction to what was said."

        # メッセージ履歴の作成（システムメッセージを含む）
        messages = [
            {"role": "system", "content": system_message}
        ]

        # 過去の会話履歴を追加（履歴が正しい形式であることを確認）
        if isinstance(conversation_history, list):
            for msg in conversation_history:
                if isinstance(msg, dict) and 'role' in msg and 'content' in msg:
                    messages.append(msg)

        # 新しいユーザーメッセージを追加
        messages.append({"role": "user", "content": message})

        # デバッグ用：メッセージの構造を確認
        print("Sending messages to OpenAI:", messages)

        response = openai.chat.completions.create(
            model="gpt-4",  # 最新の安定版モデルを使用
            messages=messages,
            max_tokens=500  # トークン数を増やして、より長い応答を可能に
        )

        # アシスタントの応答を取得
        assistant_response = response.choices[0].message.content

        # 新しい会話履歴を返す（システムメッセージは除外）
        updated_history = conversation_history + [
            {"role": "user", "content": message},
            {"role": "assistant", "content": assistant_response}
        ]

        return assistant_response, updated_history
    except Exception as e:
        print(f"OpenAI APIエラー: {str(e)}")  # エラーログを追加
        raise Exception(f"Failed to get ChatGPT response: {str(e)}")
import os
from openai import OpenAI
from datetime import datetime
import locale

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
openai = OpenAI(api_key=OPENAI_API_KEY)

# 日本語の曜日表示のために日本のロケールを設定
try:
    locale.setlocale(locale.LC_TIME, 'ja_JP.UTF-8')
except locale.Error:
    try:
        # フォールバック: C.UTF-8を試す
        locale.setlocale(locale.LC_TIME, 'C.UTF-8')
    except locale.Error:
        # 最終フォールバック: システムのデフォルトロケール
        locale.setlocale(locale.LC_TIME, '')

def get_current_datetime_str():
    """現在の日時を日本語フォーマットで返す"""
    now = datetime.now()
    try:
        # 日本語の曜日表示を試みる
        current_date = now.strftime('%Y年%m月%d日(%a)')
    except:
        # フォールバック: 英語の曜日表示
        current_date = now.strftime('%Y年%m月%d日(%a)')
    current_time = now.strftime('%H:%M')
    return current_date, current_time

def get_chat_response(message, conversation_history=None, response_type="main_response"):
    try:
        # Initialize conversation history if None
        if conversation_history is None:
            conversation_history = []

        # 現在の日時を取得
        current_date, current_time = get_current_datetime_str()

        # Prepare system message based on response type
        if response_type == "main_response":
            system_message = f"""あなたは会話をサポートするアシスタントです。現在は{current_date} {current_time}です。
この時間情報は記憶していますが、会話の文脈で必要な場合にのみ使用してください。
例えば、以下のような場合に時間情報を活用します：
- ユーザーが今日の予定や時間に関連する話題を出した場合
- 季節や曜日に関連する自然な会話の流れがある場合
- 特別な日付（祝日など）に関連する話題の場合

会話の文脈に合わせて、自然な応答を心がけてください。"""
        else:
            system_message = f"""あなたは他のAIの発言に反応する立場です。現在は{current_date} {current_time}です。
この時間情報は記憶していますが、会話の文脈で必要な場合にのみ使用してください。
相手の発言に対して自然な反応を返しながら、会話の文脈を維持してください。"""

        # Construct messages array with system message and conversation history
        messages = [{"role": "system", "content": system_message}]

        # Add conversation history
        messages.extend(conversation_history)

        # Add current message
        messages.append({"role": "user", "content": message})

        response = openai.chat.completions.create(
            model="gpt-4",
            messages=messages,
            max_tokens=500
        )

        response_content = response.choices[0].message.content

        # Return both the response content and the updated conversation history
        return {
            "content": response_content,
            "history": conversation_history + [
                {"role": "user", "content": message},
                {"role": "assistant", "content": response_content}
            ]
        }
    except Exception as e:
        print(f"OpenAI APIエラー: {str(e)}")
        raise Exception(f"Failed to get ChatGPT response: {str(e)}")
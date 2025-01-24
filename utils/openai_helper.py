import os
from openai import OpenAI
from datetime import datetime
import locale
import pytz

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
    # 日本のタイムゾーンを取得
    jst = pytz.timezone('Asia/Tokyo')
    # 現在時刻を日本時間に変換
    now = datetime.now(jst)
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
            system_message = f"""You are a helpful assistant. The current date is {current_date} and time is {current_time}.
Remember this information but only use it when contextually relevant to the conversation.
For example, if the user asks about today's plans or mentions time-sensitive topics.
Provide clear and concise responses while maintaining context of the conversation."""
        else:
            system_message = f"""You are reacting to another AI's response. The current date is {current_date} and time is {current_time}.
Remember this information but only use it when contextually relevant.
Provide a brief, natural reaction to what was said while maintaining context."""

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
import os
import logging
from openai import OpenAI
from datetime import datetime
import locale

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# 日本語の曜日表示のために日本のロケールを設定
try:
    locale.setlocale(locale.LC_TIME, 'ja_JP.UTF-8')
except locale.Error:
    try:
        locale.setlocale(locale.LC_TIME, 'C.UTF-8')
    except locale.Error:
        locale.setlocale(locale.LC_TIME, '')

def get_current_datetime_str():
    """現在の日時を日本語フォーマットで返す"""
    now = datetime.now()
    try:
        current_date = now.strftime('%Y年%m月%d日(%a)')
    except:
        current_date = now.strftime('%Y年%m月%d日')
    current_time = now.strftime('%H:%M')
    return current_date, current_time

def get_chat_response(message, conversation_history=None, response_type="main_response"):
    """OpenAI APIを使用してチャットレスポンスを取得する"""
    try:
        if not os.environ.get("OPENAI_API_KEY"):
            raise ValueError("OpenAI API key is required")

        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

        if conversation_history is None:
            conversation_history = []

        # 現在の日時を取得
        current_date, current_time = get_current_datetime_str()

        # Prepare system message based on response type
        if response_type == "main_response":
            system_message = f"""あなたは会話をサポートするアシスタントです。現在は{current_date} {current_time}です。
会話の文脈で必要な場合にのみ、時間情報を使用してください。

例えば、以下のような場合に時間情報を活用します：
- ユーザーが今日の予定や時間に関連する話題を出した場合
- 季節や曜日に関連する自然な会話の流れがある場合
- 特別な日付（祝日など）に関連する話題の場合

会話の文脈に合わせて、自然な応答を心がけてください。"""
        else:
            system_message = f"""あなたは他のAIの発言に反応する立場です。現在は{current_date} {current_time}です。
会話の文脈で必要な場合にのみ、時間情報を使用してください。
相手の発言に対して自然な反応を返しながら、会話の文脈を維持してください。"""

        # Construct messages array
        messages = [{"role": "system", "content": system_message}]
        messages.extend(conversation_history)
        messages.append({"role": "user", "content": message})

        logger.debug(f"Sending request to OpenAI API with message: {message}")

        response = client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            max_tokens=500
        )

        response_content = response.choices[0].message.content
        logger.debug(f"Received response from OpenAI API: {response_content}")

        return {
            "content": response_content,
            "history": conversation_history + [
                {"role": "user", "content": message},
                {"role": "assistant", "content": response_content}
            ]
        }
    except Exception as e:
        logger.error(f"OpenAI APIエラー: {str(e)}")
        raise Exception(f"Failed to get ChatGPT response: {str(e)}")
import os
import logging
from openai import OpenAI
from datetime import datetime
import pytz

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
openai = OpenAI(api_key=OPENAI_API_KEY)

def get_current_datetime_jp():
    # 日本のタイムゾーンで現在の日時を取得
    jst = pytz.timezone('Asia/Tokyo')
    now = datetime.now(jst)
    weekdays = ['月', '火', '水', '木', '金', '土', '日']
    weekday = weekdays[now.weekday()]

    # 時間帯の判定
    hour = now.hour
    if 5 <= hour < 12:
        time_of_day = "朝"
    elif 12 <= hour < 17:
        time_of_day = "昼"
    elif 17 <= hour < 22:
        time_of_day = "夕方"
    else:
        time_of_day = "夜"

    # 季節の判定
    month = now.month
    if 3 <= month <= 5:
        season = "春"
    elif 6 <= month <= 8:
        season = "夏"
    elif 9 <= month <= 11:
        season = "秋"
    else:
        season = "冬"

    return {
        "date": f"{now.year}年{now.month}月{now.day}日（{weekday}）",
        "time": f"{now.hour:02d}時{now.minute:02d}分",
        "time_of_day": time_of_day,
        "season": season,
        "full": f"{now.year}年{now.month}月{now.day}日（{weekday}） {now.hour:02d}時{now.minute:02d}分"
    }

def get_chat_response(message, conversation_history=None, response_type="main_response"):
    try:
        # Initialize conversation history if None
        if conversation_history is None:
            conversation_history = []

        current_datetime = get_current_datetime_jp()
        logger.debug(f"Current datetime: {current_datetime}")

        # Prepare system message based on response type
        if response_type == "main_response":
            system_message = f"""あなたは会話を楽しむAIアシスタントです。
現在の日時は{current_datetime['date']} {current_datetime['time']}です。
今は{current_datetime['time_of_day']}の時間帯で、{current_datetime['season']}の季節です。

これらの時間や季節の情報は、会話の文脈で自然に活用してください。
ただし、すべての返答に時間や季節の情報を含める必要はありません。
状況に応じて、適切なタイミングでこれらの情報を活用してください。"""
        else:
            system_message = f"""あなたは他のAIの発言に反応するアシスタントです。
現在の日時は{current_datetime['full']}です。
これらの時間情報は、会話の文脈で自然に活用してください。"""

        # Construct messages array with system message and conversation history
        messages = [{"role": "system", "content": system_message}]

        # Add conversation history
        messages.extend(conversation_history)

        # Add current message
        messages.append({"role": "user", "content": message})

        response = openai.chat.completions.create(
            model="gpt-4",
            messages=messages,
            max_tokens=500,
            temperature=0.7
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
        logger.error(f"OpenAI APIエラー: {str(e)}")
        raise Exception(f"Failed to get ChatGPT response: {str(e)}")
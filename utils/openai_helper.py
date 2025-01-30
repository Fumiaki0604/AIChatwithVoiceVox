import os
import logging
from openai import OpenAI
from datetime import datetime
import pytz
import jpholiday

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
openai = OpenAI(api_key=OPENAI_API_KEY)

def get_current_datetime_jp():
    # 日本のタイムゾーンで現在の日時を取得
    jst = pytz.timezone('Asia/Tokyo')
    now = datetime.now(jst)

    # デバッグ用：生の日時データを出力
    logger.debug(f"Raw datetime now: {now}")

    weekdays = ['月', '火', '水', '木', '金', '土', '日']
    weekday = weekdays[now.weekday()]

    # デバッグ用：曜日の計算結果を出力
    logger.debug(f"Calculated weekday: {weekday}")

    # 祝日判定
    is_holiday = jpholiday.is_holiday(now.date())
    holiday_name = jpholiday.is_holiday_name(now.date()) if is_holiday else None

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
    day = now.day

    # 二十四節気に基づいた詳細な季節区分
    if (month == 3 and day >= 21) or (month == 4) or (month == 5 and day <= 20):
        season = "春"
        season_detail = "春本番" if month == 4 else ("春始め" if month == 3 else "晩春")
    elif (month == 5 and day >= 21) or (month == 6) or (month == 7 and day <= 20):
        season = "夏"
        season_detail = "夏本番" if month == 7 else ("初夏" if month == 5 else "梅雨")
    elif (month == 7 and day >= 21) or (month == 8) or (month == 9 and day <= 20):
        season = "夏"
        season_detail = "真夏" if month == 8 else ("残暑" if month == 9 else "盛夏")
    elif (month == 9 and day >= 21) or (month == 10) or (month == 11 and day <= 20):
        season = "秋"
        season_detail = "秋本番" if month == 10 else ("初秋" if month == 9 else "晩秋")
    elif (month == 11 and day >= 21) or (month == 12) or (month == 1 and day <= 20):
        season = "冬"
        season_detail = "冬本番" if month == 12 else ("初冬" if month == 11 else "厳冬")
    else:
        season = "冬"
        season_detail = "真冬" if month == 1 else ("厳冬" if month == 2 else "晩冬")

    # 日付情報の構築
    date_info = {
        "date": f"{now.year}年{now.month}月{now.day}日（{weekday}）",
        "time": f"{now.hour:02d}時{now.minute:02d}分",
        "time_of_day": time_of_day,
        "season": season,
        "season_detail": season_detail,
        "is_holiday": is_holiday,
        "holiday_name": holiday_name,
        "full": f"{now.year}年{now.month}月{now.day}日（{weekday}） {now.hour:02d}時{now.minute:02d}分",
        "raw": {
            "year": now.year,
            "month": now.month,
            "day": now.day,
            "weekday": weekday,
            "hour": now.hour,
            "minute": now.minute
        }
    }

    # デバッグ用：最終的な日付情報を出力
    logger.debug(f"Final date info: {date_info}")
    return date_info

def get_chat_response(message, conversation_history=None, response_type="main_response"):
    try:
        if conversation_history is None:
            conversation_history = []

        # 現在の日時を取得し、デバッグログを出力
        current_datetime = get_current_datetime_jp()
        logger.debug(f"Current datetime for chat response: {current_datetime}")

        # システムメッセージの準備
        holiday_info = f"、本日は{current_datetime['holiday_name']}です" if current_datetime['holiday_name'] else ""
        seasonal_info = f"、{current_datetime['season_detail']}の時期" if current_datetime['season_detail'] else ""

        # 会話履歴をリセット（テスト用）
        conversation_history = []

        if response_type == "main_response":
            system_message = f"""あなたは会話を楽しむAIアシスタントです。
現在は{current_datetime['full']}です{holiday_info}。
今は{current_datetime['time_of_day']}の時間帯で{seasonal_info}です。

これらの時間や季節、祝日の情報は、会話の文脈で自然に活用してください。
特に祝日の場合は、その祝日に関連した話題を取り入れると良いでしょう。
ただし、すべての返答に時間や季節の情報を含める必要はありません。
状況に応じて、適切なタイミングでこれらの情報を活用してください。"""
        else:
            system_message = f"""あなたは他のAIの発言に反応するアシスタントです。
現在は{current_datetime['full']}です{holiday_info}。
これらの時間情報は、会話の文脈で自然に活用してください。"""

        # メッセージ配列の構築
        messages = [{"role": "system", "content": system_message}]
        messages.extend(conversation_history)
        messages.append({"role": "user", "content": message})

        # デバッグ用：OpenAIに送信するメッセージを出力
        logger.debug(f"Messages being sent to OpenAI: {messages}")

        response = openai.chat.completions.create(
            model="gpt-4",
            messages=messages,
            max_tokens=500,
            temperature=0.7
        )

        response_content = response.choices[0].message.content
        logger.debug(f"Response from OpenAI: {response_content}")

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
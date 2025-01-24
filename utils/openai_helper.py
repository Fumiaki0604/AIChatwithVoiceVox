import os
from openai import OpenAI
from datetime import datetime
import pytz

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
openai = OpenAI(api_key=OPENAI_API_KEY)

def get_current_datetime_jp():
    # 日本のタイムゾーンで現在の日時を取得
    jst = pytz.timezone('Asia/Tokyo')
    now = datetime.now(jst)
    weekdays = ['月', '火', '水', '木', '金', '土', '日']
    weekday = weekdays[now.weekday()]
    return f"{now.year}年{now.month}月{now.day}日（{weekday}） {now.hour:02d}時{now.minute:02d}分"

def get_chat_response(message, conversation_history=None, response_type="main_response"):
    try:
        # Initialize conversation history if None
        if conversation_history is None:
            conversation_history = []

        current_datetime = get_current_datetime_jp()

        # Prepare system message based on response type
        if response_type == "main_response":
            system_message = f"""You are a helpful assistant. Current date and time in Japan is {current_datetime}.
            You may use this time information naturally in the conversation when appropriate, but don't force it into every response.
            Provide clear and concise responses while maintaining context of the conversation."""
        else:
            system_message = f"""You are reacting to another AI's response. Current date and time in Japan is {current_datetime}.
            You may use this time information naturally in your reactions when appropriate, but don't force it into every response.
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
        print(f"OpenAI APIエラー: {str(e)}")
        raise Exception(f"Failed to get ChatGPT response: {str(e)}")
import os
from openai import OpenAI

# the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
# do not change this unless explicitly requested by the user
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
openai = OpenAI(api_key=OPENAI_API_KEY)

def get_chat_response(message, response_type="main_response"):
    try:
        if response_type == "main_response":
            system_message = "You are a helpful assistant. Provide clear and concise responses."
        else:
            system_message = "You are reacting to another AI's response. Provide a brief, natural reaction to what was said."

        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": message}
            ],
            max_tokens=150
        )
        
        return response.choices[0].message.content
    except Exception as e:
        raise Exception(f"Failed to get ChatGPT response: {str(e)}")

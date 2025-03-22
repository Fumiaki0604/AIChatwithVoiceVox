import os
import logging
from flask import Flask, render_template, request, jsonify, session
from utils.openai_helper import get_chat_response
import json

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "a-very-secret-key")

# Load VOICEVOX speaker data
try:
    with open('attached_assets/voicebox_speakerID.json', 'r', encoding='utf-8') as f:
        VOICEVOX_SPEAKERS = json.load(f)
        logger.info("Successfully loaded VOICEVOX speaker data")
except Exception as e:
    logger.error(f"Error loading VOICEVOX speaker data: {str(e)}")
    VOICEVOX_SPEAKERS = []

@app.route('/')
def index():
    # Initialize conversation history if not exists
    if 'conversation_history' not in session:
        session['conversation_history'] = []
    return render_template('index.html')

@app.route('/get-tts-key')
def get_tts_key():
    voicevox_key = os.environ.get('VOICEVOX_API_KEY')
    logger.debug(f"VOICEVOX API key available: {bool(voicevox_key)}")
    if not voicevox_key:
        logger.error("VOICEVOX API key not configured")
        return jsonify({'error': 'VOICEVOX API key not configured'}), 500
    return jsonify({'key': voicevox_key})

@app.route('/get-speakers')
def get_speakers():
    speakers = [{
        'speaker_uuid': speaker['speaker_uuid'],
        'name': speaker['name'],
        'styles': speaker['styles']
    } for speaker in VOICEVOX_SPEAKERS]
    return jsonify(speakers)

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message')
        speaker_a = data.get('speaker_a')
        speaker_b = data.get('speaker_b')

        # 新しいAPIフォーマットのサポート追加
        speaker_id = data.get('speaker_id')
        history = data.get('history', [])

        # 必要なパラメータの検証
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        # 旧APIと新APIの両方をサポート
        if speaker_id:
            # 新しいAPIフォーマット
            logger.debug(f"New API format - message: {user_message}, speaker_id: {speaker_id}")

            # Get conversation history from session or request
            conversation_history = history if history else session.get('conversation_history', [])

            # Get response for speaker
            response = get_chat_response(user_message, conversation_history, speaker_id)
            logger.debug(f"Speaker ({speaker_id}) response: {response}")

            # 応答を返す
            return jsonify({
                'content': response['content']
            })

        elif speaker_a and speaker_b:
            # 従来のAPIフォーマット
            logger.debug(f"Legacy API format - message: {user_message}, speaker_a: {speaker_a}, speaker_b: {speaker_b}")

            # Get conversation history from session
            conversation_history = session.get('conversation_history', [])

            # Get response for speaker A
            response_a = get_chat_response(user_message, conversation_history, speaker_a)
            logger.debug(f"Speaker A ({speaker_a}) response: {response_a}")

            # 話者Aの応答を履歴に追加
            conversation_history.append({"role": "user", "content": user_message})
            conversation_history.append({"role": "assistant", "content": response_a['content']})

            # Get response for speaker B
            # パターンに基づいて指示を変更する
            # パターンA(30%): 話者Aの回答に同調
            # パターンB(10%): 話者Aの回答に反対
            # パターンC(40%): ユーザーの問いかけに独立して返答
            # パターンD(20%): 別の話題を提供
            import random
            
            pattern_choice = random.random()
            
            # 選ばれたキャラクターの名前を取得
            speaker_a_profile = None
            speaker_b_profile = None
            
            try:
                from utils.openai_helper import CHARACTER_PROFILES
                for uuid, profile in CHARACTER_PROFILES.items():
                    if uuid == speaker_a:
                        speaker_a_profile = profile
                    if uuid == speaker_b:
                        speaker_b_profile = profile
            except Exception as e:
                logger.error(f"Error getting character profiles: {str(e)}")
            
            speaker_a_name = speaker_a_profile['name'] if speaker_a_profile else "話者A"
            
            if pattern_choice < 0.3:  # パターンA(30%): 同調
                logger.debug(f"Using pattern A: Speaker B agrees with Speaker A")
                instruction = f"""あなたは{speaker_a_name}の意見に同意または肯定する返答をしてください。
                例: 「{speaker_a_name}の意見に賛成！」「{speaker_a_name}の考え方はいいね！」など
                {speaker_a_name}の発言を引用しつつ、それに賛同する形で返答してください。"""
                
                response_b = get_chat_response(user_message, conversation_history, speaker_b, additional_instruction=instruction)
            
            elif pattern_choice < 0.4:  # パターンB(10%): 反対
                logger.debug(f"Using pattern B: Speaker B disagrees with Speaker A")
                instruction = f"""あなたは{speaker_a_name}の意見に反対または異なる見解を述べる返答をしてください。
                例: 「{speaker_a_name}と私の考えはちょっと違うかな～」「いや、私は～だと思うよ」など
                {speaker_a_name}の発言を引用しつつ、それとは異なる視点や考えを丁寧に述べてください。"""
                
                response_b = get_chat_response(user_message, conversation_history, speaker_b, additional_instruction=instruction)
            
            elif pattern_choice < 0.8:  # パターンC(40%): 独立した返答
                logger.debug(f"Using pattern C: Speaker B gives independent response")
                response_b = get_chat_response(user_message, conversation_history, speaker_b)
            
            else:  # パターンD(20%): 別の話題を提供
                logger.debug(f"Using pattern D: Speaker B introduces a new topic")
                instruction = """あなたはユーザーの質問とは少し離れた別の話題を提供してください。
                例: 「ところでさ、～ってどう思う？」「その話もいいけど、私も最近思うことがあってさ」など
                自然な会話の流れを損なわない程度に、新しい話題や視点を導入してください。"""
                
                response_b = get_chat_response(user_message, conversation_history, speaker_b, additional_instruction=instruction)
            
            logger.debug(f"Speaker B ({speaker_b}) response: {response_b}")

            # 最終的な会話履歴を保存
            conversation_history.append({"role": "assistant", "content": response_b['content']})
            session['conversation_history'] = conversation_history

            return jsonify({
                'speaker_a': response_a['content'],
                'speaker_b': response_b['content']
            })
        else:
            return jsonify({'error': 'Either speaker_id or both speaker_a and speaker_b must be specified'}), 400

    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/reset-conversation', methods=['POST'])
def reset_conversation():
    try:
        session['conversation_history'] = []
        return jsonify({'message': 'Conversation history reset successfully'})
    except Exception as e:
        logger.error(f"Error resetting conversation: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Server startup configuration
if __name__ == '__main__':
    logger.info("Starting Flask application...")
    app.run(host='0.0.0.0', port=5000, debug=True)
import os
import logging
import json
from flask import Flask, render_template, request, jsonify
from utils.openai_helper import get_chat_response

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "a-very-secret-key")

# Load VOICEVOX speaker data
with open('attached_assets/voicebox_speakerID.json', 'r', encoding='utf-8') as f:
    VOICEVOX_SPEAKERS = json.load(f)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get-tts-key')
def get_tts_key():
    tts_key = os.environ.get('TTS_QUEST_API_KEY')
    logger.debug(f'TTS Quest API key exists: {bool(tts_key)}')  # ログ追加（値は出力しない）
    if not tts_key:
        logger.error('TTS Quest API key not configured')
        return jsonify({'error': 'TTS Quest API key not configured'}), 500
    return jsonify({'key': tts_key})

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')

        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        # Get ChatGPT response
        response_a = get_chat_response(user_message, "main_response")
        response_b = get_chat_response(response_a, "reaction_response")

        logger.debug('Chat responses generated successfully')
        return jsonify({
            'speaker_a': response_a,
            'speaker_b': response_b
        })

    except Exception as e:
        logger.error(f'Error in chat endpoint: {str(e)}')
        return jsonify({'error': str(e)}), 500
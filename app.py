import os
import logging
from flask import Flask, render_template, request, jsonify
import json

from utils.openai_helper import get_chat_response

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "a-very-secret-key")

# 環境変数の確認とログ出力
VOICEVOX_API_KEY = os.environ.get("VOICEVOX_API_KEY")
if not VOICEVOX_API_KEY:
    logger.warning("VOICEVOX API key is not configured")

# Load VOICEVOX speaker data
with open('attached_assets/voicebox_speakerID.json', 'r', encoding='utf-8') as f:
    VOICEVOX_SPEAKERS = json.load(f)

@app.route('/')
def index():
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
        user_message = data.get('message', '')

        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        # Get ChatGPT response
        response_a = get_chat_response(user_message, "main_response")
        response_b = get_chat_response(response_a, "reaction_response")

        return jsonify({
            'speaker_a': response_a,
            'speaker_b': response_b
        })

    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500
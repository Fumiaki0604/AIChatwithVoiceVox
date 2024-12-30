import os
import logging
import json
from flask import Flask, render_template, request, jsonify

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "a-very-secret-key")

# Load VOICEVOX speaker data
try:
    with open('attached_assets/voicebox_speakerID.json', 'r', encoding='utf-8') as f:
        VOICEVOX_SPEAKERS = json.load(f)
        logger.debug('Successfully loaded VOICEVOX speaker data')
except Exception as e:
    logger.error(f'Error loading VOICEVOX speaker data: {e}')
    VOICEVOX_SPEAKERS = []

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
        logger.debug(f'Received chat message, length: {len(user_message)}')

        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        # テスト用のエコーレスポンス
        response_data = {
            'speaker_a': f"{user_message}",
            'speaker_b': "はい、承知しました。"
        }
        logger.debug('Generated chat response successfully')
        return jsonify(response_data)

    except Exception as e:
        logger.error(f'Error in chat endpoint: {str(e)}')
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info('Starting Flask application...')
    app.run(host='0.0.0.0', port=5000, debug=True)
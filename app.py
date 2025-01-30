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
        user_message = data.get('message', '')
        speaker_a = data.get('speaker_a', 'hau')  # デフォルトはhau
        speaker_b = data.get('speaker_b', 'metan')  # デフォルトはmetan

        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        # Get conversation history from session
        conversation_history = []  # テスト用に会話履歴をリセット
        logger.debug(f"Processing chat message: {user_message}")
        logger.debug(f"Current conversation history: {conversation_history}")

        # Get response for speaker A (using selected character)
        response_a = get_chat_response(user_message, conversation_history, speaker_a)
        logger.debug(f"Speaker A response: {response_a}")

        # Update conversation history with speaker A's response
        conversation_history = response_a['history']

        # Get response for speaker B's reaction (using selected character)
        response_b = get_chat_response(response_a['content'], conversation_history, speaker_b)
        logger.debug(f"Speaker B response: {response_b}")

        # Update conversation history with speaker B's response
        conversation_history = response_b['history']

        # Save updated conversation history to session
        session['conversation_history'] = conversation_history

        return jsonify({
            'speaker_a': response_a['content'],
            'speaker_b': response_b['content']
        })

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
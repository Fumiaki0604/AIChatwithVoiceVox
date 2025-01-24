import os
import logging
from flask import Flask, render_template, request, jsonify, session
import json

from utils.openai_helper import get_chat_response

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "a-very-secret-key")

# Load VOICEVOX speaker data
try:
    with open('attached_assets/voicebox_speakerID.json', 'r', encoding='utf-8') as f:
        VOICEVOX_SPEAKERS = json.load(f)
    logger.info("Successfully loaded VOICEVOX speaker data")
except Exception as e:
    logger.error(f"Error loading VOICEVOX speaker data: {e}")
    VOICEVOX_SPEAKERS = []

@app.route('/')
def index():
    try:
        # Initialize conversation history if not exists
        if 'conversation_history' not in session:
            session['conversation_history'] = []
        return render_template('index.html')
    except Exception as e:
        logger.error(f"Error in index route: {e}")
        return "An error occurred", 500

@app.route('/get-tts-key')
def get_tts_key():
    try:
        voicevox_key = os.environ.get('VOICEVOX_API_KEY')
        logger.debug(f"VOICEVOX API key available: {bool(voicevox_key)}")
        if not voicevox_key:
            logger.error("VOICEVOX API key not configured")
            return jsonify({'error': 'VOICEVOX API key not configured'}), 500
        return jsonify({'key': voicevox_key})
    except Exception as e:
        logger.error(f"Error in get-tts-key route: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/get-speakers')
def get_speakers():
    try:
        speakers = [{
            'speaker_uuid': speaker['speaker_uuid'],
            'name': speaker['name'],
            'styles': speaker['styles']
        } for speaker in VOICEVOX_SPEAKERS]
        return jsonify(speakers)
    except Exception as e:
        logger.error(f"Error in get-speakers route: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')

        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        # Get conversation history from session
        conversation_history = session.get('conversation_history', [])

        # Get ChatGPT response for speaker A
        response_a = get_chat_response(user_message, conversation_history, "main_response")

        # Update conversation history with speaker A's response
        conversation_history = response_a['history']

        # Get ChatGPT response for speaker B's reaction
        response_b = get_chat_response(response_a['content'], conversation_history, "reaction_response")

        # Update conversation history with speaker B's response
        conversation_history = response_b['history']

        # Save updated conversation history to session
        session['conversation_history'] = conversation_history

        return jsonify({
            'speaker_a': response_a['content'],
            'speaker_b': response_b['content']
        })

    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/reset-conversation', methods=['POST'])
def reset_conversation():
    try:
        session['conversation_history'] = []
        return jsonify({'message': 'Conversation history reset successfully'})
    except Exception as e:
        logger.error(f"Error resetting conversation: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
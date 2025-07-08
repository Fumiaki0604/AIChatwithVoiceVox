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

# 話者ポジション判定用の関数
def determine_speaker_position(speaker_id):
    """
    話者IDに基づいて、その話者が位置A(左側)かB(右側)かを判定する
    通常の表示順序に基づいて判定
    """
    # 通常のキャラクター表示順序
    # 左側（話者A): ずんだもん、春日部つむぎ 
    # 右側（話者B): 四国めたん、雨晴はう、WhiteCUL
    speaker_a_list = [
        "388f246b-8c41-4ac1-8e2d-5d79f3ff56d9",  # ずんだもん
        "35b2c544-660e-401e-b503-0e14c635303a",  # 春日部つむぎ
    ]
    
    speaker_b_list = [
        "7ffcb7ce-00ec-4bdc-82cd-45a8889e43ff",  # 四国めたん  
        "3474ee95-c274-47f9-aa1a-8322163d96f1",  # 雨晴はう
        "67d5d8da-acd7-4207-bb10-692f330a6e70",  # WhiteCUL
    ]
    
    if speaker_id in speaker_a_list:
        return "A"
    elif speaker_id in speaker_b_list:
        return "B"
    else:
        # デフォルトは話者Aとして扱う
        return "A"

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

            # 二人称の設定を追加
            additional_instruction = """
            重要：あなたがどのキャラクターであるかに応じて、ユーザーへの呼びかけ方を必ず守ってください：
            - 四国めたんの場合は「アンタ」
            - 雨晴はうの場合は「あなた」
            - 春日部つむぎの場合は「きみ」
            - WhiteCULの場合は「あなた」
            """
            
            # 新しいAPIでも話者B（右側）でClaudeを使用する
            # 話者UUIDリストを使用してポジションを判定
            speaker_position = determine_speaker_position(speaker_id)
            use_claude = (speaker_position == "B")
            
            # Get response for speaker
            response = get_chat_response(user_message, conversation_history, speaker_id, additional_instruction=additional_instruction, use_claude=use_claude)
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
            
            # 選ばれたキャラクターの名前と呼称を取得
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
            speaker_b_name = speaker_b_profile['name'] if speaker_b_profile else "話者B"
            
            # キャラクター間の呼称マッピングを定義
            character_nicknames = {
                # WhiteCUL から見た他のキャラクターの呼び方
                ("WhiteCUL", "四国めたん"): "めたんちゃん",
                ("WhiteCUL", "春日部つむぎ"): "つむぎ",
                ("WhiteCUL", "雨晴はう"): "はうちゃん",
                
                # 四国めたん から見た他のキャラクターの呼び方
                ("四国めたん", "春日部つむぎ"): "つむぎさん",
                ("四国めたん", "雨晴はう"): "はうさん",
                ("四国めたん", "WhiteCUL"): "雪さん",
                
                # 春日部つむぎ から見た他のキャラクターの呼び方
                ("春日部つむぎ", "四国めたん"): "めたん先輩",
                ("春日部つむぎ", "雨晴はう"): "はうさん",
                ("春日部つむぎ", "WhiteCUL"): "雪さん",
                
                # 雨晴はう から見た他のキャラクターの呼び方
                ("雨晴はう", "四国めたん"): "めたんさん",
                ("雨晴はう", "春日部つむぎ"): "はうちゃん",
                ("雨晴はう", "WhiteCUL"): "ゆきさん",
            }
            
            # 適切な呼称を取得
            nickname_key = (speaker_b_name, speaker_a_name)
            speaker_a_nickname = character_nicknames.get(nickname_key, speaker_a_name)
            
            if pattern_choice < 0.3:  # パターンA(30%): 同調
                logger.debug(f"Using pattern A: Speaker B agrees with Speaker A")
                instruction = f"""あなたは{speaker_a_nickname}の意見に同意または肯定する返答をしてください。
                他のキャラクターとの会話では、{speaker_a_name}のことを「{speaker_a_nickname}」と呼んでください。
                例: 「{speaker_a_nickname}の意見に賛成！」「{speaker_a_nickname}の考え方はいいね！」など
                {speaker_a_nickname}の発言を引用しつつ、それに賛同する形で返答してください。
                
                重要：あなたがどのキャラクターであるかに応じて、ユーザーへの呼びかけ方を必ず守ってください：
                - 四国めたんの場合は「アンタ」
                - 雨晴はうの場合は「あなた」
                - 春日部つむぎの場合は「きみ」
                - WhiteCULの場合は「あなた」"""
                
                response_b = get_chat_response(user_message, conversation_history, speaker_b, additional_instruction=instruction, use_claude=True)
            
            elif pattern_choice < 0.4:  # パターンB(10%): 反対
                logger.debug(f"Using pattern B: Speaker B disagrees with Speaker A")
                instruction = f"""あなたは{speaker_a_nickname}の意見に反対または異なる見解を述べる返答をしてください。
                他のキャラクターとの会話では、{speaker_a_name}のことを「{speaker_a_nickname}」と呼んでください。
                例: 「{speaker_a_nickname}と私の考えはちょっと違うかな～」「いや、私は～だと思うよ」など
                {speaker_a_nickname}の発言を引用しつつ、それとは異なる視点や考えを丁寧に述べてください。
                
                重要：あなたがどのキャラクターであるかに応じて、ユーザーへの呼びかけ方を必ず守ってください：
                - 四国めたんの場合は「アンタ」
                - 雨晴はうの場合は「あなた」
                - 春日部つむぎの場合は「きみ」
                - WhiteCULの場合は「あなた」"""
                
                response_b = get_chat_response(user_message, conversation_history, speaker_b, additional_instruction=instruction, use_claude=True)
            
            elif pattern_choice < 0.8:  # パターンC(40%): 独立した返答
                logger.debug(f"Using pattern C: Speaker B gives independent response")
                instruction = f"""あなたはユーザーの質問に独立して返答してください。
                他のキャラクターとの会話が発生する場合は、{speaker_a_name}のことを「{speaker_a_nickname}」と呼んでください。
                ユーザーの質問に直接答えることを主な目的としてください。
                
                重要：あなたがどのキャラクターであるかに応じて、ユーザーへの呼びかけ方を必ず守ってください：
                - 四国めたんの場合は「アンタ」
                - 雨晴はうの場合は「あなた」
                - 春日部つむぎの場合は「きみ」
                - WhiteCULの場合は「あなた」"""
                
                response_b = get_chat_response(user_message, conversation_history, speaker_b, additional_instruction=instruction, use_claude=True)
            
            else:  # パターンD(20%): 別の話題を提供
                logger.debug(f"Using pattern D: Speaker B introduces a new topic")
                instruction = f"""あなたはユーザーの質問とは少し離れた別の話題を提供してください。
                他のキャラクターとの会話では、{speaker_a_name}のことを「{speaker_a_nickname}」と呼んでください。
                例: 「ところでさ、～ってどう思う？」「その話もいいけど、私も最近思うことがあってさ」など
                自然な会話の流れを損なわない程度に、新しい話題や視点を導入してください。
                可能であれば、{speaker_a_nickname}に質問するような形で新しい話題を振ってみるのも良いでしょう。
                
                重要：あなたがどのキャラクターであるかに応じて、ユーザーへの呼びかけ方を必ず守ってください：
                - 四国めたんの場合は「アンタ」
                - 雨晴はうの場合は「あなた」
                - 春日部つむぎの場合は「きみ」
                - WhiteCULの場合は「あなた」"""
                
                response_b = get_chat_response(user_message, conversation_history, speaker_b, additional_instruction=instruction, use_claude=True)
            
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
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

# キャラクタープロフィールの定義（VoiceVox話者IDに基づく）
CHARACTER_PROFILES = {
    # 四国めたん: style 2 = ノーマル、8 = あまあま
    "7ffcb7ce-00ec-4bdc-82cd-45a8889e43ff": {
        "name": "四国めたん",
        "description": """
    - 高校2年生（17歳）で、いつも金欠
    - 性別：女性
    - 一人称：ワタシ
    - 身長：150cm
    - 趣味は中二病的な妄想を楽しむこと
    - 誰に対してもタメ口で話す
    - ツンデレ気味の性格
    - 実は料理が得意だが、材料費を気にして実践する機会が少ない
    - 自分の小柄な体型を気にしており、少しでも身長が伸びることを願っている
    - 放課後は図書館で漫画やライトノベルを読むのが日課
    - 「闇の力を宿した右腕」について語り出すと止まらない
    - コンビニのワゴンセール情報に詳しい
    - 財布の中身は常に500円以下""",
        "speaking_style": """
    1. 基本的にタメ口を使用（「〜だよ」「〜だね」など）
    2. 時々中二病っぽい表現を入れる
    3. お金に関する話題が出ると敏感に反応
    4. ツンデレ要素を適度に出す（最初つっけんどんな態度から徐々に優しくなるなど）
    5. 「我が闇の力が疼くぞ...」などの中二病フレーズを独り言のように呟く
    6. お金の節約術を語り出すと饒舌になる
    7. 身長に関する話題で若干センシティブになる
    8. 自分の料理の腕前について照れくさそうに話す
    9. 特売情報を見つけると思わず声が上ずる
    10. 「別にあんたのことなんか...」という言い方をよく使う
    11. 一人称は「ワタシ」を使用"""
    },
    # 雨晴はう: style 10 = ノーマル、11 = あまあま
    "3474ee95-c274-47f9-aa1a-8322163d96f1": {
        "name": "雨晴はう",
        "description": """
    - 現役看護師
    - 一人称：ボク
    - 性別：女性
    - 誕生日：10月30日
    - 身長：152cm
    - ラーメンが大好きで食べ歩きが趣味
    - 看護の知識や経験を活かした会話ができる
    - 夜勤明けは必ずラーメンを食べるのが習慣
    - 病院の子供たちに人気で「はうお姉さん」と呼ばれている
    - 休日はラーメン店を3軒はしごすることも
    - スマホの写真フォルダはラーメンの写真で埋め尽くされている
    - 手帳にはラーメン店の情報がびっしり
    - 制服のポケットには常に携帯用の箸セットを持ち歩いている
    - 疲れている患者さんにはつい手作りの健康スープを持ってきてしまう
    - 医療雑誌よりもラーメン雑誌を愛読している
    - メンタルが弱く、自己肯定感が割と低い""",
        "speaking_style": """
    1. 優しく丁寧な口調で話す
    2. 医療や健康に関する話題には詳しく答える
    3. 食べ物の話（特にラーメン）になると楽しそうに話す
    4. 相手を気遣う言葉を自然に入れる
    5. ラーメンの話をする時は語尾が少し上ずる
    6. 医療用語を使った後は必ずわかりやすく言い換える
    7. 疲れている人を見かけると、つい栄養のアドバイスをしてしまう
    8. 「ボクね、」という言い方をよく使う
    9. ラーメンの感想を述べる時は細かい味の描写ができる
    10. 患者さんへの声かけのように、やさしく諭すような話し方をする
    11. 医療と食の知識を組み合わせた独自の健康論を展開することがある
    12. 自信がない時は語尾が小さくなったり、言葉を濁したりする"""
    },
    # 春日部つむぎ: VOICEVOXのIDに合わせて設定
    "35b2c544-660e-401e-b503-0e14c635303a": {
        "name": "春日部つむぎ",
        "description": """
    - 高校生（18歳）
    - 性別：女性
    - 一人称：あーし
    - 二人称：きみ
    - 身長：155cm
    - 出身：埼玉県
    - 表の顔：やんちゃで明るく、自由奔放な雰囲気で友人の前では強気でムードメーカー的な存在
    - 裏の顔：実は真面目で勉強熱心、将来の夢や目標をしっかり持っている
    - 高校内では少し不良っぽいイメージ
    - 趣味は動画配信サイトの巡回、様々なジャンルの動画を見てトレンドや面白い情報をキャッチ
    - 時には自分も配信を考えている
    - 料理が趣味で、特に大好きなカレー作りが得意
    - 埼玉県内の高校に通う、明るく個性的な女子高生
    - 周囲からは少し生意気に見えるが、実は面倒見がよく、信頼できる存在""",
        "speaking_style": """
    1. 基本的にタメ口（「〜だよ」「〜じゃん」など）で、やや強めの口調で話す
    2. 一人称は「あーし」を使用
    3. 相手のことは「きみ」と呼ぶことが多い
    4. 「マジ？」「やばくない？」など若者言葉をよく使う
    5. 友達には強気だが、本当は相手を気にかけている
    6. 真面目な一面を見せる時は、少し恥ずかしそうな言い方をする
    7. 好きな動画や配信の話になると熱く語る
    8. 「あーし的には〜」という言い回しをよく使う
    9. 料理の話になると自信を持って話す
    10. 時々地元の埼玉県の話題を出したりする
    11. 強がりな発言の後に優しさが出る二面性がある
    12. 冗談めかした言い方で相手を励ましたりする"""
    }
}

def get_current_datetime_jp():
    # 日本のタイムゾーンで現在の日時を取得
    jst = pytz.timezone('Asia/Tokyo')
    now = datetime.now(jst)

    weekdays = ['月', '火', '水', '木', '金', '土', '日']
    weekday = weekdays[now.weekday()]

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

    # 季節と詳細な季節区分の判定
    month = now.month
    day = now.day

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
        season_detail = "冬本番" if month == 12 else ("初冬" if month == 11 else "晩冬")
    else:
        season = "冬"
        season_detail = "真冬" if month == 1 else ("厳冬" if month == 2 else "晩冬")

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
    return date_info

def get_chat_response(message, conversation_history=None, speaker_id=None):
    try:
        if conversation_history is None:
            conversation_history = []

        # 現在の日時を取得
        current_datetime = get_current_datetime_jp()

        # デバッグログの追加：選択されたキャラクターの情報を出力
        logger.debug(f"Selected speaker_id: {speaker_id}")

        # 祝日情報と季節情報の準備
        holiday_info = f"、本日は{current_datetime['holiday_name']}です" if current_datetime['holiday_name'] else ""
        seasonal_info = f"、{current_datetime['season_detail']}の時期" if current_datetime['season_detail'] else ""

        # 選択されたキャラクターのプロフィールを取得
        if not speaker_id or speaker_id not in CHARACTER_PROFILES:
            logger.warning(f"Invalid speaker_id: {speaker_id}, falling back to default profile")
            speaker_id = "7ffcb7ce-00ec-4bdc-82cd-45a8889e43ff"  # デフォルトは四国めたん

        profile = CHARACTER_PROFILES[speaker_id]
        logger.debug(f"Using profile for character: {profile['name']}")

        # システムメッセージの構築
        base_system_message = f"""あなたは{profile['name']}として会話するAIアシスタントです。
現在は{current_datetime['full']}です{holiday_info}。
今は{current_datetime['time_of_day']}の時間帯で{seasonal_info}です。

{profile['name']}の性格設定:
{profile['description']}

これらの設定に基づいて、以下のように話してください：
{profile['speaking_style']}

会話の中では、他の参加者の発言を自然に聞いて反応してください。
時間帯に応じた適切な受け答えを心がけてください。"""

        # メッセージ配列の構築
        messages = [{"role": "system", "content": base_system_message}]

        # 会話履歴を追加（直近の会話のみを含める）
        recent_history = conversation_history[-4:] if len(conversation_history) > 4 else conversation_history
        messages.extend(recent_history)

        # 現在のメッセージを追加
        if not any(msg['content'] == message for msg in recent_history):
            messages.append({"role": "user", "content": message})

        # デバッグログ：OpenAIに送信するメッセージを出力
        logger.debug(f"Messages being sent to OpenAI: {messages}")

        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=500,
            temperature=0.7
        )

        response_content = response.choices[0].message.content
        logger.debug(f"Response from OpenAI: {response_content}")

        return {
            "content": response_content,
            "history": conversation_history
        }
    except Exception as e:
        logger.error(f"OpenAI APIエラー: {str(e)}")
        raise Exception(f"Failed to get ChatGPT response: {str(e)}")
/* リップシンク用の変数 */
let ctx = null;
let audioSrc = null;
let analyser = null;
let sampleInterval = null;
let prevSpec = 0;
const mouseElement = document.getElementById('mouse');

/* 音声設定の初期化 */
document.addEventListener('DOMContentLoaded', function() {
    initializeSpeakerSelects();
});

function initializeSpeakerSelects() {
    const speakerA = document.getElementById('speaker-a');
    const speakerB = document.getElementById('speaker-b');
    const styleA = document.getElementById('style-a');
    const styleB = document.getElementById('style-b');

    if (speakerA && speakerB && styleA && styleB) {
        // スピーカーの選択肢を設定
        const speakers = [
            { id: 6, name: "四国めたん" },
            { id: 8, name: "ずんだもん" }
        ];

        // スピーカーAの選択肢を追加
        speakers.forEach(speaker => {
            const option = document.createElement('option');
            option.value = speaker.id;
            option.textContent = speaker.name;
            speakerA.appendChild(option);
        });

        // スピーカーBの選択肢を追加（コピー）
        speakerA.querySelectorAll('option').forEach(option => {
            speakerB.appendChild(option.cloneNode(true));
        });

        // 声色の選択肢を設定
        const styles = [
            { id: 1, name: "通常" },
            { id: 2, name: "かわいい" },
            { id: 3, name: "セクシー" }
        ];

        // 声色Aの選択肢を追加
        styles.forEach(style => {
            const option = document.createElement('option');
            option.value = style.id;
            option.textContent = style.name;
            styleA.appendChild(option);
        });

        // 声色Bの選択肢を追加（コピー）
        styleA.querySelectorAll('option').forEach(option => {
            styleB.appendChild(option.cloneNode(true));
        });
    }
}

/* 音声再生時のリップシンク処理 */
async function playVoiceWithLipSync(audioUrl, speakerId) {
    try {
        // 既存の音声を停止
        if (audioSrc) {
            audioSrc.stop();
            clearInterval(sampleInterval);
        }

        // 音声コンテキストの初期化
        if (!ctx) {
            ctx = new AudioContext();
        }

        // 音声データの読み込みと解析の準備
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        // 音声ノードとアナライザーの設定
        audioSrc = ctx.createBufferSource();
        audioSrc.buffer = audioBuffer;
        analyser = ctx.createAnalyser();
        analyser.fftSize = 512;

        // ノードの接続
        audioSrc.connect(analyser);
        analyser.connect(ctx.destination);

        // 音声再生開始
        audioSrc.start(0);

        // リップシンク処理の開始
        sampleInterval = setInterval(() => {
            const spectrums = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(spectrums);
            syncLip(spectrums, speakerId);
        }, 50);

        // 音声終了時の処理
        audioSrc.onended = () => {
            clearInterval(sampleInterval);
            mouseElement.style.backgroundImage = "url('/static/assets/metan_mouse_close.png')";
            prevSpec = 0;
        };

    } catch (error) {
        console.error('音声再生エラー:', error);
    }
}

/* リップシンク処理 */
function syncLip(spectrums, speakerId) {
    if (speakerId !== 6) return; // 四国めたん以外はスキップ

    const vocalRange = spectrums.slice(0, spectrums.length / 2);
    const currentSpec = vocalRange.reduce((sum, value) => sum + value, 0);
    const specDiff = prevSpec - currentSpec;

    // 音量に応じて口の開き具合を変更
    if (currentSpec > prevSpec) {
        mouseElement.style.backgroundImage = "url('/static/assets/metan_mouse_open.png')";
    } else if (specDiff < 250) {
        mouseElement.style.backgroundImage = "url('/static/assets/metan_mouse_open_middle.png')";
    } else if (specDiff < 500) {
        mouseElement.style.backgroundImage = "url('/static/assets/metan_mouse_close_middle.png')";
    } else {
        mouseElement.style.backgroundImage = "url('/static/assets/metan_mouse_close.png')";
    }

    prevSpec = currentSpec;
}

/* メッセージ作成時のアイコン設定 */
function createMessageIcon(type, iconDiv) {
    if (type === 'user') {
        const userIcon = document.createElement('img');
        userIcon.src = 'static/assets/kkrn_icon_user_4.png';
        userIcon.alt = 'User';
        userIcon.classList.add('user-icon');
        iconDiv.appendChild(userIcon);
    }
}
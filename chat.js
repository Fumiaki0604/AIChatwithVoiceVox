/* リップシンク用の変数 */
let ctx = null;
let audioSrc = null;
let analyser = null;
let sampleInterval = null;
let prevSpec = 0;
const mouseElement = document.getElementById('mouse');

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

if (type === 'user') {
    const userIcon = document.createElement('img');
    userIcon.src = 'static/assets/kkrn_icon_user_4.png';
    userIcon.alt = 'User';
    userIcon.classList.add('user-icon');
    iconDiv.appendChild(userIcon);
} else {
    //This part remains empty as in original code
}
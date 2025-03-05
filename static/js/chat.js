/* 音声データをAudioBufferに変換 */
async function preparedBuffer(voice_path) {
    console.log("Preparing buffer for voice path:", voice_path);
    const ctx = new AudioContext();
    const res = await fetch(voice_path);
    if (!res.ok) {
        throw new Error(`Failed to fetch audio data: ${res.status} ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return {audioBuffer, ctx};
}

/* 入力ノード、Analyserノードを生成し、出力層に接続 */
function buildNodes(audioBuffer, ctx) {
    const audioSrc = new AudioBufferSourceNode(ctx, { buffer: audioBuffer });
    const analyser = new AnalyserNode(ctx);
    analyser.fftSize = 512;
    audioSrc.connect(analyser).connect(ctx.destination);
    return {audioSrc, analyser};
}

/* スペクトルをもとにリップシンクを行う */
function syncLip(spectrums, voicevox_id, currentSpeaker) {
    const vocalRangeSpectrums = spectrums.slice(0, spectrums.length / 2);
    const totalSpectrum = vocalRangeSpectrums.reduce((a, x) => a + x, 0);

    console.log("Current total spectrum:", totalSpectrum);
    console.log("Previous spectrum:", prevSpec);
    console.log("Difference:", prevSpec - totalSpectrum);
    console.log("Current voicevox_id:", voicevox_id);

    // 四国めたん用のリップシンク
    if ([0, 2, 4, 6, 36, 37].includes(parseInt(voicevox_id))) {
        const leftMouseElement = document.querySelector('.standing-character.left .character-mouth');
        if (leftMouseElement && currentSpeaker === 'A') {
            if (totalSpectrum > prevSpec) {
                leftMouseElement.style.backgroundImage = "url('/static/assets/metan_mouse_open.png')";
            } else if (prevSpec - totalSpectrum < 250) {
                leftMouseElement.style.backgroundImage = "url('/static/assets/metan_mouse_open_middle.png')";
            } else if (prevSpec - totalSpectrum < 500) {
                leftMouseElement.style.backgroundImage = "url('/static/assets/metan_mouse_close_middle.png')";
            } else {
                leftMouseElement.style.backgroundImage = "url('/static/assets/metan_mouse_close.png')";
            }
        }

        const rightMouseElement = document.querySelector('.standing-character.right .character-mouth');
        if (rightMouseElement && currentSpeaker === 'B') {
            if (totalSpectrum > prevSpec) {
                rightMouseElement.style.backgroundImage = "url('/static/assets/metan_mouse_open.png')";
            } else if (prevSpec - totalSpectrum < 250) {
                rightMouseElement.style.backgroundImage = "url('/static/assets/metan_mouse_open_middle.png')";
            } else if (prevSpec - totalSpectrum < 500) {
                rightMouseElement.style.backgroundImage = "url('/static/assets/metan_mouse_close_middle.png')";
            } else {
                rightMouseElement.style.backgroundImage = "url('/static/assets/metan_mouse_close.png')";
            }
        }
    }
    // 雨晴はう用のリップシンク
    else if ([8, 10].includes(parseInt(voicevox_id))) {  // 雨晴はうのボイスIDを指定
        const leftMouseElement = document.querySelector('.standing-character.left .character-mouth');
        if (leftMouseElement && currentSpeaker === 'A') {
            if (totalSpectrum > prevSpec) {
                leftMouseElement.style.backgroundImage = "url('/static/assets/hau_mouse_open.png')";
            } else if (prevSpec - totalSpectrum < 250) {
                leftMouseElement.style.backgroundImage = "url('/static/assets/hau_mouse_open_middle.png')";
            } else if (prevSpec - totalSpectrum < 500) {
                leftMouseElement.style.backgroundImage = "url('/static/assets/hau_mouse_close_middle.png')";
            } else {
                leftMouseElement.style.backgroundImage = "url('/static/assets/hau_mouse_close.png')";
            }
        }

        const rightMouseElement = document.querySelector('.standing-character.right .character-mouth');
        if (rightMouseElement && currentSpeaker === 'B') {
            if (totalSpectrum > prevSpec) {
                rightMouseElement.style.backgroundImage = "url('/static/assets/hau_mouse_open.png')";
            } else if (prevSpec - totalSpectrum < 250) {
                rightMouseElement.style.backgroundImage = "url('/static/assets/hau_mouse_open_middle.png')";
            } else if (prevSpec - totalSpectrum < 500) {
                rightMouseElement.style.backgroundImage = "url('/static/assets/hau_mouse_close_middle.png')";
            } else {
                rightMouseElement.style.backgroundImage = "url('/static/assets/hau_mouse_close.png')";
            }
        }
    }
    // 春日部つむぎ用のリップシンク
    else if ([47, 48, 49, 50].includes(parseInt(voicevox_id))) {  // 春日部つむぎのボイスID
        const leftMouseElement = document.querySelector('.standing-character.left[data-character="tsumugi"] .character-mouth');
        if (leftMouseElement && currentSpeaker === 'A') {
            if (totalSpectrum > prevSpec) {
                leftMouseElement.style.backgroundImage = "url('/static/assets/tsumugi_mouse_open.png')";
            } else if (prevSpec - totalSpectrum < 250) {
                leftMouseElement.style.backgroundImage = "url('/static/assets/tsumugi_mouse_open_middle.png')";
            } else if (prevSpec - totalSpectrum < 500) {
                leftMouseElement.style.backgroundImage = "url('/static/assets/tsumugi_mouse_close_middle.png')";
            } else {
                leftMouseElement.style.backgroundImage = "url('/static/assets/tsumugi_mouse_close.png')";
            }
        }

        const rightMouseElement = document.querySelector('.standing-character.right[data-character="tsumugi"] .character-mouth');
        if (rightMouseElement && currentSpeaker === 'B') {
            if (totalSpectrum > prevSpec) {
                rightMouseElement.style.backgroundImage = "url('/static/assets/tsumugi_mouse_open.png')";
            } else if (prevSpec - totalSpectrum < 250) {
                rightMouseElement.style.backgroundImage = "url('/static/assets/tsumugi_mouse_open_middle.png')";
            } else if (prevSpec - totalSpectrum < 500) {
                rightMouseElement.style.backgroundImage = "url('/static/assets/tsumugi_mouse_close_middle.png')";
            } else {
                rightMouseElement.style.backgroundImage = "url('/static/assets/tsumugi_mouse_close.png')";
            }
        }
    }

    prevSpec = totalSpectrum;
}

/* 音声再生処理 */
async function playVoice(voice_path, voicevox_id, message, currentSpeaker) {
    console.log("Starting playVoice with:", {
        voice_path,
        voicevox_id,
        message,
        currentSpeaker
    });

    // 音声再生中はボタンを無効化し、2重で再生できないようにする
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = true;
    });

    try {
        const {audioBuffer, ctx: newCtx} = await preparedBuffer(voice_path);
        console.log("Audio buffer prepared successfully");

        ctx = newCtx;
        const {audioSrc: newAudioSrc, analyser: newAnalyser} = buildNodes(audioBuffer, ctx);
        audioSrc = newAudioSrc;
        analyser = newAnalyser;

        // 音声再生開始前に状態を更新
        isPlaying = true;
        if (currentStatusIndicator) {
            currentStatusIndicator.textContent = '再生中...';
        }

        console.log("Starting audio playback");
        audioSrc.start();

        // 40ms毎に音声のサンプリング→解析→リップシンクを行う
        sampleInterval = setInterval(() => {
            let spectrums = new Uint8Array(analyser.fftSize);
            analyser.getByteFrequencyData(spectrums);
            console.log('Frequency Data:', Array.from(spectrums.slice(0, 10)));
            syncLip(spectrums, voicevox_id, currentSpeaker);
        }, 40);

        // 音声終了時のコールバック
        audioSrc.onended = () => {
            console.log("Audio playback ended");
            clearInterval(sampleInterval);
            audioSrc = null;
            ctx.close();
            ctx = null;
            prevSpec = 0;
            isPlaying = false;

            // ボタンを再度有効化
            buttons.forEach(button => {
                button.disabled = false;
            });

            // 音声再生完了時にステータスを更新
            if (currentStatusIndicator) {
                currentStatusIndicator.textContent = '再生可能';
                const playButton = currentStatusIndicator.previousElementSibling;
                if (playButton) {
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                }
            }

            // 口を閉じた状態に戻す
            const leftMouseElement = document.querySelector('.standing-character.left .character-mouth');
            const rightMouseElement = document.querySelector('.standing-character.right .character-mouth');

            // キャラクター別の口の画像設定
            if (leftMouseElement && currentSpeaker === 'A') {
                if (speakerASelect.value === '四国めたん') {
                    leftMouseElement.style.backgroundImage = "url('/static/assets/metan_mouse_close.png')";
                } else if (speakerASelect.value === '雨晴はう') {
                    leftMouseElement.style.backgroundImage = "url('/static/assets/hau_mouse_close.png')";
                } else if (speakerASelect.value === '春日部つむぎ') {
                    leftMouseElement.style.backgroundImage = "url('/static/assets/tsumugi_mouse_close.png')";
                }
            }
            if (rightMouseElement && currentSpeaker === 'B') {
                if (speakerBSelect.value === '四国めたん') {
                    rightMouseElement.style.backgroundImage = "url('/static/assets/metan_mouse_close.png')";
                } else if (speakerBSelect.value === '雨晴はう') {
                    rightMouseElement.style.backgroundImage = "url('/static/assets/hau_mouse_close.png')";
                } else if (speakerBSelect.value === '春日部つむぎ') {
                    rightMouseElement.style.backgroundImage = "url('/static/assets/tsumugi_mouse_close.png')";
                }
            }
        };
    } catch (error) {
        console.error('Error in playVoice:', error);
        clearInterval(sampleInterval);
        if (audioSrc) {
            audioSrc.stop();
            audioSrc = null;
        }
        if (ctx) {
            ctx.close();
            ctx = null;
        }
        prevSpec = 0;
        isPlaying = false;

        buttons.forEach(button => {
            button.disabled = false;
        });

        if (currentStatusIndicator) {
            currentStatusIndicator.textContent = '再生エラー';
            const playButton = currentStatusIndicator.previousElementSibling;
            if (playButton) {
                playButton.innerHTML = '<i class="fas fa-play"></i>';
                playButton.disabled = true;
            }
        }
        throw error;
    }
}

// createAudioControl関数の修正部分
function createAudioControl(text, styleId, currentSpeaker) {
    const audioControl = document.createElement('div');
    audioControl.classList.add('audio-control');

    const playButton = document.createElement('button');
    playButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
    playButton.disabled = !TTS_QUEST_API_KEY;

    const statusIndicator = document.createElement('span');
    statusIndicator.classList.add('status-indicator');
    statusIndicator.textContent = '再生可能';

    playButton.addEventListener('click', async () => {
        if (isPlaying) {
            console.log("検証用");
            audio.pause();
            audio.currentTime = 0;
            isPlaying = false;
            playButton.innerHTML = '<i class="fas fa-play"></i>';
            statusIndicator.textContent = '再生可能';
            return;
        }

        try {
            console.log("Playing audio for styleId:", styleId);
            currentStatusIndicator = statusIndicator;
            isPlaying = true;
            playButton.innerHTML = '<i class="fas fa-pause"></i>';
            statusIndicator.textContent = '再生中...';
            await play(text, styleId, currentSpeaker);
        } catch (error) {
            console.error('Play method error:', error);
            statusIndicator.textContent = '再生エラー';
            isPlaying = false;
            playButton.innerHTML = '<i class="fas fa-play"></i>';
            playButton.disabled = true;
        }
    });

    audioControl.appendChild(playButton);
    audioControl.appendChild(statusIndicator);
    return audioControl;
}

async function play(text, styleId, currentSpeaker) {
    console.log("Starting play function with:", {text, styleId, currentSpeaker});
    var ttsQuestApiKey = 'p-s205e-L706841';
    var audio = new TtsQuestV3Voicevox(styleId, text, ttsQuestApiKey);

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('音声生成がタイムアウトしました'));
        }, 30000);

        audio.addEventListener('tts-ready', async () => {
            clearTimeout(timeout);
            try {
                const mp3Url = await audio.play();
                console.log("Received MP3 URL:", mp3Url);
                if (mp3Url) {
                    await playVoice(mp3Url, styleId, text, currentSpeaker);
                    resolve();
                } else {
                    throw new Error('音声URLの取得に失敗しました');
                }
            } catch (error) {
                console.error("Error playing audio:", error);
                if (currentStatusIndicator) {
                    currentStatusIndicator.textContent = '再生エラー';
                }
                isPlaying = false;
                reject(error);
            }
        });

        audio.addEventListener('tts-error', (event) => {
            clearTimeout(timeout);
            console.error("TTS Error:", event.detail);
            if (currentStatusIndicator) {
                currentStatusIndicator.textContent = '再生エラー';
            }
            isPlaying = false;
            reject(new Error(event.detail));
        });
    });
}

// メッセージ表示関数の修正
function addMessage(text, type) {
    if (!chatMessages) {
        chatMessages = document.getElementById('chat-messages');
    }

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(`${type}-message`);

    // Add icon
    const iconDiv = document.createElement('div');
    iconDiv.classList.add('message-icon');

    if (type === 'user') {
        const userIcon = document.createElement('img');
        userIcon.src = '/static/assets/kkrn_icon_user_4.png';
        userIcon.alt = 'User';
        userIcon.classList.add('user-icon');
        iconDiv.appendChild(userIcon);
    } else {
        const aiIcon = document.createElement('img');
        const speakerA = speakers.find(s => s.speaker_uuid === speakerASelect.value);
        const speakerB = speakers.find(s => s.speaker_uuid === speakerBSelect.value);

        if (type === 'ai-message-a') {
            if (speakerA && speakerA.name === 'ずんだもん') {
                aiIcon.src = '/static/assets/zunda_icon.png';
                aiIcon.alt = 'ずんだもん';
            } else if (speakerA && speakerA.name === '四国めたん') {
                aiIcon.src = '/static/assets/metan_icon.png';
                aiIcon.alt = '四国めたん';
            } else if (speakerA && speakerA.name === '雨晴はう') {
                aiIcon.src = '/static/assets/hau_icon.png';
                aiIcon.alt = '雨晴はう';
            } else if (speakerA && speakerA.name === '春日部つむぎ') {
                aiIcon.src = '/static/assets/tsumugi_icon.png';
                aiIcon.alt = '春日部つむぎ';
            } else {
                aiIcon.src = 'https://raw.githubusercontent.com/VOICEVOX/voicevox/main/assets/icon/256x256.png';
                aiIcon.alt = speakerA ? speakerA.name : 'Speaker A';
            }
        } else {
            if (speakerB && speakerB.name === '四国めたん') {
                aiIcon.src = '/static/assets/metan_icon.png';
                aiIcon.alt = '四国めたん';
            } else if (speakerB && speakerB.name === 'ずんだもん') {
                aiIcon.src = '/static/assets/zunda_icon.png';
                aiIcon.alt = 'ずんだもん';
            } else if (speakerB && speakerB.name === '雨晴はう') {
                aiIcon.src = '/static/assets/hau_icon.png';
                aiIcon.alt = '雨晴はう';
            } else if (speakerB && speakerB.name === '春日部つむぎ') {
                aiIcon.src = '/static/assets/tsumugi_icon.png';
                aiIcon.alt = '春日部つむぎ';
            } else {
                aiIcon.src = 'https://raw.githubusercontent.com/VOICEVOX/voicevox/main/assets/icon/256x256_dark.png';
                aiIcon.alt = speakerB ? speakerB.name : 'Speaker B';
            }
        }
        iconDiv.appendChild(aiIcon);
    }
    messageDiv.appendChild(iconDiv);

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.textContent = text;
    messageDiv.appendChild(contentDiv);

    const timestamp = document.createElement('div');
    timestamp.classList.add('timestamp');
    timestamp.textContent = getCurrentTime();
    messageDiv.appendChild(timestamp);

    if (type !== 'user' && TTS_QUEST_API_KEY) {
        const styleId = type === 'ai-message-a' ? styleASelect.value : styleBSelect.value;
        const currentSpeaker = type === 'ai-message-a' ? 'A' : 'B';
        const audioControl = createAudioControl(text, styleId, currentSpeaker);
        messageDiv.appendChild(audioControl);
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

// グローバル変数の定義
let chatMessages;
let speakerASelect;
let speakerBSelect;
let styleASelect;
let styleBSelect;
let speakers = [];
let TTS_QUEST_API_KEY = '';
let currentTheme = localStorage.getItem('theme') || 'light';
let audio = null;
let isPlaying = false;
let currentStatusIndicator = null;
let ctx = null; // AudioContext: Nodeの作成、音声のデコードの制御などを行う
let audioSrc = null; // AudioBufferSourceNode: 音声入力ノード
let analyser = null; // AnalyserNode: 音声解析ノード
let sampleInterval = null;
let prevSpec = 0; // 前回のサンプリングで取得したスペクトルの合計値


function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}


function showUserMessage(message) {
    console.log("User Message:", message);
    addMessage(message, 'user');
}

class TtsQuestV3Voicevox extends Audio {
    constructor(styleId, text, ttsQuestApiKey) {
        super();
        this.speakerId = styleId;  // スタイルIDをそのまま使用
        this.text = text;
        this.ttsQuestApiKey = ttsQuestApiKey;
        this.isInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.initialize();
    }

    initialize() {
        const params = {
            key: this.ttsQuestApiKey,
            speaker: this.speakerId,
            text: this.text,
            format: 'mp3'
        };
        const query = new URLSearchParams(params);
        this.startGeneration(query);
    }

    startGeneration(query) {
        if (this.src && this.src.length > 0) return;

        const apiUrl = 'https://api.tts.quest/v3/voicevox/synthesis';
        this.dispatchEvent(new CustomEvent('tts-loading'));
        console.log('Starting TTS generation...', {
            url: apiUrl,
            params: Object.fromEntries(query)
        });

        fetch(apiUrl + '?' + query.toString())
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errResponse => {
                        console.error('API Error Response:', errResponse);
                        throw new Error(`HTTP error! status: ${response.status}, message: ${errResponse.message || 'Unknown error'}`);
                    }).catch(jsonError => {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(response => {
                console.log('TTS API Response:', response);
                this.handleApiResponse(response, query);
            })
            .catch(error => {
                console.error('TTS API Error:', error);
                this.handleError(error);
            });
    }

    handleApiResponse(response, query) {
        if (response.retryAfter !== undefined) {
            if (this.retryCount >= this.maxRetries) {
                throw new Error('最大リトライ回数を超えました');
            }
            console.log(`Retrying after ${response.retryAfter} seconds...`);
            this.retryCount++;
            setTimeout(() => this.startGeneration(query), 1000 * (1 + response.retryAfter));
        } else if (response.mp3StreamingUrl) {
            console.log('Received MP3 URL:', response.mp3StreamingUrl);
            this.src = response.mp3StreamingUrl;
            this.preload = 'auto';

            this.oncanplaythrough = () => {
                console.log('Audio is ready to play');
                if (!this.isInitialized) {
                    this.isInitialized = true;
                    this.dispatchEvent(new CustomEvent('tts-ready'));
                }
            };
        } else if (response.errorMessage) {
            throw new Error(response.errorMessage);
        } else {
            throw new Error('不明なサーバーエラー');
        }
    }

    handleError(error) {
        console.error('Error in TTS generation:', error);
        this.dispatchEvent(new CustomEvent('tts-error', {
            detail: error.message || '音声生成中にエラーが発生しました'
        }));
    }

    play() {
        return new Promise((resolve, reject) => {
            if (!this.src) {
                reject(new Error('音声URLが設定されていません'));
                return;
            }

            console.log('Playing audio with URL:', this.src);
            resolve(this.src);
        });
    }
}


document.addEventListener('DOMContentLoaded', async function () {
    chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    speakerASelect = document.getElementById('speaker-a');
    speakerBSelect = document.getElementById('speaker-b');
    styleASelect = document.getElementById('style-a');
    styleBSelect = document.getElementById('style-b');
    const themeToggle = document.getElementById('theme-toggle');

    // Create standing character elements
    const leftCharacter = document.createElement('div');
    leftCharacter.classList.add('standing-character', 'left');
    const rightCharacter = document.createElement('div');
    rightCharacter.classList.add('standing-character', 'right');
    document.body.appendChild(leftCharacter);
    document.body.appendChild(rightCharacter);

    // Function to update standing characters
    function updateStandingCharacters() {
        console.log("Updating standing characters");

        // 既存のキャラクターをクリーンアップ
        if (leftCharacter.cleanup) {
            console.log("Cleaning up left character");
            leftCharacter.cleanup();
        }
        if (rightCharacter.cleanup) {
            console.log("Cleaning up right character");
            rightCharacter.cleanup();
        }

        const speakerA = speakers.find(s => s.speaker_uuid === speakerASelect.value);
        const speakerB = speakers.find(s => s.speaker_uuid === speakerBSelect.value);

        // Update left character (Speaker A)
        console.log("Updating left character (Speaker A):", speakerA?.name);
        if (speakerA) {
            if (speakerA.name === '四国めたん') {
                leftCharacter.setAttribute('data-character', 'metan');
                leftCharacter.innerHTML = `
                    <div class="character-container">
                        <img class="standing-character-base" src="/static/assets/standing_metan.png" alt="四国めたん">
                        <img class="standing-character-eyes" src="/static/assets/metan_eye_open.png" alt="四国めたん目">
                        <div class="character-mouth" style="background-image: url('/static/assets/metan_mouse_close.png')"></div>
                    </div>
                `;
                Promise.resolve().then(() => {
                    console.log("Setting up left character blinking");
                    setupBlinking(leftCharacter);
                });
            } else if (speakerA.name === '雨晴はう') {
                leftCharacter.setAttribute('data-character', 'hau');
                leftCharacter.innerHTML = `
                    <div class="character-container">
                        <img class="standing-character-base" src="/static/assets/hau_standing.png" alt="雨晴はう">
                        <img class="standing-character-eyes" src="/static/assets/hau_open_eyes.png" alt="雨晴はう目">
                        <div class="character-mouth" style="background-image: url('/static/assets/hau_mouse_close.png')"></div>
                    </div>
                `;
                Promise.resolve().then(() => {
                    console.log("Setting up left character blinking for Hau");
                    setupBlinkingForHau(leftCharacter);
                });
            } else if (speakerA.name === '春日部つむぎ') {
                leftCharacter.setAttribute('data-character', 'tsumugi');
                leftCharacter.innerHTML = `
                    <div class="character-container">
                        <img class="standing-character-base" src="/static/assets/standing_tsumugi.png" alt="春日部つむぎ">
                        <img class="standing-character-eyes" src="/static/assets/tsumugi_eye_open.png" alt="春日部つむぎ目">
                        <div class="character-mouth" style="background-image: url('/static/assets/tsumugi_mouse_close.png')"></div>
                    </div>
                `;
                Promise.resolve().then(() => {
                    console.log("Setting up left character blinking for Tsumugi");
                    setupBlinkingForTsumugi(leftCharacter);
                });
            } else {
                leftCharacter.innerHTML = '';
            }
        }

        // Update right character (Speaker B)
        console.log("Updating right character (Speaker B):", speakerB?.name);
        if (speakerB) {
            if (speakerB.name === '四国めたん') {
                rightCharacter.setAttribute('data-character', 'metan');
                rightCharacter.innerHTML = `
                    <div class="character-container">
                        <img class="standing-character-base" src="/static/assets/standing_metan.png" alt="四国めたん">
                        <img class="standing-character-eyes" src="/static/assets/metan_eye_open.png" alt="四国めたん目">
                        <div class="character-mouth" style="background-image: url('/static/assets/metan_mouse_close.png')"></div>
                    </div>
                `;
                Promise.resolve().then(() => {
                    console.log("Setting up right character blinking");
                    setupBlinking(rightCharacter);
                });
            } else if (speakerB.name === '雨晴はう') {
                rightCharacter.setAttribute('data-character', 'hau');
                rightCharacter.innerHTML = `
                    <div class="character-container">
                        <img class="standing-character-base" src="/static/assets/hau_standing.png" alt="雨晴はう">
                        <img class="standing-character-eyes" src="/static/assets/hau_open_eyes.png" alt="雨晴はう目">
                        <div class="character-mouth" style="background-image: url('/static/assets/hau_mouse_close.png')"></div>
                    </div>
                `;
                Promise.resolve().then(() => {
                    console.log("Setting up right character blinking for Hau");
                    setupBlinkingForHau(rightCharacter);
                });
            } else if (speakerB.name === '春日部つむぎ') {
                rightCharacter.setAttribute('data-character', 'tsumugi');
                rightCharacter.innerHTML = `
                    <div class="character-container">
                        <img class="standing-character-base" src="/static/assets/standing_tsumugi.png" alt="春日部つむぎ">
                        <img class="standing-character-eyes" src="/static/assets/tsumugi_eye_open.png" alt="春日部つむぎ目">
                        <div class="character-mouth" style="background-image: url('/static/assets/tsumugi_mouse_close.png')"></div>
                    </div>
                `;
                Promise.resolve().then(() => {
                    console.log("Setting up right character blinking for Tsumugi");
                    setupBlinkingForTsumugi(rightCharacter);
                });
            } else {
                rightCharacter.innerHTML = '';
            }
        }
    }

    // Add event listeners for speaker selection changes
    speakerASelect.addEventListener('change', updateStandingCharacters);
    speakerBSelect.addEventListener('change', updateStandingCharacters);

    // Initialize theme
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeToggleButton();

    function updateThemeToggleButton() {
        if (currentTheme === 'dark') {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i> ライトモード';
        } else {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i> ダークモード';
        }
    }

    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('theme', currentTheme);
        updateThemeToggleButton();
    });

    try {
        const response = await fetch('/get-tts-key');
        const data = await response.json();
        if (data.error) {
            console.error('Failed to get TTS API key:', data.error);
        } else {
            TTS_QUEST_API_KEY = data.key;
        }
    } catch (error) {
        console.error('Error fetching TTS API key:', error);
    }

    function updateStyles(speakerId, styleSelect) {
        const speaker = speakers.find(s => s.speaker_uuid === speakerId);
        if (!speaker) return;

        styleSelect.innerHTML = '';
        speaker.styles.forEach(style => {
            const option = document.createElement('option');
            option.value = style.id;  // スピーカーの各スタイルに対応する正しいIDを使用
            option.textContent = style.name;
            styleSelect.appendChild(option);
        });
    }

    try {
        const response = await fetch('/get-speakers');
        speakers = await response.json();

        const populateSpeakerSelect = (select) => {
            speakers.forEach(speaker => {
                const option = document.createElement('option');
                option.value = speaker.speaker_uuid;
                option.textContent = speaker.name;
                select.appendChild(option);
            });
        };

        populateSpeakerSelect(speakerASelect);
        populateSpeakerSelect(speakerBSelect);

        // 初期話者の設定
        speakerASelect.value = speakers.find(s => s.name === 'ずんだもん')?.speaker_uuid || speakers[0]?.speaker_uuid;
        speakerBSelect.value = speakers.find(s => s.name === '四国めたん')?.speaker_uuid || speakers[1]?.speaker_uuid;

        // 初期スタイルの設定
        updateStyles(speakerASelect.value, styleASelect);
        updateStyles(speakerBSelect.value, styleBSelect);

        // デフォルトのスタイルを「あまあま」に設定（存在する場合）
        const setDefaultStyle = (styleSelect, speaker) => {
            const amaama = speaker.styles.find(s => s.name === 'あまあま');
            if (amaama) {
                styleSelect.value = amaama.id;
            }
        };

        const speakerA = speakers.find(s => s.speaker_uuid === speakerASelect.value);
        const speakerB = speakers.find(s => s.speaker_uuid === speakerBSelect.value);

        if (speakerA) setDefaultStyle(styleASelect, speakerA);
        if (speakerB) setDefaultStyle(styleBSelect, speakerB);

        updateStandingCharacters();

        speakerASelect.addEventListener('change', () => {
            updateStyles(speakerASelect.value, styleASelect);
            const newSpeaker = speakers.find(s => s.speaker_uuid === speakerASelect.value);
            if (newSpeaker) setDefaultStyle(styleASelect, newSpeaker);
            updateStandingCharacters();
        });

        speakerBSelect.addEventListener('change', () => {
            updateStyles(speakerBSelect.value, styleBSelect);
            const newSpeaker = speakers.find(s => s.speaker_uuid === speakerBSelect.value);
            if (newSpeaker) setDefaultStyle(styleBSelect, newSpeaker);
            updateStandingCharacters();
        });

    } catch (error) {
        console.error('Error loading speakers:', error);
    }



    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        userInput.value = '';

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    speaker_a: speakerASelect.value,
                    speaker_b: speakerBSelect.value
                })
            });

            const data = await response.json();
            if (response.ok) {
                // 話者Aのメッセージを追加して再生
                const speakerAMessage = addMessage(data.speaker_a, 'ai-message-a');
                if (speakerAMessage) {
                    await play(data.speaker_a, styleASelect.value, 'A');
                }

                // 話者Bのメッセージを追加して再生（話者Aの再生後に遅延して実行）
                const speakerBMessage = addMessage(data.speaker_b, 'ai-message-b');
                if (speakerBMessage) {
                    setTimeout(async () => {
                        await play(data.speaker_b, styleBSelect.value, 'B');
                    }, data.speaker_a.length * 180);
                }
            } else {
                addMessage('エラーが発生しました: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Error in sendMessage:', error);
            addMessage('通信エラーが発生しました', 'error');
        }
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function setupBlinking(characterElement) {
        console.log("setupBlinking called for", characterElement.classList.contains('left') ? 'left' : 'right', "character");
        const eyesImage = characterElement.querySelector('.standing-character-eyes');
        if (!eyesImage) {
            console.log("No eyes image found, returning");
            return;
        }

        let isBlinking = false;
        let blinkIntervalId = null;

        // 既存のタイマーをクリーンアップ
        if (characterElement.cleanup) {
            console.log("Cleaning up existing timers");
            characterElement.cleanup();
        }

        function blink() {
            if (!eyesImage || !eyesImage.parentNode || !characterElement.contains(eyesImage)) {
                console.log("Eyes element not valid anymore, cleaning up");
                characterElement.cleanup();
                return;
            }

            if (isBlinking) {
                console.log("Already blinking, skipping");
                return;
            }

            console.log("Executing blink");
            isBlinking = true;

            // 目を閉じる画像を読み込み
            const closedEyeImage = new Image();
            closedEyeImage.onload = () => {
                eyesImage.src = closedEyeImage.src;
                console.log("Eyes closed at:", new Date().toISOString());

                // まばたきの持続時間（150-200ms）
                setTimeout(() => {
                    if (eyesImage && eyesImage.parentNode && characterElement.contains(eyesImage)) {
                        // 目を開く画像を読み込み
                        const openEyeImage = new Image();
                        openEyeImage.onload = () => {
                            eyesImage.src = openEyeImage.src;
                            console.log("Eyes opened at:", new Date().toISOString());
                            isBlinking =false;
                        };
                        openEyeImage.src = '/static/assets/metan_eye_open.png';
                    }
                }, 150 + Math.random() * 50); // ランダムな持続時間を追加
            };
            closedEyeImage.src = '/static/assets/metan_eye_close.png';
        }

        function startBlinking() {
            console.log("Starting blink animation");
            if (blinkIntervalId) {
                console.log("Clearing existing interval");
                clearInterval(blinkIntervalId);
            }

            // まばたきのインターバルを2.5-3.5秒の範囲で設定
            const interval = 2500 + Math.random() * 1000;
            console.log("Setting blink interval to", interval, "ms");
            blinkIntervalId = setInterval(() => {
                if (eyesImage && eyesImage.parentNode && characterElement.contains(eyesImage)) {
                    blink();
                } else {
                    console.log("Character element invalid, cleaning up");
                    characterElement.cleanup();
                }
            }, interval);

            // 初回まばたきを0.5-1秒後に開始
            const initialDelay = 500 + Math.random() * 500;
            console.log("Setting initial blink delay to", initialDelay, "ms");
            setTimeout(() => {
                if (eyesImage && eyesImage.parentNode && characterElement.contains(eyesImage)) {
                    blink();
                }
            }, initialDelay);
        }

        // クリーンアップ用の関数を改善
        characterElement.cleanup = () => {
            console.log("Cleanup called");
            if (blinkIntervalId) {
                console.log("Clearing interval in cleanup");
                clearInterval(blinkIntervalId);
                blinkIntervalId = null;
            }
            isBlinking = false;
        };

        // アニメーション開始前に要素の存在を再確認
        requestAnimationFrame(() => {
            if (eyesImage && eyesImage.parentNode && characterElement.contains(eyesImage)) {
                console.log("Starting blinking animation after RAF");
                startBlinking();
            } else {
                console.log("Elements not ready after RAF, skipping");
            }
        });
    }

    // Add setupBlinkingForHau function
    function setupBlinkingForHau(characterElement) {
        console.log("setupBlinkingForHau called for", characterElement.classList.contains('left') ? 'left' : 'right', "character");
        const eyesImage = characterElement.querySelector('.standing-character-eyes');
        if (!eyesImage) {
            console.log("No eyes image found for Hau, returning");
            return;
        }

        let isBlinking = false;
        let blinkIntervalId = null;

        // Clean up existing timers
        if (characterElement.cleanup) {
            console.log("Cleaning up existing timers for Hau");
            characterElement.cleanup();
        }

        function blink() {
            if (!eyesImage || !eyesImage.parentNode || !characterElement.contains(eyesImage)) {
                console.log("Eyes element not valid anymore for Hau, cleaning up");
                characterElement.cleanup();
                return;
            }

            if (isBlinking) {
                console.log("Already blinking, skipping for Hau");
                return;
            }

            console.log("Executing blink for Hau");
            isBlinking = true;

            // Load closed eye image
            const closedEyeImage = new Image();
            closedEyeImage.onload = () => {
                eyesImage.src = closedEyeImage.src;
                console.log("Hau eyes closed at:", new Date().toISOString());

                // Blink duration (150-200ms)
                setTimeout(() => {
                    if (eyesImage && eyesImage.parentNode && characterElement.contains(eyesImage)) {
                        // Load open eye image
                        const openEyeImage = new Image();
                        openEyeImage.onload = () => {
                            eyesImage.src = openEyeImage.src;
                            console.log("Hau eyes opened at:", new Date().toISOString());
                            isBlinking = false;
                        };
                        openEyeImage.src = '/static/assets/hau_open_eyes.png';
                    }
                }, 150 + Math.random() * 50);
            };
            closedEyeImage.src = '/static/assets/hau_close_eyes.png';
        }

        function startBlinking() {
            console.log("Starting blink animation for Hau");
            if (blinkIntervalId) {
                console.log("Clearing existing interval for Hau");
                clearInterval(blinkIntervalId);
            }

            const interval = 2500 + Math.random() * 1000;
            console.log("Setting blink interval to", interval, "ms for Hau");
            blinkIntervalId = setInterval(() => {
                if (eyesImage && eyesImage.parentNode && characterElement.contains(eyesImage)) {
                    blink();
                } else {
                    console.log("Character element invalid for Hau, cleaning up");
                    characterElement.cleanup();
                }
            }, interval);

            const initialDelay = 500 + Math.random() * 500;
            console.log("Setting initial blink delay to", initialDelay, "ms for Hau");
            setTimeout(() => {
                if (eyesImage && eyesImage.parentNode && characterElement.contains(eyesImage)) {
                    blink();
                }
            }, initialDelay);
        }

        characterElement.cleanup = () => {
            console.log("Cleanup called for Hau");
            if (blinkIntervalId) {
                console.log("Clearing interval in cleanup for Hau");
                clearInterval(blinkIntervalId);
                blinkIntervalId = null;
            }
            isBlinking = false;
        };

        requestAnimationFrame(() => {
            if (eyesImage && eyesImage.parentNode && characterElement.contains(eyesImage)) {
                startBlinking();
            }
        });
    }

    // Add new function for Tsumugi's blinking
    function setupBlinkingForTsumugi(characterElement) {
        console.log("setupBlinkingForTsumugi called for", characterElement.classList.contains('left') ? 'left' : 'right', "character");
        const eyesImage = characterElement.querySelector('.standing-character-eyes');
        if (!eyesImage) {
            console.log("No eyes image found, returning");
            return;
        }

        let isBlinking = false;
        let blinkIntervalId = null;

        // 既存のタイマーをクリーンアップ
        if (characterElement.cleanup) {
            console.log("Cleaning up existing timers");
            characterElement.cleanup();
        }

        function blink() {
            if (!eyesImage || !eyesImage.parentNode || !characterElement.contains(eyesImage)) {
                console.log("Eyes element not valid anymore, cleaning up");
                characterElement.cleanup();
                return;
            }

            if (isBlinking) {
                console.log("Already blinking, skipping");
                return;
            }

            console.log("Executing blink");
            isBlinking = true;
            const startTime = new Date();
            console.log("Eyes closed at:", startTime.toISOString());

            // 目を閉じる
            eyesImage.src = '/static/assets/tsumugi_eye_close.png';

            // 0.8〜1.2秒後に目を開く
            setTimeout(() => {
                if (eyesImage && eyesImage.parentNode && characterElement.contains(eyesImage)) {
                    eyesImage.src = '/static/assets/tsumugi_eye_open.png';
                    const endTime = new Date();
                    console.log("Eyes opened at:", endTime.toISOString());
                    isBlinking = false;
                }
            }, Math.random() * 400 + 800);
        }

        // 最初のまばたきは0.5〜2秒後
        const initialDelay = Math.random() * 1500 + 500;
        setTimeout(() => {
            blink();
            // その後は2〜5秒おきにまばたき
            blinkIntervalId = setInterval(() => {
                if (Math.random() < 0.7) { // 70%の確率でまばたき
                    blink();
                }
            }, Math.random() * 3000 + 2000);
        }, initialDelay);

        // クリーンアップ関数
        characterElement.cleanup = () => {
            console.log("Cleaning up blink interval");
            if (blinkIntervalId) {
                clearInterval(blinkIntervalId);
                blinkIntervalId = null;
            }
        };
    }

    // Add reset conversation button handler
    const resetButton = document.getElementById('reset-conversation');
    resetButton.addEventListener('click', async () => {
        try {
            const response = await fetch('/reset-conversation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Clear chat messages from the UI
                chatMessages.innerHTML = '';
                addMessage('会話履歴をリセットしました', 'system');
            } else {
                const data = await response.json();
                addMessage('エラーが発生しました: ' + data.error, 'error');
            }
        } catch (error) {
            addMessage('通信エラーが発生しました', 'error');
        }
    });
});
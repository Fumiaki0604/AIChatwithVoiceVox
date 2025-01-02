/* 音声データをAudioBufferに変換 */
async function preparedBuffer(voice_path) {
    const ctx = new AudioContext()
    const res = await fetch(voice_path)
    const arrayBuffer = await res.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)

    return {audioBuffer, ctx};
}

/* 入力ノード、Analyserノードを生成し、出力層に接続 */
function buildNodes(audioBuffer, ctx) {
    const audioSrc = new AudioBufferSourceNode(ctx, { buffer: audioBuffer })
    const analyser = new AnalyserNode(ctx)
    analyser.fftSize = 512
    audioSrc.connect(analyser).connect(ctx.destination)
    return {audioSrc, analyser};
}

class TtsQuestV3Voicevox extends Audio {
    constructor(styleId, text, ttsQuestApiKey) {
        super();
        this.styleId = styleId;
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
            speaker: this.styleId,
            text: this.text
        };
        const query = new URLSearchParams(params);
        this.startGeneration(query);
    }

    startGeneration(query) {
        if (this.src && this.src.length > 0) return;

        const apiUrl = 'https://api.tts.quest/v3/voicevox/synthesis';
        this.dispatchEvent(new CustomEvent('tts-loading'));
        console.log('Starting TTS generation...');

        fetch(apiUrl + '?' + query.toString())
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
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
            super.play()
                .then(() => {
                    resolve(this.src);
                })
                .catch(error => {
                    console.error('Error playing audio:', error);
                    reject(error);
                });
        });
    }
}

let ctx = null // AudioContext: Nodeの作成、音声のデコードの制御などを行う
let audioSrc = null // AudioBufferSourceNode: 音声入力ノード
let analyser = null // AnalyserNode: 音声解析ノード
let sampleInterval = null
let prevSpec = 0 // 前回のサンプリングで取得したスペクトルの配列

/* 音声再生処理 */
async function playVoice(voice_path, voicevox_id, message) {
    console.log("playvoice呼び出し");
    console.log(voice_path);
    console.log(voicevox_id);

    // 音声再生中はボタンを無効化し、2重で再生できないようにする
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = true;
    });

    try {
        const {audioBuffer, ctx: newCtx} = await preparedBuffer(voice_path); // audioBuffer取得
        ctx = newCtx;
        const {audioSrc: newAudioSrc, analyser: newAnalyser} = buildNodes(audioBuffer, ctx); // 入力、解析ノード作成
        audioSrc = newAudioSrc;
        analyser = newAnalyser;
        audioSrc.start(); // 音声再生開始

        //メッセージ表示開始
        setTimeout(() => {
            showUserMessage(message);
        }, 1500);

        // 50ms毎に音声のサンプリング→解析→リップシンクを行う
        sampleInterval = setInterval(() => {
            let spectrums = new Uint8Array(analyser.fftSize);
            analyser.getByteFrequencyData(spectrums);
            console.log('Frequency Data:', Array.from(spectrums.slice(0, 10)));
        }, 50);

        // 音声終了時のコールバック： リソースの開放、無効化していたボタンを有効化する
        audioSrc.onended = () => {
            clearInterval(sampleInterval);
            audioSrc = null;
            ctx.close();
            ctx = null;
            prevSpec = 0;
            buttons.forEach(button => {
                button.disabled = false;
            });
        };
    } catch (error) {
        console.error('Error in playVoice:', error);
        buttons.forEach(button => {
            button.disabled = false;
        });
    }
}


document.addEventListener('DOMContentLoaded', async function () {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const speakerASelect = document.getElementById('speaker-a');
    const speakerBSelect = document.getElementById('speaker-b');
    const styleASelect = document.getElementById('style-a');
    const styleBSelect = document.getElementById('style-b');
    const themeToggle = document.getElementById('theme-toggle');
    let speakers = [];
    let TTS_QUEST_API_KEY = '';
    let currentTheme = localStorage.getItem('theme') || 'light';

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
        if (speakerA && speakerA.name === '四国めたん') {
            leftCharacter.innerHTML = `
                <img class="standing-character-base" src="/static/assets/standing_metan.png" alt="四国めたん">
                <img class="standing-character-eyes" src="/static/assets/metan_eye_open.png" alt="四国めたん目">
            `;
            // DOMの更新が完了するのを待ってから初期化
            Promise.resolve().then(() => {
                console.log("Setting up left character blinking");
                setupBlinking(leftCharacter);
            });
        } else {
            leftCharacter.innerHTML = '';
        }

        // Update right character (Speaker B)
        console.log("Updating right character (Speaker B):", speakerB?.name);
        if (speakerB && speakerB.name === '四国めたん') {
            rightCharacter.innerHTML = `
                <img class="standing-character-base" src="/static/assets/standing_metan.png" alt="四国めたん">
                <img class="standing-character-eyes" src="/static/assets/metan_eye_open.png" alt="四国めたん目">
            `;
            // DOMの更新が完了するのを待ってから初期化
            Promise.resolve().then(() => {
                console.log("Setting up right character blinking");
                setupBlinking(rightCharacter);
            });
        } else {
            rightCharacter.innerHTML = '';
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
            option.value = style.id;
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

        speakerASelect.value = speakers.find(s => s.name === 'ずんだもん')?.speaker_uuid || speakers[0]?.speaker_uuid;
        speakerBSelect.value = speakers.find(s => s.name === '四国めたん')?.speaker_uuid || speakers[1]?.speaker_uuid;

        updateStyles(speakerASelect.value, styleASelect);
        updateStyles(speakerBSelect.value, styleBSelect);
        updateStandingCharacters(); // Initialize standing characters

        speakerASelect.addEventListener('change', () => {
            updateStyles(speakerASelect.value, styleASelect);
            updateStandingCharacters();
        });
        speakerBSelect.addEventListener('change', () => {
            updateStyles(speakerBSelect.value, styleBSelect);
            updateStandingCharacters();
        });

    } catch (error) {
        console.error('Error loading speakers:', error);
    }

    function getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    }

    const createAudioControl = (text, styleId) => {
        const audioControl = document.createElement('div');
        audioControl.classList.add('audio-control');

        const playButton = document.createElement('button');
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        playButton.disabled = !TTS_QUEST_API_KEY;

        const statusIndicator = document.createElement('span');
        statusIndicator.classList.add('status-indicator');
        statusIndicator.textContent = '準備中...';

        let audio = null;
        let isPlaying = false;

        const initializeAudio = () => {
            if (!audio) {
                audio = new TtsQuestV3Voicevox(styleId, text, TTS_QUEST_API_KEY);

                audio.addEventListener('tts-loading', () => {
                    console.log('TTS Loading...');
                    statusIndicator.textContent = '音声生成中...';
                    playButton.disabled = true;
                });

                audio.addEventListener('tts-ready', () => {
                    console.log('TTS Ready!');
                    statusIndicator.textContent = '再生可能';
                    playButton.disabled = false;
                });

                audio.addEventListener('tts-error', (event) => {
                    console.error('TTS Error:', event.detail);
                    statusIndicator.textContent = `エラー: ${event.detail}`;
                    playButton.disabled = true;
                });

                audio.addEventListener('play', () => {
                    console.log('Audio playing');
                    isPlaying = true;
                    playButton.innerHTML = '<i class="fas fa-stop"></i>';
                    statusIndicator.textContent = '再生中';
                });

                audio.addEventListener('ended', () => {
                    console.log('Audio ended');
                    isPlaying = false;
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                    statusIndicator.textContent = '再生可能';
                });

                audio.addEventListener('error', (e) => {
                    console.error('Audio error:', e);
                    statusIndicator.textContent = '再生エラー';
                    playButton.disabled = true;
                });
            }
            return audio;
        };

        playButton.addEventListener('click', async () => {
            if (isPlaying) {
                audio.pause();
                audio.currentTime = 0;
                isPlaying = false;
                playButton.innerHTML = '<i class="fas fa-play"></i>';
                statusIndicator.textContent = '再生可能';
                return;
            }

            const audioInstance = initializeAudio();
            try {
                const speaker = speakers.find(s => s.speaker_uuid === styleId);
                const voicePath = speaker ? speaker.voice_path : null;
                if(voicePath){
                    await playVoice(voicePath, styleId, text);
                } else {
                    console.error("Voice path not found for speaker:", styleId);
                    statusIndicator.textContent = "音声データが見つかりません";
                    playButton.disabled = true;
                }
            } catch (error) {
                console.error('Play method error:', error);
                statusIndicator.textContent = '再生エラー';
                playButton.disabled = true;
            }
        });

        audioControl.appendChild(playButton);
        audioControl.appendChild(statusIndicator);
        return audioControl;
    };

    function addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(`${type}-message`);

        // Add icon
        const iconDiv = document.createElement('div');
        iconDiv.classList.add('message-icon');

        if (type === 'user') {
            const userIcon = document.createElement('i');
            userIcon.classList.add('fas', 'fa-user');
            iconDiv.appendChild(userIcon);
        } else {
            const aiIcon = document.createElement('img');
            const speakerA = speakers.find(s => s.speaker_uuid === speakerASelect.value);
            const speakerB = speakers.find(s => s.speaker_uuid === speakerBSelect.value);

            if (type === 'ai-message-a') {
                // ずんだもんの場合
                if (speakerA && speakerA.name === 'ずんだもん') {
                    aiIcon.src = '/static/assets/zunda_icon.png';
                    aiIcon.alt = 'ずんだもん';
                } else if (speakerA && speakerA.name === '四国めたん') {
                    aiIcon.src = '/static/assets/metan_icon.png';
                    aiIcon.alt = '四国めたん';
                } else {
                    aiIcon.src = 'https://raw.githubusercontent.com/VOICEVOX/voicevox/main/assets/icon/256x256.png';
                    aiIcon.alt = speakerA ? speakerA.name : 'Speaker A';
                }
            } else {
                // 四国めたんの場合
                if (speakerB && speakerB.name === '四国めたん') {
                    aiIcon.src = '/static/assets/metan_icon.png';
                    aiIcon.alt = '四国めたん';
                } else if (speakerB && speakerB.name === 'ずんだもん') {
                    aiIcon.src = '/static/assets/zunda_icon.png';
                    aiIcon.alt = 'ずんだもん';
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
            const styleId = type === 'ai-message-a' ?
                styleASelect.value : styleBSelect.value;
            const audioControl = createAudioControl(text, styleId);
            messageDiv.appendChild(audioControl);
        }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv;
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
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();
            if (response.ok) {
                const speakerAMessage = addMessage(data.speaker_a, 'ai-message-a');
                const speakerAAudio = speakerAMessage.querySelector('.audio-control');
                if (speakerAAudio) {
                    const audio = speakerAAudio.querySelector('button');
                    const statusIndicator = speakerAAudio.querySelector('.status-indicator');

                    const speakerA = speakers.find(s => s.speaker_uuid === speakerASelect.value);
                    const voicePathA = speakerA ? speakerA.voice_path : null;
                    if(voicePathA){
                        await playVoice(voicePathA, speakerASelect.value, data.speaker_a);
                    } else {
                        console.error("Voice path not found for speaker A:", speakerASelect.value);
                        statusIndicator.textContent = "音声データが見つかりません";
                        audio.disabled = true;
                    }
                }

                const speakerBMessage = addMessage(data.speaker_b, 'ai-message-b');
                const speakerBAudio = speakerBMessage.querySelector('.audio-control');
                if (speakerBAudio) {
                    const audio = speakerBAudio.querySelector('button');
                    const statusIndicator = speakerBAudio.querySelector('.status-indicator');

                    const speakerB = speakers.find(s => s.speaker_uuid === speakerBSelect.value);
                    const voicePathB = speakerB ? speakerB.voice_path : null;
                    if(voicePathB){
                        setTimeout( async () => {
                            await playVoice(voicePathB, speakerBSelect.value, data.speaker_b);
                        }, data.speaker_a.length * 180);
                    } else {
                        console.error("Voice path not found for speaker B:", speakerBSelect.value);
                        statusIndicator.textContent = "音声データが見つかりません";
                        audio.disabled = true;
                    }
                }

            } else {
                addMessage('エラーが発生しました: ' + data.error, 'error');
            }
        } catch (error) {
            addMessage('通信エラーが発生しました', 'error');
        }
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // まばたきアニメーションの設定関数を修正
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
                            isBlinking = false;
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
    function showUserMessage(message){
        console.log("User Message:", message);
        // addMessage を使用してユーザーメッセージを表示
        addMessage(message, 'user');
    }
});
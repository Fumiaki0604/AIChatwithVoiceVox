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
        // 既存のキャラクターをクリーンアップ
        if (leftCharacter.cleanup) {
            leftCharacter.cleanup();
        }
        if (rightCharacter.cleanup) {
            rightCharacter.cleanup();
        }

        const speakerA = speakers.find(s => s.speaker_uuid === speakerASelect.value);
        const speakerB = speakers.find(s => s.speaker_uuid === speakerBSelect.value);

        // Update left character (Speaker A)
        if (speakerA && speakerA.name === '四国めたん') {
            leftCharacter.innerHTML = `
                <img class="standing-character-base" src="/static/assets/standing_metan.png" alt="四国めたん">
                <img class="standing-character-eyes" src="/static/assets/metan_eye_open.png" alt="四国めたん目">
            `;
            // DOMの更新が完了するのを待ってから初期化
            requestAnimationFrame(() => {
                setupBlinking(leftCharacter);
            });
        } else {
            leftCharacter.innerHTML = '';
        }

        // Update right character (Speaker B)
        if (speakerB && speakerB.name === '四国めたん') {
            rightCharacter.innerHTML = `
                <img class="standing-character-base" src="/static/assets/standing_metan.png" alt="四国めたん">
                <img class="standing-character-eyes" src="/static/assets/metan_eye_open.png" alt="四国めたん目">
            `;
            // DOMの更新が完了するのを待ってから初期化
            requestAnimationFrame(() => {
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

        playButton.addEventListener('click', () => {
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
                audioInstance.play().catch(error => {
                    console.error('Playback error:', error);
                    statusIndicator.textContent = '再生エラー';
                    playButton.disabled = true;
                });
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
                    await new Promise((resolve, reject) => {
                        const audio = speakerAAudio.querySelector('button');
                        const statusIndicator = speakerAAudio.querySelector('.status-indicator');

                        audio.click();

                        const checkStatus = setInterval(() => {
                            if (statusIndicator.textContent === '再生可能' && !audio.disabled) {
                                clearInterval(checkStatus);
                                resolve();
                            }
                        }, 1000);

                        setTimeout(() => {
                            clearInterval(checkStatus);
                            resolve();
                        }, 30000);
                    });
                }

                const speakerBMessage = addMessage(data.speaker_b, 'ai-message-b');
                const speakerBAudio = speakerBMessage.querySelector('.audio-control');
                if (speakerBAudio) {
                    await new Promise((resolve, reject) => {
                        const audio = speakerBAudio.querySelector('button');
                        const statusIndicator = speakerBAudio.querySelector('.status-indicator');

                        // 待機時間を文字数×0.2秒に変更
                        const waitTimeMs = data.speaker_a.length * 200;
                        console.log(`Waiting ${waitTimeMs}ms before playing speaker B's audio`);

                        setTimeout(() => {
                            audio.click();

                            const checkStatus = setInterval(() => {
                                if (statusIndicator.textContent === '再生可能' && !audio.disabled) {
                                    clearInterval(checkStatus);
                                    resolve();
                                }
                            }, 1000);

                            setTimeout(() => {
                                clearInterval(checkStatus);
                                resolve();
                            }, 30000);
                        }, waitTimeMs);
                    });
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
        const eyesImage = characterElement.querySelector('.standing-character-eyes');
        if (!eyesImage) return; // 目の画像が見つからない場合は処理を終了

        let isBlinking = false;
        let blinkIntervalId = null;

        // 既存のタイマーをクリーンアップ
        if (characterElement.cleanup) {
            characterElement.cleanup();
        }

        function blink() {
            if (!eyesImage || !eyesImage.parentNode || !characterElement.contains(eyesImage)) {
                characterElement.cleanup();
                return;
            }

            if (isBlinking) return;

            isBlinking = true;
            eyesImage.src = '/static/assets/metan_eye_close.png';

            // まばたきの持続時間（100ms）
            setTimeout(() => {
                if (eyesImage && eyesImage.parentNode && characterElement.contains(eyesImage)) {
                    eyesImage.src = '/static/assets/metan_eye_open.png';
                    isBlinking = false;
                }
            }, 100);
        }

        function startBlinking() {
            if (blinkIntervalId) clearInterval(blinkIntervalId);

            // まばたきのインターバルを2.5-3.5秒の範囲で設定
            blinkIntervalId = setInterval(() => {
                if (eyesImage && eyesImage.parentNode && characterElement.contains(eyesImage)) {
                    blink();
                } else {
                    characterElement.cleanup();
                }
            }, 2500 + Math.random() * 1000);

            // 初回まばたきを0.5-1秒後に開始
            setTimeout(() => {
                if (eyesImage && eyesImage.parentNode && characterElement.contains(eyesImage)) {
                    blink();
                }
            }, 500 + Math.random() * 500);
        }

        // クリーンアップ用の関数を改善
        characterElement.cleanup = () => {
            if (blinkIntervalId) {
                clearInterval(blinkIntervalId);
                blinkIntervalId = null;
            }
            isBlinking = false;
        };

        // まばたきを開始
        startBlinking();
    }
});
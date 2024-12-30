class TtsQuestV3Voicevox extends Audio {
    constructor(speakerId, text, ttsQuestApiKey) {
        super();
        this.speakerId = speakerId;
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
            text: this.text
        };
        const query = new URLSearchParams(params);
        this.startGeneration(query);
    }

    startGeneration(query) {
        if (this.src && this.src.length > 0) return;

        const apiUrl = 'https://api.tts.quest/v3/voicevox/synthesis';
        this.dispatchEvent(new CustomEvent('tts-loading'));
        console.log('Starting TTS generation...'); // デバッグログ

        fetch(apiUrl + '?' + query.toString())
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(response => {
                console.log('TTS API Response:', response); // デバッグログ
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
            console.log(`Retrying after ${response.retryAfter} seconds...`); // デバッグログ
            this.retryCount++;
            setTimeout(() => this.startGeneration(query), 1000 * (1 + response.retryAfter));
        }
        else if (response.mp3StreamingUrl) {
            console.log('Received MP3 URL:', response.mp3StreamingUrl); // デバッグログ
            this.src = response.mp3StreamingUrl;
            this.preload = 'auto';

            this.oncanplaythrough = () => {
                console.log('Audio is ready to play'); // デバッグログ
                if (!this.isInitialized) {
                    this.isInitialized = true;
                    this.dispatchEvent(new CustomEvent('tts-ready'));
                }
            };
        }
        else if (response.errorMessage) {
            throw new Error(response.errorMessage);
        }
        else {
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

    // Fetch TTS Quest API Key from server
    let TTS_QUEST_API_KEY = '';
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

    // Load speakers
    try {
        const response = await fetch('/get-speakers');
        const speakers = await response.json();

        // Populate speaker selects
        const populateSelect = (select, speakers) => {
            speakers.forEach(speaker => {
                const option = document.createElement('option');
                option.value = speaker.id;
                option.textContent = speaker.name;
                select.appendChild(option);
            });
        };

        populateSelect(speakerASelect, speakers);
        populateSelect(speakerBSelect, speakers);

        // Set default speakers
        speakerASelect.value = '3'; // ずんだもん
        speakerBSelect.value = '2'; // 四国めたん
    } catch (error) {
        console.error('Error loading speakers:', error);
    }

    function getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    }

    const createAudioControl = (text, speakerId) => {
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
                audio = new TtsQuestV3Voicevox(speakerId, text, TTS_QUEST_API_KEY);

                audio.addEventListener('tts-loading', () => {
                    console.log('TTS Loading...'); // デバッグログ
                    statusIndicator.textContent = '音声生成中...';
                    playButton.disabled = true;
                });

                audio.addEventListener('tts-ready', () => {
                    console.log('TTS Ready!'); // デバッグログ
                    statusIndicator.textContent = '再生可能';
                    playButton.disabled = false;
                });

                audio.addEventListener('tts-error', (event) => {
                    console.error('TTS Error:', event.detail); // デバッグログ
                    statusIndicator.textContent = `エラー: ${event.detail}`;
                    playButton.disabled = true;
                });

                audio.addEventListener('play', () => {
                    console.log('Audio playing'); // デバッグログ
                    isPlaying = true;
                    playButton.innerHTML = '<i class="fas fa-stop"></i>';
                    statusIndicator.textContent = '再生中';
                });

                audio.addEventListener('ended', () => {
                    console.log('Audio ended'); // デバッグログ
                    isPlaying = false;
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                    statusIndicator.textContent = '再生可能';
                });

                audio.addEventListener('error', (e) => {
                    console.error('Audio error:', e); // デバッグログ
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

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.textContent = text;
        messageDiv.appendChild(contentDiv);

        const timestamp = document.createElement('div');
        timestamp.classList.add('timestamp');
        timestamp.textContent = getCurrentTime();
        messageDiv.appendChild(timestamp);

        if (type !== 'user' && TTS_QUEST_API_KEY) {
            const speakerId = type === 'ai-message-a' ?
                speakerASelect.value : speakerBSelect.value;
            const audioControl = createAudioControl(text, speakerId);
            messageDiv.appendChild(audioControl);
        }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv; // Return the messageDiv element
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Add user message
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
                // Add speaker A's response and wait for audio completion
                const speakerAMessage = addMessage(data.speaker_a, 'ai-message-a');
                const speakerAAudio = speakerAMessage.querySelector('.audio-control');
                if (speakerAAudio) {
                    await new Promise((resolve, reject) => {
                        const audio = speakerAAudio.querySelector('button');
                        const statusIndicator = speakerAAudio.querySelector('.status-indicator');

                        // Automatically play speaker A's audio
                        audio.click();

                        const checkStatus = setInterval(() => {
                            if (statusIndicator.textContent === '再生可能' && !audio.disabled) {
                                clearInterval(checkStatus);
                                resolve();
                            }
                        }, 1000);

                        // Timeout after 30 seconds
                        setTimeout(() => {
                            clearInterval(checkStatus);
                            resolve();
                        }, 30000);
                    });
                }

                // After speaker A's audio completes, add speaker B's response
                addMessage(data.speaker_b, 'ai-message-b');
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
});
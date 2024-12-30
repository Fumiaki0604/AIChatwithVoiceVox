class TtsQuestV3Voicevox extends Audio {
    constructor(speakerId, text, ttsQuestApiKey) {
        super();
        var params = {};
        params['key'] = ttsQuestApiKey;
        params['speaker'] = speakerId;
        params['text'] = text;
        const query = new URLSearchParams(params);
        this.#main(this, query);

        // Add error handling
        this.onerror = () => {
            console.error('Audio playback error occurred');
            this.dispatchEvent(new CustomEvent('tts-error'));
        };
    }

    #main(owner, query) {
        if (owner.src.length > 0) return;
        var apiUrl = 'https://api.tts.quest/v3/voicevox/synthesis';
        owner.dispatchEvent(new CustomEvent('tts-loading'));

        fetch(apiUrl + '?' + query.toString())
            .then(response => response.json())
            .then(response => {
                if (typeof response.retryAfter !== 'undefined') {
                    setTimeout(owner.#main, 1000 * (1 + response.retryAfter), owner, query);
                }
                else if (typeof response.mp3StreamingUrl !== 'undefined') {
                    owner.src = response.mp3StreamingUrl;
                    owner.dispatchEvent(new CustomEvent('tts-ready'));
                }
                else if (typeof response.errorMessage !== 'undefined') {
                    throw new Error(response.errorMessage);
                }
                else {
                    throw new Error("serverError");
                }
            })
            .catch(error => {
                console.error('TTS API Error:', error);
                owner.dispatchEvent(new CustomEvent('tts-error', { detail: error.message }));
            });
    }
}

document.addEventListener('DOMContentLoaded', async function() {
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

    function createAudioControl(text, speakerId) {
        const audioControl = document.createElement('div');
        audioControl.classList.add('audio-control');

        const playButton = document.createElement('button');
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        playButton.disabled = !TTS_QUEST_API_KEY;

        const statusIndicator = document.createElement('span');
        statusIndicator.classList.add('status-indicator');

        let audio = null;
        let isPlaying = false;

        playButton.addEventListener('click', () => {
            if (isPlaying) {
                audio.pause();
                audio.currentTime = 0;
                isPlaying = false;
                playButton.innerHTML = '<i class="fas fa-play"></i>';
                return;
            }

            if (!audio) {
                audio = new TtsQuestV3Voicevox(speakerId, text, TTS_QUEST_API_KEY);

                audio.addEventListener('tts-loading', () => {
                    statusIndicator.textContent = '音声生成中...';
                    playButton.disabled = true;
                });

                audio.addEventListener('tts-ready', () => {
                    statusIndicator.textContent = '';
                    playButton.disabled = false;
                });

                audio.addEventListener('tts-error', (event) => {
                    statusIndicator.textContent = 'エラーが発生しました';
                    playButton.disabled = true;
                    console.error('TTS Error:', event.detail);
                });

                audio.addEventListener('play', () => {
                    isPlaying = true;
                    playButton.innerHTML = '<i class="fas fa-stop"></i>';
                });

                audio.addEventListener('ended', () => {
                    isPlaying = false;
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                });
            }

            audio.play();
        });

        audioControl.appendChild(playButton);
        audioControl.appendChild(statusIndicator);
        return audioControl;
    }

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
                // Add AI responses
                addMessage(data.speaker_a, 'ai-message-a');
                addMessage(data.speaker_b, 'ai-message-b');
            } else {
                addMessage('エラーが発生しました: ' + data.error, 'error');
            }
        } catch (error) {
            addMessage('通信エラーが発生しました', 'error');
        }
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
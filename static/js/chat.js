class TtsQuestV3Voicevox extends Audio {
    constructor(speakerId, text, ttsQuestApiKey) {
        super();
        console.log("Creating TTS request for speaker:", speakerId);
        console.log("Text to synthesize:", text);
        var params = {
            key: ttsQuestApiKey,
            speaker: speakerId,
            text: text
        };
        const query = new URLSearchParams(params);
        this.#main(this, query);
    }

    #main(owner, query) {
        if (owner.src.length > 0) return;
        var apiUrl = 'https://api.tts.quest/v3/voicevox/synthesis';
        console.log("Fetching audio from TTS Quest API...");
        console.log("API URL with params:", apiUrl + '?' + query.toString());

        fetch(apiUrl + '?' + query.toString())
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                console.log("Raw API Response:", response);
                return response.json();
            })
            .then(response => {
                console.log("TTS API Response:", response);
                if (typeof response.retryAfter !== 'undefined') {
                    console.log("Retry after:", response.retryAfter);
                    setTimeout(owner.#main, 1000 * (1 + response.retryAfter), owner, query);
                }
                else if (typeof response.mp3StreamingUrl !== 'undefined') {
                    console.log("Got MP3 URL:", response.mp3StreamingUrl);
                    owner.src = response.mp3StreamingUrl;
                    owner.play().catch(error => {
                        console.error("Error playing audio:", error);
                    });
                }
                else if (typeof response.errorMessage !== 'undefined') {
                    console.error("TTS API Error:", response.errorMessage);
                    throw new Error(response.errorMessage);
                }
                else {
                    console.error("Unknown server response:", response);
                    throw new Error("serverError");
                }
            })
            .catch(error => {
                console.error("TTS API Request failed:", error);
                throw error;
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
            console.log("TTS API key loaded successfully");
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
            const audioControl = document.createElement('div');
            audioControl.classList.add('audio-control');

            const playButton = document.createElement('button');
            playButton.innerHTML = '<i class="fas fa-play"></i>';

            const speakerId = type === 'ai-message-a' ?
                speakerASelect.value : speakerBSelect.value;

            let isPlaying = false;
            let audio = null;

            playButton.addEventListener('click', () => {
                if (isPlaying && audio) {
                    audio.pause();
                    audio = null;
                    playButton.innerHTML = '<i class="fas fa-play"></i>';
                    isPlaying = false;
                } else {
                    playButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    try {
                        audio = new TtsQuestV3Voicevox(speakerId, text, TTS_QUEST_API_KEY);

                        audio.addEventListener('playing', () => {
                            console.log("Audio started playing");
                            playButton.innerHTML = '<i class="fas fa-pause"></i>';
                            isPlaying = true;
                        });

                        audio.addEventListener('ended', () => {
                            console.log("Audio playback ended");
                            playButton.innerHTML = '<i class="fas fa-play"></i>';
                            isPlaying = false;
                            audio = null;
                        });

                        audio.addEventListener('error', (e) => {
                            console.error('Audio playback error:', e);
                            playButton.innerHTML = '<i class="fas fa-play"></i>';
                            isPlaying = false;
                            audio = null;
                        });

                    } catch (error) {
                        console.error("Error creating audio instance:", error);
                        playButton.innerHTML = '<i class="fas fa-play"></i>';
                    }
                    audio.play().catch(error => {
                        console.error("Error playing audio:", error);
                        playButton.innerHTML = '<i class="fas fa-play"></i>';
                        isPlaying = false;
                        audio = null;
                    });
                }
            });

            audioControl.appendChild(playButton);
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
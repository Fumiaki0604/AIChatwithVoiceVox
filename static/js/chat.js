class TtsQuestV3Voicevox extends Audio {
    constructor(speakerId, text, ttsQuestApiKey) {
        super();
        var params = {};
        params['key'] = ttsQuestApiKey;
        params['speaker'] = speakerId;
        params['text'] = text;
        const query = new URLSearchParams(params);
        this.#main(this, query);
    }

    #main(owner, query) {
        if (owner.src.length>0) return;
        var apiUrl = 'https://api.tts.quest/v3/voicevox/synthesis';
        fetch(apiUrl + '?' + query.toString())
            .then(response => response.json())
            .then(response => {
                if (typeof response.retryAfter !== 'undefined') {
                    setTimeout(owner.#main, 1000*(1+response.retryAfter), owner, query);
                }
                else if (typeof response.mp3StreamingUrl !== 'undefined') {
                    owner.src = response.mp3StreamingUrl;
                }
                else if (typeof response.errorMessage !== 'undefined') {
                    throw new Error(response.errorMessage);
                }
                else {
                    throw new Error("serverError");
                }
            });
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

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

    const SPEAKER_A_ID = '1'; // ずんだもん
    const SPEAKER_B_ID = '2'; // 四国めたん

    function addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(`${type}-message`);

        const textDiv = document.createElement('div');
        textDiv.textContent = text;
        messageDiv.appendChild(textDiv);

        if (type !== 'user' && TTS_QUEST_API_KEY) {
            const audioControl = document.createElement('div');
            audioControl.classList.add('audio-control');

            const playButton = document.createElement('button');
            playButton.classList.add('btn', 'btn-sm', 'btn-outline-primary');
            playButton.innerHTML = '<i class="fas fa-play"></i>';

            const speakerId = type === 'ai-message-a' ? SPEAKER_A_ID : SPEAKER_B_ID;

            playButton.addEventListener('click', () => {
                const audio = new TtsQuestV3Voicevox(speakerId, text, TTS_QUEST_API_KEY);
                audio.play();
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
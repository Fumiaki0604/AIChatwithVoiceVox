document.addEventListener('DOMContentLoaded', async function() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    // Set default speaker IDs
    const SPEAKER_A_ID = 1; // ずんだもん（あまあま）
    const SPEAKER_B_ID = 2; // 四国めたん（ノーマル）

    // Fetch TTS Quest API Key from server
    let TTS_QUEST_API_KEY = '';
    try {
        const response = await fetch('/get-tts-key');
        const data = await response.json();
        if (data.error) {
            console.error('Failed to get TTS API key:', data.error);
        } else {
            TTS_QUEST_API_KEY = data.key;
            console.log('TTS API key loaded successfully');
        }
    } catch (error) {
        console.error('Error fetching TTS API key:', error);
    }

    function getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    }

    function playAudio(text, speakerId) {
        if (!text) return;
        console.log('Playing audio with speaker:', speakerId);
        var audio = new TtsQuestV3Voicevox(speakerId, text, '');  // API keyはoptional
        audio.play();
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

        if (type !== 'user') {
            const audioControl = document.createElement('div');
            audioControl.classList.add('audio-control');

            const playButton = document.createElement('button');
            playButton.innerHTML = '<i class="fas fa-play"></i>';
            playButton.classList.add('btn', 'btn-sm', 'btn-outline-primary');

            const speakerId = type === 'ai-message-a' ? SPEAKER_A_ID : SPEAKER_B_ID;

            playButton.addEventListener('click', () => {
                console.log('Play button clicked for:', type);
                playAudio(text, speakerId);
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
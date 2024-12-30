document.addEventListener('DOMContentLoaded', async function() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    // Speaker selects
    const speakerASelect = document.getElementById('speaker-a');
    const speakerBSelect = document.getElementById('speaker-b');
    const styleASelect = document.getElementById('style-a');
    const styleBSelect = document.getElementById('style-b');

    // Store speakers and styles data
    let speakersData = null;
    let currentStyles = {
        a: [],
        b: []
    };

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

    // Load speakers
    try {
        const response = await fetch('/get-speakers');
        speakersData = await response.json();

        // Populate speaker selects
        const populateSpeakers = (select) => {
            speakersData.speakers.forEach(speaker => {
                const option = document.createElement('option');
                option.value = speaker.uuid;
                option.textContent = speaker.name;
                select.appendChild(option);
            });
        };

        populateSpeakers(speakerASelect);
        populateSpeakers(speakerBSelect);

        // Set default speakers
        speakerASelect.value = speakersData.speakers.find(s => s.name === 'ずんだもん')?.uuid || speakerASelect.value;
        speakerBSelect.value = speakersData.speakers.find(s => s.name === '四国めたん')?.uuid || speakerBSelect.value;

        updateStyles('a');
        updateStyles('b');
    } catch (error) {
        console.error('Error loading speakers:', error);
    }

    function updateStyles(speaker) {
        const speakerSelect = speaker === 'a' ? speakerASelect : speakerBSelect;
        const styleSelect = speaker === 'a' ? styleASelect : styleBSelect;
        const speakerId = speakerSelect.value;

        // Clear current options
        styleSelect.innerHTML = '';

        // Get styles for selected speaker
        const styles = speakersData.styles[speakerId] || [];
        currentStyles[speaker] = styles;

        // Add new options
        styles.forEach(style => {
            const option = document.createElement('option');
            option.value = style.id;
            option.textContent = style.name;
            styleSelect.appendChild(option);
        });

        // Select first style
        if (styles.length > 0) {
            styleSelect.value = styles[0].id;
        }
    }

    // Add event listeners for speaker selection
    speakerASelect.addEventListener('change', () => updateStyles('a'));
    speakerBSelect.addEventListener('change', () => updateStyles('b'));

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
                styleASelect.value : styleBSelect.value;

            playButton.addEventListener('click', () => {
                console.log('Playing audio with speaker ID:', speakerId);
                const audio = new TtsQuestV3Voicevox(speakerId, text, TTS_QUEST_API_KEY);
                audio.play().catch(error => {
                    console.error('Audio playback error:', error);
                });
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
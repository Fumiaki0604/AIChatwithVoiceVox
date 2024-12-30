class TtsQuestV3Voicevox extends Audio {
  constructor(speakerId, text, ttsQuestApiKey) {
    super();
    var params = {};
    params['key'] = ttsQuestApiKey;
    params['speaker'] = speakerId;
    params['text'] = text;
    const query = new URLSearchParams(params);
    this.#main(this, query);

    // Add error event listener
    this.addEventListener('error', (e) => {
        console.error('Audio Error:', e);
        console.error('Audio Error Details:', this.error);
    });
  }

  #main(owner, query) {
    if (owner.src.length > 0) return;
    var apiUrl = 'https://api.tts.quest/v3/voicevox/synthesis';
    console.log('Requesting TTS with params:', {
        speaker: query.get('speaker'),
        text: query.get('text'),
        hasKey: !!query.get('key')
    });

    fetch(apiUrl + '?' + query.toString())
    .then(response => {
        console.log('TTS API Response status:', response.status);
        return response.json();
    })
    .then(response => {
      console.log('TTS API Response:', response);
      if (typeof response.retryAfter !== 'undefined') {
        console.log('TTS retry after:', response.retryAfter);
        setTimeout(owner.#main, 1000*(1+response.retryAfter), owner, query);
      }
      else if (typeof response.mp3StreamingUrl !== 'undefined') {
        console.log('TTS URL received:', response.mp3StreamingUrl);
        owner.src = response.mp3StreamingUrl;
      }
      else if (typeof response.errorMessage !== 'undefined') {
        console.error('TTS Error:', response.errorMessage);
        throw new Error(response.errorMessage);
      }
      else {
        console.error('Unknown TTS Error:', response);
        throw new Error("serverError");
      }
    })
    .catch(error => {
        console.error('TTS Fetch Error:', error);
    });
  }
}
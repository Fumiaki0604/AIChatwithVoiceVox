class TtsQuestV3Voicevox extends Audio {
  constructor(speakerId, text, ttsQuestApiKey) {
    super();
    console.log('TtsQuestV3Voicevox constructor:', { speakerId, text, hasKey: !!ttsQuestApiKey });
    var params = {};
    params['key'] = ttsQuestApiKey;
    params['speaker'] = speakerId;
    params['text'] = text;
    const query = new URLSearchParams(params);
    this.#main(this, query);
  }

  #main(owner, query) {
    if (owner.src.length > 0) return;
    var apiUrl = 'https://api.tts.quest/v3/voicevox/synthesis';
    console.log('Making API request to:', apiUrl + '?' + query.toString());

    fetch(apiUrl + '?' + query.toString())
    .then(response => {
      console.log('API response status:', response.status);
      return response.json();
    })
    .then(response => {
      console.log('API response data:', response);
      if (typeof response.retryAfter !== 'undefined') {
        console.log('Need to retry after:', response.retryAfter);
        setTimeout(owner.#main, 1000*(1+response.retryAfter), owner, query);
      }
      else if (typeof response.mp3StreamingUrl !== 'undefined') {
        console.log('Got MP3 URL:', response.mp3StreamingUrl);
        owner.src = response.mp3StreamingUrl;
      }
      else if (typeof response.errorMessage !== 'undefined') {
        console.error('API error:', response.errorMessage);
        throw new Error(response.errorMessage);
      }
      else {
        console.error('Unexpected response:', response);
        throw new Error("serverError");
      }
    })
    .catch(error => {
      console.error('API request failed:', error);
      throw error;
    });
  }
}
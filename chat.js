if (type === 'user') {
        const userIcon = document.createElement('img');
        userIcon.src = 'static/assets/kkrn_icon_user_4.png';
        userIcon.alt = 'User';
        userIcon.classList.add('user-icon');
        iconDiv.appendChild(userIcon);
    } else {

}

function syncLip(spectrums,voicevox_id) {
    let totalSpec = 0
    const vocalRangeSpectrums = spectrums.slice(0, spectrums.length / 2) // 音声の主要周波数帯を取得 
    const totalSpectrum = vocalRangeSpectrums.reduce(function(a, x) { return a + x }) // 周波数帯内の全スペクトラムの合計を算出
    var spec = prevSpec - totalSpectrum ;
    console.log("spec"+spec);

    if(voicevox_id == 6){ // 四国めたん
      if (totalSpectrum > prevSpec) {
        mouseElement.style.backgroundImage = "url('static/assets/metan_mouse_open.png')";
      } else if (prevSpec - totalSpectrum < 250) {
        mouseElement.style.backgroundImage = "url('static/assets/metan_mouse_open_middle.png')";
      } else if (prevSpec - totalSpectrum < 500) {
        mouseElement.style.backgroundImage = "url('static/assets/metan_mouse_close_middle.png')";
      } else {
        mouseElement.style.backgroundImage = "url('static/assets/metan_mouse_close.png')";
      }
    }

    prevSpec = totalSpectrum
  }
if (type === 'user') {
        const userIcon = document.createElement('img');
        userIcon.src = '/static/assets/kkrn_icon_user_4.png';
        userIcon.alt = 'User';
        userIcon.classList.add('user-icon');
        iconDiv.appendChild(userIcon);
    } else {

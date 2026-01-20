/**
 * Sound Effects Panel - JavaScript
 * Handles manual triggering of campaign announcement sounds
 */

// Sound file paths
const SOUND_FILES = {
    first: '/sounds/ilkduyuru.mp3',      // Kampanya öncesi ilk duyuru
    last: '/sounds/ikinciduyuru.mp3',    // Kampanya öncesi son duyuru
    after: '/sounds/sonduyuru.mp3'       // Kampanya sonrası duyuru
};

// Audio elements for each sound
const audioPlayers = {};

/**
 * Initialize audio players
 */
function initAudioPlayers() {
    Object.keys(SOUND_FILES).forEach(key => {
        audioPlayers[key] = new Audio(SOUND_FILES[key]);

        // Add event listeners
        audioPlayers[key].addEventListener('ended', () => {
            handleSoundEnded(key);
        });

        audioPlayers[key].addEventListener('error', (e) => {
            handleSoundError(key, e);
        });
    });
}

/**
 * Play sound
 */
function playSound(soundType) {
    const audio = audioPlayers[soundType];
    const button = document.querySelector(`[data-sound="${soundType}"]`);
    const status = document.getElementById(`status-${soundType}`);

    if (!audio) {
        console.error(`Audio player not found for: ${soundType}`);
        return;
    }

    // If already playing, stop it
    if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
        button.classList.remove('playing');
        status.textContent = '';
        status.classList.remove('active');
        return;
    }

    // Stop all other sounds
    stopAllSounds();

    // Update UI
    button.classList.add('playing');
    status.textContent = '🔊 Çalıyor...';
    status.classList.add('active');

    // Play the sound
    audio.currentTime = 0;
    audio.play().catch(error => {
        console.error('Error playing sound:', error);
        status.textContent = '⚠️ Ses dosyası bulunamadı';
        status.classList.remove('active');
        button.classList.remove('playing');
    });

    console.log(`Playing sound: ${soundType}`);
}

/**
 * Stop all sounds
 */
function stopAllSounds() {
    Object.keys(audioPlayers).forEach(key => {
        const audio = audioPlayers[key];
        const button = document.querySelector(`[data-sound="${key}"]`);
        const status = document.getElementById(`status-${key}`);

        if (!audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }

        button.classList.remove('playing');
        status.textContent = '';
        status.classList.remove('active');
    });
}

/**
 * Handle sound ended
 */
function handleSoundEnded(soundType) {
    const button = document.querySelector(`[data-sound="${soundType}"]`);
    const status = document.getElementById(`status-${soundType}`);

    button.classList.remove('playing');
    status.textContent = '✓ Tamamlandı';
    status.classList.remove('active');

    // Clear status after 3 seconds
    setTimeout(() => {
        status.textContent = '';
    }, 3000);

    console.log(`Sound ended: ${soundType}`);
}

/**
 * Handle sound error
 */
function handleSoundError(soundType, error) {
    const button = document.querySelector(`[data-sound="${soundType}"]`);
    const status = document.getElementById(`status-${soundType}`);

    button.classList.remove('playing');
    status.textContent = '⚠️ Ses dosyası yüklenemedi';
    status.classList.remove('active');

    console.error(`Sound error for ${soundType}:`, error);
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Add click event to all play buttons
    document.querySelectorAll('.play-button').forEach(button => {
        button.addEventListener('click', () => {
            const soundType = button.getAttribute('data-sound');
            playSound(soundType);
        });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Prevent if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (e.key) {
            case '1':
                playSound('first');
                break;
            case '2':
                playSound('last');
                break;
            case '3':
                playSound('after');
                break;
            case ' ':
            case 'Escape':
                e.preventDefault();
                stopAllSounds();
                break;
        }
    });
}

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Sound Effects Panel initialized');
    initAudioPlayers();
    initEventListeners();

    // Show keyboard shortcuts info in console
    console.log(`
🎹 Klavye Kısayolları:
  1 - Kampanya Öncesi İlk Duyuru
  2 - Kampanya Öncesi Son Duyuru
  3 - Kampanya Sonrası Duyuru
  Space/Esc - Tüm sesleri durdur
    `);
});

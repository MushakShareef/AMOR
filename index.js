// Enhanced radio player JavaScript with auto-reconnect functionality
let radioPlayer;
let isPlaying = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
let reconnectTimeout;
let keepAwakeInterval;

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    radioPlayer = document.getElementById('radioPlayer');
    setupRadioEventListeners();
    setupKeepAwake();
});

function setupRadioEventListeners() {
    // When audio starts playing
    radioPlayer.addEventListener('play', function() {
        isPlaying = true;
        updateUI('playing');
        reconnectAttempts = 0;
        console.log('Radio started playing');
    });

    // When audio is paused
    radioPlayer.addEventListener('pause', function() {
        isPlaying = false;
        updateUI('paused');
        console.log('Radio paused');
    });

    // When audio is loading
    radioPlayer.addEventListener('loadstart', function() {
        updateUI('loading');
        console.log('Loading radio stream...');
    });

    // When enough data is loaded to start playing
    radioPlayer.addEventListener('canplay', function() {
        if (isPlaying) {
            updateUI('playing');
        }
        console.log('Radio ready to play');
    });

    // When audio is waiting for more data
    radioPlayer.addEventListener('waiting', function() {
        updateUI('buffering');
        console.log('Radio buffering...');
    });

    // When audio encounters an error
    radioPlayer.addEventListener('error', function(e) {
        console.error('Radio error:', e);
        handleRadioError();
    });

    // When audio stops unexpectedly (stream ends)
    radioPlayer.addEventListener('ended', function() {
        console.log('Radio stream ended - attempting reconnect');
        if (isPlaying) {
            attemptReconnect();
        }
    });

    // When audio is interrupted (mobile specific)
    radioPlayer.addEventListener('stalled', function() {
        console.log('Radio stalled - checking connection');
        if (isPlaying) {
            setTimeout(() => {
                if (radioPlayer.paused && isPlaying) {
                    attemptReconnect();
                }
            }, 3000);
        }
    });

    // Network state changes
    radioPlayer.addEventListener('suspend', function() {
        console.log('Radio suspended by browser');
    });
}

function toggleRadio() {
    if (isPlaying) {
        stopRadio();
    } else {
        playRadio();
    }
}

function playRadio() {
    try {
        updateUI('loading');
        
        // Reset the audio source to ensure fresh connection
        radioPlayer.load();
        
        const playPromise = radioPlayer.play();
        
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    isPlaying = true;
                    updateUI('playing');
                    startKeepAwake();
                })
                .catch((error) => {
                    console.error('Play failed:', error);
                    handleRadioError();
                });
        }
    } catch (error) {
        console.error('Error playing radio:', error);
        handleRadioError();
    }
}

function stopRadio() {
    try {
        radioPlayer.pause();
        radioPlayer.currentTime = 0;
        isPlaying = false;
        updateUI('stopped');
        stopKeepAwake();
        clearTimeout(reconnectTimeout);
        reconnectAttempts = 0;
    } catch (error) {
        console.error('Error stopping radio:', error);
    }
}

function attemptReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
        console.log('Max reconnect attempts reached');
        updateUI('error');
        isPlaying = false;
        return;
    }

    reconnectAttempts++;
    updateUI('reconnecting');
    
    console.log(`Reconnecting... Attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
    
    // Wait before reconnecting (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 10000);
    
    reconnectTimeout = setTimeout(() => {
        try {
            radioPlayer.load(); // Reload the stream
            const playPromise = radioPlayer.play();
            
            if (playPromise !== undefined) {
                playPromise.catch((error) => {
                    console.error(`Reconnect attempt ${reconnectAttempts} failed:`, error);
                    if (reconnectAttempts < maxReconnectAttempts) {
                        attemptReconnect();
                    } else {
                        handleRadioError();
                    }
                });
            }
        } catch (error) {
            console.error('Reconnect error:', error);
            if (reconnectAttempts < maxReconnectAttempts) {
                attemptReconnect();
            } else {
                handleRadioError();
            }
        }
    }, delay);
}

function handleRadioError() {
    isPlaying = false;
    updateUI('error');
    stopKeepAwake();
    
    // Show user-friendly error message
    setTimeout(() => {
        updateUI('stopped');
    }, 3000);
}

function updateUI(state) {
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const statusText = document.getElementById('statusText');
    const radioStatus = document.getElementById('radioStatus');
    const loadingText = document.getElementById('loadingText');

    // Reset all states
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    statusText.style.display = 'block';
    radioStatus.style.display = 'block';
    loadingText.style.display = 'none';

    switch (state) {
        case 'playing':
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            radioStatus.textContent = 'Now Playing - Live Stream';
            radioStatus.style.color = '#00ff00';
            break;
            
        case 'loading':
        case 'buffering':
            loadingText.style.display = 'block';
            radioStatus.style.display = 'none';
            loadingText.textContent = state === 'loading' ? 'Connecting...' : 'Buffering...';
            break;
            
        case 'reconnecting':
            loadingText.style.display = 'block';
            radioStatus.style.display = 'none';
            loadingText.textContent = `Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`;
            break;
            
        case 'paused':
        case 'stopped':
            radioStatus.textContent = 'Ready to play';
            radioStatus.style.color = '#666';
            break;
            
        case 'error':
            radioStatus.textContent = 'Connection error. Please try again.';
            radioStatus.style.color = '#ff0000';
            break;
    }
}

// Keep device awake functionality
function setupKeepAwake() {
    // Visual indicator for keep awake
    const indicator = document.querySelector('.keep-awake-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

function startKeepAwake() {
    const indicator = document.querySelector('.keep-awake-indicator');
    if (indicator) {
        indicator.style.display = 'block';
    }

    // Prevent screen sleep by requesting wake lock (if supported)
    if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').then((wakeLock) => {
            console.log('Screen wake lock activated');
            
            wakeLock.addEventListener('release', () => {
                console.log('Screen wake lock released');
            });
        }).catch((err) => {
            console.log('Wake lock failed:', err);
        });
    }

    // Fallback: keep alive with periodic no-op operations
    keepAwakeInterval = setInterval(() => {
        if (isPlaying && !radioPlayer.paused) {
            // Small operation to keep browser active
            document.title = document.title;
        }
    }, 30000); // Every 30 seconds
}

function stopKeepAwake() {
    const indicator = document.querySelector('.keep-awake-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }

    if (keepAwakeInterval) {
        clearInterval(keepAwakeInterval);
        keepAwakeInterval = null;
    }
}

// Network status monitoring
window.addEventListener('online', function() {
    console.log('Network back online');
    if (isPlaying && radioPlayer.paused) {
        setTimeout(() => attemptReconnect(), 1000);
    }
});

window.addEventListener('offline', function() {
    console.log('Network went offline');
    updateUI('error');
});

// Page visibility API to handle tab switching
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('Tab hidden');
    } else {
        console.log('Tab visible');
        // Check if radio should be playing but isn't
        if (isPlaying && radioPlayer.paused) {
            setTimeout(() => {
                if (isPlaying && radioPlayer.paused) {
                    attemptReconnect();
                }
            }, 500);
        }
    }
});

// Additional functions for your existing navigation
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page, .detail-page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(pageId).classList.add('active');
    
    // Update navigation buttons
    document.querySelectorAll('.nav-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to corresponding nav button
    if (pageId === 'mainPage') {
        document.querySelector('.nav-button[onclick="showPage(\'mainPage\')"]').classList.add('active');
    } else if (pageId === 'schedulePage') {
        document.querySelector('.nav-button[onclick="showPage(\'schedulePage\')"]').classList.add('active');
    } else if (pageId === 'morePage') {
        document.querySelector('.nav-button[onclick="showPage(\'morePage\')"]').classList.add('active');
    }
}

function showDetail(detailType) {
    const pages = {
        'about': 'aboutPage',
        'contact': 'contactPage', 
        'review': 'reviewPage'
    };
    
    if (pages[detailType]) {
        showPage(pages[detailType]);
    }
}

function shareApp() {
    if (navigator.share) {
        navigator.share({
            title: 'Brahma Kumari\'s Tamil Radio - Amudhamazhai',
            text: 'Listen to spiritual content 24/7',
            url: window.location.href
        }).catch(console.error);
    } else {
        // Fallback for browsers that don't support Web Share API
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        }).catch(() => {
            alert(`Share this link: ${url}`);
        });
    }
}

// Add this function to your existing index.js file
// REPLACE the initializeWaveAnimation function in your index.js with this:

function initializeWaveAnimation() {
    const statusText = document.getElementById('statusText');
    if (!statusText) return;
    
    const text = statusText.textContent || 'இது ஆனந்தத்தின் அலை';
    
    // Character-by-character wave (recommended for Tamil text)
    function createCharacterWave() {
        statusText.innerHTML = '';
        statusText.classList.add('wave-text');
        
        // Split text into characters and wrap each in a span
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const span = document.createElement('span');
            span.textContent = char === ' ' ? '\u00A0' : char; // Non-breaking space
            span.classList.add('wave-char');
            statusText.appendChild(span);
        }
        
        console.log('Wave animation initialized with', text.length, 'characters');
    }
    
    // Initialize the wave animation
    createCharacterWave();
}

// REPLACE the DOMContentLoaded event listener with this:
document.addEventListener('DOMContentLoaded', function() {
    radioPlayer = document.getElementById('radioPlayer');
    setupRadioEventListeners();
    setupKeepAwake();
    
    // Add wave animation - delay it slightly to ensure DOM is ready
    setTimeout(() => {
        initializeWaveAnimation();
    }, 100);
});

// MODIFY the updateUI function to handle wave animation
function updateUI(state) {
    const playIcon = document.getElementById('playIcon');
    const pauseIcon = document.getElementById('pauseIcon');
    const statusText = document.getElementById('statusText');
    const radioStatus = document.getElementById('radioStatus');
    const loadingText = document.getElementById('loadingText');

    // Reset all states
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    statusText.style.display = 'block';
    radioStatus.style.display = 'block';
    loadingText.style.display = 'none';

    // Remove old classes but keep wave-text and wave-char
    statusText.classList.remove('playing');

    switch (state) {
        case 'playing':
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            radioStatus.textContent = 'Now Playing - Live Stream';
            radioStatus.style.color = '#00ff00';
            
            // Show the wave animation when playing
            statusText.classList.add('playing');
            statusText.style.display = 'block';
            break;
            
        case 'loading':
        case 'buffering':
            loadingText.style.display = 'block';
            radioStatus.style.display = 'none';
            statusText.style.display = 'none'; // Hide wave during loading
            loadingText.textContent = state === 'loading' ? 'Connecting...' : 'Buffering...';
            break;
            
        case 'reconnecting':
            loadingText.style.display = 'block';
            radioStatus.style.display = 'none';
            statusText.style.display = 'none'; // Hide wave during reconnecting
            loadingText.textContent = `Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`;
            break;
            
        case 'paused':
        case 'stopped':
            radioStatus.textContent = 'Ready to play';
            radioStatus.style.color = '#666';
            statusText.style.display = 'none'; // Hide wave when stopped
            break;
            
        case 'error':
            radioStatus.textContent = 'Connection error. Please try again.';
            radioStatus.style.color = '#ff0000';
            statusText.style.display = 'none'; // Hide wave during error
            break;
    }
}

// Test function - you can call this in browser console to test different animations
function testWaveAnimation(style = 'character') {
    const statusText = document.getElementById('statusText');
    const originalText = 'இது ஆனந்தத்தின் அலை';
    
    // Reset
    statusText.className = 'amudhamazhai playing';
    statusText.innerHTML = originalText;
    statusText.style.display = 'block';
    
    switch(style) {
        case 'character':
            statusText.innerHTML = '';
            statusText.classList.add('wave-text');
            for (let i = 0; i < originalText.length; i++) {
                const char = originalText[i];
                const span = document.createElement('span');
                span.textContent = char === ' ' ? '\u00A0' : char;
                span.classList.add('wave-char');
                statusText.appendChild(span);
            }
            break;
        case 'flow':
            statusText.classList.add('flow-wave');
            break;
        case 'gentle':
            statusText.classList.add('gentle-wave');
            break;
    }
    
    console.log('Testing', style, 'wave animation');
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Your existing code...
    radioPlayer = document.getElementById('radioPlayer');
    setupRadioEventListeners();
    setupKeepAwake();
    
    // Add wave animation
    initializeWaveAnimation();
});

// Function to change wave animation style dynamically
function changeWaveStyle(style) {
    const statusText = document.getElementById('statusText');
    const originalText = 'இது ஆனந்தத்தின் அலை';
    
    // Reset
    statusText.className = 'amudhamazhai';
    statusText.innerHTML = originalText;
    
    switch(style) {
        case 'character':
            // Recreate character wave
            statusText.innerHTML = '';
            statusText.classList.add('wave-text');
            for (let i = 0; i < originalText.length; i++) {
                const char = originalText[i];
                const span = document.createElement('span');
                span.textContent = char === ' ' ? '\u00A0' : char;
                span.classList.add('wave-char');
                statusText.appendChild(span);
            }
            break;
        case 'flow':
            statusText.classList.add('flow-wave');
            break;
        case 'gentle':
            statusText.classList.add('gentle-wave');
            break;
        case 'ocean':
            statusText.classList.add('ocean-wave');
            break;
    }
}

        // Global Variables
        let isPlaying = false;
        let audio = null;
        let wakeLock = null;
        let keepAwakeInterval = null;
        let reconnectAttempts = 0;
        let maxReconnectAttempts = 3;

        // Initialize app
        document.addEventListener('DOMContentLoaded', function() {
            // Delay initialization to avoid conflicts
            setTimeout(initializeApp, 100);
        });

        function initializeApp() {
            try {
                // Initialize audio element
                audio = document.getElementById('radioPlayer');
                
                // Set up audio event listeners
                setupAudioEvents();
                
                // Request wake lock to keep screen awake
                setTimeout(requestWakeLock, 500);
                
                // Handle visibility change to maintain wake lock
                document.addEventListener('visibilitychange', handleVisibilityChange);
                
                // Start keep-awake mechanism
                startKeepAwake();
                
            } catch (error) {
                console.warn('Initialization error:', error);
                // Continue with basic functionality
                setupFallbackKeepAwake();
            }
        }

        // Wake Lock Functions
        async function requestWakeLock() {
            try {
                if ('wakeLock' in navigator && navigator.wakeLock) {
                    // Check if we already have a wake lock
                    if (wakeLock && !wakeLock.released) {
                        return;
                    }
                    
                    wakeLock = await navigator.wakeLock.request('screen');
                    
                    wakeLock.addEventListener('release', () => {
                        console.log('Wake lock released');
                        wakeLock = null;
                    });
                    
                    console.log('Wake lock acquired');
                }
            } catch (err) {
                console.warn('Wake lock not available:', err.message);
                setupFallbackKeepAwake();
            }
        }

        function startKeepAwake() {
            // Multiple keep-awake strategies
            setupFallbackKeepAwake();
            
            // Periodic wake lock refresh
            keepAwakeInterval = setInterval(() => {
                if (!wakeLock || wakeLock.released) {
                    requestWakeLock();
                }
            }, 60000); // Every minute
        }

        function setupFallbackKeepAwake() {
            try {
                // Strategy 1: Invisible video element
                const video = document.createElement('video');
                video.src = 'data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA=';
                video.setAttribute('playsinline', 'true');
                video.setAttribute('webkit-playsinline', 'true');
                video.loop = true;
                video.muted = true;
                video.style.cssText = 'position:fixed;top:-1000px;left:-1000px;width:1px;height:1px;opacity:0.01;pointer-events:none;';
                document.body.appendChild(video);
                
                const playVideo = () => {
                    video.play().catch(() => {
                        // Ignore play errors
                    });
                };
                
                playVideo();
                
                // Strategy 2: Periodic no-op operations
                setInterval(() => {
                    playVideo();
                    // Touch the DOM to keep browser active
                    document.body.style.transform = 'translateZ(0)';
                    setTimeout(() => {
                        document.body.style.transform = '';
                    }, 1);
                }, 30000);
                
            } catch (error) {
                console.warn('Fallback keep-awake setup failed:', error);
            }
        }

        function handleVisibilityChange() {
            try {
                if (document.visibilityState === 'visible') {
                    setTimeout(() => {
                        if (!wakeLock || wakeLock.released) {
                            requestWakeLock();
                        }
                    }, 100);
                }
            } catch (error) {
                console.warn('Visibility change handler error:', error);
            }
        }

        // Audio Functions
        function setupAudioEvents() {
            if (!audio) return;
            
            try {
                audio.addEventListener('loadstart', () => {
                    showLoading(true);
                });

                audio.addEventListener('canplaythrough', () => {
                    showLoading(false);
                    if (!isPlaying) {
                        updateStatus('Ready to play');
                    }
                    reconnectAttempts = 0; // Reset reconnect counter
                });

                audio.addEventListener('playing', () => {
                    showLoading(false);
                    updateStatus('Now playing');
                    const statusText = document.getElementById('statusText');
                    if (statusText) {
                        statusText.classList.add('playing');
                    }
                    reconnectAttempts = 0; // Reset reconnect counter
                });

                audio.addEventListener('pause', () => {
                    updateStatus('Paused');
                    const statusText = document.getElementById('statusText');
                    if (statusText) {
                        statusText.classList.remove('playing');
                    }
                });

                audio.addEventListener('error', (e) => {
                    showLoading(false);
                    console.warn('Audio error:', e);
                    handleAudioError();
                });

                audio.addEventListener('waiting', () => {
                    showLoading(true);
                });

                audio.addEventListener('stalled', () => {
                    console.warn('Audio stalled, attempting to recover...');
                    handleAudioError();
                });

                audio.addEventListener('ended', () => {
                    // Radio stream shouldn't end, try to reconnect
                    if (isPlaying) {
                        handleAudioError();
                    }
                });

            } catch (error) {
                console.warn('Error setting up audio events:', error);
            }
        }

        function handleAudioError() {
            if (reconnectAttempts < maxReconnectAttempts && isPlaying) {
                reconnectAttempts++;
                updateStatus(`Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`);
                
                setTimeout(() => {
                    if (audio && isPlaying) {
                        audio.load();
                        audio.play().catch(error => {
                            console.warn('Reconnection failed:', error);
                            if (reconnectAttempts >= maxReconnectAttempts) {
                                updateStatus('Connection failed');
                                resetPlayer();
                            }
                        });
                    }
                }, 2000);
            } else {
                updateStatus('Connection error');
                resetPlayer();
            }
        }

        function resetPlayer() {
            isPlaying = false;
            const playIcon = document.getElementById('playIcon');
            const pauseIcon = document.getElementById('pauseIcon');
            if (playIcon && pauseIcon) {
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
            }
            const statusText = document.getElementById('statusText');
            if (statusText) {
                statusText.classList.remove('playing');
            }
            reconnectAttempts = 0;
        }

        function toggleRadio() {
            if (!audio) {
                console.error('Audio element not available');
                return;
            }

            const playIcon = document.getElementById('playIcon');
            const pauseIcon = document.getElementById('pauseIcon');
            
            if (!playIcon || !pauseIcon) {
                console.error('Play/pause icons not found');
                return;
            }
            
            if (isPlaying) {
                // Pause
                try {
                    audio.pause();
                    playIcon.style.display = 'block';
                    pauseIcon.style.display = 'none';
                    isPlaying = false;
                    reconnectAttempts = 0;
                } catch (error) {
                    console.warn('Pause failed:', error);
                }
            } else {
                // Play
                try {
                    showLoading(true);
                    audio.src = 'https://omshanti.in/amudhamazhai';
                    audio.load();
                    
                    const playPromise = audio.play();
                    
                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            playIcon.style.display = 'none';
                            pauseIcon.style.display = 'block';
                            isPlaying = true;
                        }).catch(error => {
                            console.warn('Play failed:', error);
                            showLoading(false);
                            updateStatus('Unable to play - Click to retry');
                            resetPlayer();
                        });
                    }
                } catch (error) {
                    console.warn('Toggle radio error:', error);
                    showLoading(false);
                    updateStatus('Error - Click to retry');
                    resetPlayer();
                }
            }
        }

        function showLoading(show) {
            const loadingText = document.getElementById('loadingText');
            if (loadingText) {
                if (show) {
                    loadingText.classList.add('show');
                } else {
                    loadingText.classList.remove('show');
                }
            }
        }

        function updateStatus(message) {
            const radioStatus = document.getElementById('radioStatus');
            if (radioStatus) {
                radioStatus.textContent = message;
            }
        }

        // Navigation Functions
        function showPage(pageId) {
            try {
                // Hide all pages
                const pages = document.querySelectorAll('.page, .detail-page');
                pages.forEach(page => {
                    if (page) {
                        page.classList.remove('active');
                    }
                });
                
                // Show selected page
                const selectedPage = document.getElementById(pageId);
                if (selectedPage) {
                    selectedPage.classList.add('active');
                }
                
                // Update navigation buttons
                const navButtons = document.querySelectorAll('.nav-button');
                navButtons.forEach(btn => {
                    if (btn) {
                        btn.classList.remove('active');
                    }
                });
                
                // Highlight active nav button
                if (pageId === 'mainPage' && navButtons[0]) {
                    navButtons[0].classList.add('active');
                } else if (pageId === 'schedulePage' && navButtons[1]) {
                    navButtons[1].classList.add('active');
                } else if (pageId === 'morePage' && navButtons[2]) {
                    navButtons[2].classList.add('active');
                }
            } catch (error) {
                console.warn('Navigation error:', error);
            }
        }

        function showDetail(page) {
            const pageId = page + 'Page';
            showPage(pageId);
        }

        function shareApp() {
            try {
                if (navigator.share && typeof navigator.share === 'function') {
                    navigator.share({
                        title: 'Brahma Kumari\'s Tamil Radio - Amudhamazhai',
                        text: 'Listen to spiritual Tamil radio programs 24/7',
                        url: 'https://omshanti.in/amudhamazhai'
                    }).catch(error => {
                        console.warn('Share failed:', error);
                        fallbackShare();
                    });
                } else {
                    fallbackShare();
                }
            } catch (error) {
                console.warn('Share error:', error);
                fallbackShare();
            }
        }

        function fallbackShare() {
            const url = 'https://omshanti.in/amudhamazhai';
            const text = 'Check out Brahma Kumari\'s Tamil Radio - Amudhamazhai: ' + url;
            
            try {
                if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    navigator.clipboard.writeText(text).then(() => {
                        alert('Link copied to clipboard!');
                    }).catch(() => {
                        alert('Share this link: ' + url);
                    });
                } else {
                    alert('Share this link: ' + url);
                }
            } catch (error) {
                alert('Share this link: ' + url);
            }
        }

        // Cleanup function
        function cleanup() {
            try {
                if (keepAwakeInterval) {
                    clearInterval(keepAwakeInterval);
                }
                if (wakeLock && !wakeLock.released) {
                    wakeLock.release();
                }
            } catch (error) {
                console.warn('Cleanup error:', error);
            }
        }

        // Handle page unload
        window.addEventListener('beforeunload', cleanup);
        
        // Prevent app from sleeping - simplified version
        setInterval(() => {
            try {
                if (isPlaying && audio && audio.readyState >= 2) {
                    // App is active and playing - keep alive
                    document.body.style.transform = 'translateZ(0)';
                    setTimeout(() => {
                        document.body.style.transform = '';
                    }, 1);
                }
            } catch (error) {
                // Ignore errors in keep-alive
            }
        }, 30000); // Every 30 seconds
    
// ==UserScript==
// @name         Darken visited artists Spotify page
// @namespace    http://tampermonkey.net/
// @version      1.0.6
// @description  Darken visited artists on Spotify
// @author       Steven Gangnant
// @match        https://open.spotify.com/*
// @icon         https://open.spotifycdn.com/cdn/images/favicon16.1c487bff.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const VENDOR = 'SG';

    // Local storage keys
    const LS_KEY_VISITED_ARTISTS = `${VENDOR}_visitedSpotifyArtists`;
    const LS_KEY_IGNORED_PAGES = `${VENDOR}_ignoredPages`;

    // Classnames
    const DIMMED_BASE_CN = `${VENDOR}_visited-artist`;
    const DIMMED_CARD_CN = `${DIMMED_BASE_CN}__card`;
    const DIMMED_PLAYLIST_ROW_CN = `${DIMMED_BASE_CN}__card`;
    const ALL_DIMMED_CNS = [DIMMED_CARD_CN, DIMMED_PLAYLIST_ROW_CN];

    // Settings
    const DOUBLE_TAP_DELAY = 300;
    const DEBOUNCE_RATE = 100;

    // CSS
    const INLINE_CSS = `
        .${DIMMED_CARD_CN}:not(:hover),
        .${DIMMED_PLAYLIST_ROW_CN}:not(:hover){
            transition: opacity 0.2s ease-in-out;
            opacity: 0.2;
        }`;

    // State
    let scriptPaused = false;

    // API
    const api = {
        __LS: {
            getArrayAsSet: key => {
                const visited = JSON.parse(localStorage.getItem(key) || '[]');
                return new Set(visited);
            },
            storeSet: (key, set) => localStorage.setItem(key, JSON.stringify([...set])),
        },
        visitedArtists: {
            get: () => api.__LS.getArrayAsSet(LS_KEY_VISITED_ARTISTS),
            set: (id) => {
                const visited = api.visitedArtists.get();
                visited.add(id);

                try {
                    api.__LS.storeSet(LS_KEY_VISITED_ARTISTS, visited);
                } catch (e) {
                    console.error(VENDOR, 'Failed storing visited artist:', e);
                }
            },
        },
        ignoredPages: {
            get: () => api.__LS.getArrayAsSet(LS_KEY_IGNORED_PAGES),
            isCurrentPageIgnored: () => {
                return api.ignoredPages.get().has(location.pathname);
            },
            toggleCurrentPage: () => {
                const currentPage = location.pathname;
                const ignoredPages = api.ignoredPages.get();

                ignoredPages.has(currentPage)
                    ? ignoredPages.delete(currentPage)
                    : ignoredPages.add(currentPage);

                api.__LS.storeSet(LS_KEY_IGNORED_PAGES, ignoredPages);
            },
        },
    };

    const processArtistsCards = visited => {
        const cards = document.querySelectorAll('[aria-labelledby^="card-title-spotify:artist:"]');

        // Darken artists cards
        cards.forEach(card => {
            const labelledBy = card.getAttribute('aria-labelledby');
            // "Split on :" because of the way attribute is built
            // "Split on -" because there's an ending appendix on the ID with the card's index in the parent element
            const cardArtistId = labelledBy?.split(':')[2].split('-')[0];

            if (visited.has(cardArtistId)) {
                card.classList.add(DIMMED_CARD_CN);
            }
        });
    }

    const processPlaylist = visited => {
        const tracklistRows = document.querySelectorAll('[data-testid="tracklist-row"]');

        tracklistRows.forEach(tracklistRow => {
            const artistsPageLink = tracklistRow.querySelectorAll('a[href*="artist"]');

            const visitedAll = [...artistsPageLink].reduce(
                (acc, artistPageLink) => {
                    const artistId = artistPageLink.getAttribute('href')?.split('/').pop();
                    return acc && visited.has(artistId);
                },
                true
            );

            if (visitedAll) {
                tracklistRow.classList.add(DIMMED_PLAYLIST_ROW_CN);
            }
        });
    }

    const isArtistPage = () => location.pathname.includes('/artist/');
    const isRelatedArtistsPage = () => location.pathname.endsWith('/related');
    const isPlaylistPage = () => location.pathname.includes('/playlist/');

    const processUI = () => {
        if (!scriptPaused && !api.ignoredPages.isCurrentPageIgnored()) {
            const visited = api.visitedArtists.get();

            if (isArtistPage() || isRelatedArtistsPage()) {
                processArtistsCards(visited);
            }

            if (isPlaylistPage()) {
                processPlaylist(visited);
            }
        }
    };

    // Store the artist ID when navigating to an artist page
    const detectArtistPage = () => {
        const pathnameSections = location.pathname.split('/');

        const artistPathIndex = pathnameSections.indexOf('artist');

        if (artistPathIndex !== -1) {
            const artistId = pathnameSections[artistPathIndex + 1];

            if (artistId) {
                api.visitedArtists.set(artistId);
            }
        }
    };

    /**
     * Suspend dimming - remove any dimming class
     */
    function suspendDim() {
        document.querySelectorAll(ALL_DIMMED_CNS.map(classname => `.${classname}`).join(', '))
            .forEach(element => {
                element.classList.remove(...ALL_DIMMED_CNS);
            });
    }

    // Utilities functions
    function debounce(fn, delay = 100) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    }

    function doubleTapObserver(observedKeys, callback) {
        let keyLastTapTime = 0;
        document.addEventListener('keydown', (e) => {
            if (observedKeys.includes(e.key)) {
                const now = Date.now();

                if (now - keyLastTapTime < DOUBLE_TAP_DELAY) {
                    callback();
                }

                keyLastTapTime = now;
            }
        });
    }

    const runScript = debounce(
        () => {
            detectArtistPage();
            processUI();
        },
        DEBOUNCE_RATE
    );

    // Add script global CSS stylesheet
    const scriptSheet = new CSSStyleSheet();
    scriptSheet.replaceSync(INLINE_CSS);
    document.adoptedStyleSheets = [scriptSheet];

    // Watch for page changes
    const observer = new MutationObserver(runScript);
    observer.observe(document.body, { childList: true, subtree: true });

    // Keyboard shortcut observers
    doubleTapObserver(
        'Control',
        () => {
            scriptPaused = !scriptPaused;
            scriptPaused
                ? suspendDim()
                : processUI();
        }
    );

    doubleTapObserver(
        'Shift',
        () => {
            api.ignoredPages.toggleCurrentPage();
            suspendDim();
            processUI();
        }
    );

    // Also run on first load
    runScript();
})();

// ==UserScript==
// @name         Darken visited artists Spotify page
// @namespace    http://tampermonkey.net/
// @version      1.0.4
// @description  Darken visited artists on Spotify
// @author       Steven Gangnant
// @match        https://open.spotify.com/*
// @icon         https://open.spotifycdn.com/cdn/images/favicon16.1c487bff.png
// @grant        none
// ==/UserScript==

// @todo Re order elements

(function () {
    'use strict';

    const VENDOR = 'SG';
    const LS_KEY_SCRIPT = `${VENDOR}_visitedSpotifyArtists`;
    const PAUSED_CLASSNAME = `${VENDOR}_visited-artist`;
    const BASE_CLASSNAME = `${VENDOR}_visited-artist`;
    const CARD_VISITED_CLASSNAME = `${BASE_CLASSNAME}__card`;
    const PLAYLIST_ROW_VISITED_CLASSNAME = `${BASE_CLASSNAME}__card`;
    const INLINE_CSS = `
        .${CARD_VISITED_CLASSNAME}:not(:hover):not(.${PAUSED_CLASSNAME}),
        .${PLAYLIST_ROW_VISITED_CLASSNAME}:not(:hover):not(.${PAUSED_CLASSNAME}) {
            transition: opacity 0.2s ease-in-out;
            opacity: 0.2;
        }
    `;
    const DOUBLE_TAP_DELAY = 300;
    const DEBOUNCE_RATE = 100;

    const visitedArtists = {
        get: () => {
            const visited = JSON.parse(localStorage.getItem(LS_KEY_SCRIPT) || '[]');
            return new Set(visited);
        },
        set: (id) => {
            const visited = visitedArtists.get();
            visited.add(id);
            try {
                localStorage.setItem(LS_KEY_SCRIPT, JSON.stringify([...visited]));
            } catch (e) {
                console.error(VENDOR, 'Failed storing visited artist:', e);
            }
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
                card.classList.add(CARD_VISITED_CLASSNAME);
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
                tracklistRow.classList.add(PLAYLIST_ROW_VISITED_CLASSNAME);
            }
        });
    }

    const isArtistPage = () => location.pathname.includes('/artist/');
    const isRelatedArtistsPage = () => location.pathname.endsWith('/related');
    const isPlaylistPage = () => location.pathname.includes('/playlist/');

    const processUI = () => {
        const visited = visitedArtists.get();

        if (isArtistPage() || isRelatedArtistsPage()) {
            processArtistsCards(visited);
        }

        if (isPlaylistPage()) {
            processPlaylist(visited);
        }
    };

    // Store the artist ID when navigating to an artist page
    const detectArtistPage = () => {
        const pathnameSections = location.pathname.split('/');

        const artistPathIndex = pathnameSections.indexOf('artist');

        if (artistPathIndex !== -1) {
            const artistId = pathnameSections[artistPathIndex + 1];

            if (artistId) {
                visitedArtists.set(artistId);
            }
        }
    };

    function getDimmedElements() {
        const classnames = [
            CARD_VISITED_CLASSNAME,
            PLAYLIST_ROW_VISITED_CLASSNAME,
        ];

        const selector = classnames.map(classname => `.${classname}`).join(', ');

        return document.querySelectorAll(selector);
    }

    function suspendDim() {
        getDimmedElements().forEach(element => {
            element.classList.add(PAUSED_CLASSNAME);
        });
    }

    function resumeDim() {
        getDimmedElements().forEach(element => {
            element.classList.remove(PAUSED_CLASSNAME);
        });
    }

    function debounce(fn, delay = 100) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    }

    const runScript = debounce(
        () => {
            detectArtistPage();
            processUI();
        },
        DEBOUNCE_RATE
    );

    // Create global CSS class for seen artists cards
    const scriptSheet = new CSSStyleSheet();
    scriptSheet.replaceSync(INLINE_CSS);
    document.adoptedStyleSheets = [scriptSheet];

    // Watch for page changes
    const observer = new MutationObserver(runScript);
    observer.observe(document.body, { childList: true, subtree: true });

    // Manage script pause
    let lastTapTime = 0;
    let scriptPaused = false;

    document.addEventListener('keydown', (e) => {
        if (['ControlLeft', 'ControlRight'].includes(e.code)) {
            const now = Date.now();

            if (now - lastTapTime < DOUBLE_TAP_DELAY) {
                scriptPaused = !scriptPaused;
                if (scriptPaused) {
                    suspendDim();
                } else {
                    resumeDim();
                }
            }

            lastTapTime = now;
        }
    });

    // Also run on first load
    runScript();
})();

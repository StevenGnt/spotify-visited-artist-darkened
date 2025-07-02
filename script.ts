// ==UserScript==
// @name         Darken visited artists Spotify page
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  Darken visited artists Spotify page
// @author       Steven Gangnant
// @match        https://open.spotify.com/*
// @icon         https://open.spotifycdn.com/cdn/images/favicon16.1c487bff.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const VENDOR = 'SG';
    const LS_KEY_SCRIPT = `${VENDOR}_visitedSpotifyArtists`;
    const CLASS_NAME = `${VENDOR}_visited-artist`;
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

    const processUI = () => {
        const visited = visitedArtists.get();

        const cards = document.querySelectorAll('[data-testid="grid-container"] > [aria-labelledby^="card-title-spotify:artist:"]');

        cards.forEach(card => {
            const labelledBy = card.getAttribute('aria-labelledby');
            // "Split on :" because of the way attribute is built
            // "Split on -" because there's an ending appendix on the ID with the card's index in the parent element
            const cardArtistId = labelledBy?.split(':')[2].split('-')[0];

            if (visited.has(cardArtistId)) {
                card.classList.add(CLASS_NAME);
            }
        });
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

    function debounce(fn, delay) {
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
    scriptSheet.replaceSync(`
        .${CLASS_NAME} {
            transition: opacity 0.2s ease-in-out;
            opacity: 0.1;
        }
    `);
    document.adoptedStyleSheets = [scriptSheet];

    // Watch for page changes
    const observer = new MutationObserver(runScript);
    observer.observe(document.body, { childList: true, subtree: true });

    // Also run on first load
    runScript();
})();

// ==UserScript==
// @name         Darken visited artists Spotify page
// @namespace    http://tampermonkey.net/
// @version      2025-06-30
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
    const VISITED_OPACITY = '0.3';

    const api = {
        getVisitedArtists: () => JSON.parse(localStorage.getItem(LS_KEY_SCRIPT) || '[]'),
        saveVisitedArtist: (id) => {
            const visited = new Set(api.getVisitedArtists());
            visited.add(id);
            localStorage.setItem(LS_KEY_SCRIPT, JSON.stringify([...visited]));
        },
    };

    const hideVisitedArtists = () => {
        const visited = new Set(api.getVisitedArtists());

        const cards = document.querySelectorAll('[data-testid="grid-container"] > [aria-labelledby^="card-title-spotify:artist:"]');

        cards.forEach(card => {
            const labelledBy = card.getAttribute('aria-labelledby');
            // "Split on :" because of the way attribute is built
            // "Split on -" because there's an ending appendix on the ID with the card's index in the parent element
            const cardArtistId = labelledBy?.split(':')[2].split('-')[0];

            if (visited.has(cardArtistId)) {
                card.style.opacity = VISITED_OPACITY;
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
                api.saveVisitedArtist(artistId);
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

    function runScript() {
        detectArtistPage();
        hideVisitedArtists();
    }

    // Watch for page changes
    const observer = new MutationObserver(debounce(runScript, 200));
    observer.observe(document.body, { childList: true, subtree: true });

    // Also run on first load
    runScript();
})();

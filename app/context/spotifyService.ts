async function getSpotifyAccessToken(): Promise<string | null> {
    try {
        const res = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: "Basic " + btoa(
                    (process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "") + ":" + (process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_SECRET || "")
                ),
            },
            body: "grant_type=client_credentials",
        });
        const data = await res.json();
        return data.access_token || null;
    } catch (err) {
        console.error("Error obteniendo token genérico:", err);
        return null;
    }
}

export async function fetchArtistMetadata(artistName: string) {
    if (!artistName || artistName.trim() === "" || artistName.toLowerCase().includes("unknown")) {
        return null;
    }

    const token = await getSpotifyAccessToken();
    if (!token) return null;

    try {
        const query = encodeURIComponent(artistName.trim());
        const url = "https://api.spotify.com/v1/search?q=" + query + "&type=artist&limit=1";

        const response = await fetch(url, {
            headers: { Authorization: "Bearer " + token },
        });

        if (!response.ok) return null;

        const data = await response.json();
        const artist = data.artists?.items?.[0];

        if (artist) {
            return {
                imageUrl: artist.images?.[0]?.url || null,
                genres: artist.genres || [],
                spotifyUrl: artist.external_urls?.spotify || null,
            };
        }
        return null;
    } catch (err) {
        console.error("Error buscando artista " + artistName + ":", err);
        return null;
    }
}

export async function fetchTrackMetadata(trackName: string, artistName: string) {
    if (!trackName || !artistName || trackName.toLowerCase().includes("unknown")) {
        return null;
    }

    const token = await getSpotifyAccessToken();
    if (!token) return null;

    try {
        const query = encodeURIComponent("track:" + trackName.trim() + " artist:" + artistName.trim());
        const url = "https://api.spotify.com/v1/search?q=" + query + "&type=track&limit=1";

        const response = await fetch(url, {
            headers: { Authorization: "Bearer " + token },
        });

        if (!response.ok) return null;

        const data = await response.json();
        const track = data.tracks?.items?.[0];

        if (track) {
            return {
                coverUrl: track.album?.images?.[0]?.url || null,
                spotifyUrl: track.external_urls?.spotify || null,
            };
        }
        return null;
    } catch (err) {
        console.error("Error buscando canción " + trackName + ":", err);
        return null;
    }
}

async function createSpotifyPlaylist(accessToken: string, name: string, description: string): Promise<string | null> {
    try {
        const userRes = await fetch("https://api.spotify.com/v1/me", {
            headers: { Authorization: "Bearer " + accessToken },
        });
        const userData = await userRes.json();
        if (!userData.id) return null;

        const url = "https://api.spotify.com/v1/users/" + userData.id + "/playlists";

        const playlistRes = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: "Bearer " + accessToken,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: name,
                description: description,
                public: false,
            }),
        });

        const playlistData = await playlistRes.json();
        return playlistData.id || null;
    } catch (err) {
        console.error("Error creando la playlist en Spotify:", err);
        return null;
    }
}

export async function exportTracksToPlaylist(
    accessToken: string,
    tracksList: { track: string; artist: string }[],
    playlistName: string
): Promise<{ success: boolean; playlistUrl?: string }> {
    if (!accessToken || tracksList.length === 0) return { success: false };

    try {
        const trackUris: string[] = [];

        const searchPromises = tracksList.slice(0, 100).map(async (item) => {
            if (!item.track || !item.artist || item.track.toLowerCase().includes("unknown")) return;

            const query = encodeURIComponent("track:" + item.track.trim() + " artist:" + item.artist.trim());
            const url = "https://api.spotify.com/v1/search?q=" + query + "&type=track&limit=1";

            const res = await fetch(url, {
                headers: { Authorization: "Bearer " + accessToken },
            });

            if (res.ok) {
                const data = await res.json();
                const trackUri = data.tracks?.items?.[0]?.uri;
                if (trackUri) trackUris.push(trackUri);
            }
        });

        await Promise.all(searchPromises);

        if (trackUris.length === 0) return { success: false };

        const description = "Creada por TrackBuster Analytics el " + new Date().toLocaleDateString('es-ES');
        const playlistId = await createSpotifyPlaylist(accessToken, playlistName, description);

        if (!playlistId) return { success: false };

        const url = "https://api.spotify.com/v1/tracks/" + playlistId + "/tracks";

        const injectRes = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: "Bearer " + accessToken,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ uris: trackUris }),
        });

        if (injectRes.ok) {
            return {
                success: true,
                playlistUrl: "https://open.spotify.com/playlist/" + playlistId
            };
        }

        return { success: false };
    } catch (err) {
        console.error("Error en el proceso de exportación:", err);
        return { success: false };
    }
}
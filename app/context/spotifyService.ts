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
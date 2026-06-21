import { SpotifyStreamItem } from './HistoryContext';

export interface FilterConfig {
    minPlays: string;
    maxPlays: string;
    startDate: string;
    endDate: string;
    minWords: string;
    maxWords: string;
    includedArtists: string[];
    excludedArtists: string[];
}

export interface FilteredTrack {
    track: string;
    artist: string;
    plays: number;
    totalMs: number;
    firstPlayed: string;
    lastPlayed: string;
}

export function applyTrackBusterFilters(rawHistory: SpotifyStreamItem[], config: FilterConfig): FilteredTrack[] {
    if (!rawHistory || rawHistory.length === 0) return [];

    const trackMap: Record<string, FilteredTrack> = {};

    const isUnknown = (name: string) => {
        const lower = name.toLowerCase().trim();
        return lower === 'unknown track' || lower === 'unknown artist' || lower === 'unknown' || lower === 'desconocido';
    };

    rawHistory.forEach((item) => {
        if (!item.trackName || !item.artistName || !item.endTime) return;
        if (item.msPlayed < 10000) return;

        if (isUnknown(item.trackName) || isUnknown(item.artistName)) return;

        const trackKey = `${item.trackName} ||| ${item.artistName}`;
        const playDateStr = item.endTime.replace(' ', 'T');

        if (!trackMap[trackKey]) {
            trackMap[trackKey] = {
                track: item.trackName,
                artist: item.artistName,
                plays: 0,
                totalMs: 0,
                firstPlayed: playDateStr,
                lastPlayed: playDateStr,
            };
        }

        const current = trackMap[trackKey];
        current.plays++;
        current.totalMs += item.msPlayed;

        if (new Date(playDateStr) < new Date(current.firstPlayed)) {
            current.firstPlayed = playDateStr;
        }
        if (new Date(playDateStr) > new Date(current.lastPlayed)) {
            current.lastPlayed = playDateStr;
        }
    });

    const minPlays = parseInt(config.minPlays) || 0;
    const maxPlays = parseInt(config.maxPlays) || Infinity;
    const minWords = parseInt(config.minWords) || 0;
    const maxWords = parseInt(config.maxWords) || Infinity;

    const startLimit = config.startDate ? new Date(config.startDate) : null;
    const endLimit = config.endDate ? new Date(config.endDate) : null;

    return Object.values(trackMap).filter((track) => {
        if (track.plays < minPlays || track.plays > maxPlays) return false;

        const wordCount = track.track.split(/\s+/).filter(Boolean).length;
        if (wordCount < minWords || wordCount > maxWords) return false;

        if (startLimit && new Date(track.lastPlayed) < startLimit) return false;
        if (endLimit && new Date(track.firstPlayed) > endLimit) return false;

        if (config.includedArtists.length > 0 && !config.includedArtists.includes(track.artist)) return false;
        if (config.excludedArtists.length > 0 && config.excludedArtists.includes(track.artist)) return false;

        return true;
    });
}
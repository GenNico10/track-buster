// app/context/utils.ts
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

export function applyTrackBusterFilters(rawHistory: SpotifyStreamItem[], config: FilterConfig[]): FilteredTrack[] {
    // Aquí dentro meteremos exactamente la lógica limpia que ya te funcionaba,
    // pero desacoplada de la interfaz para poder llamarla desde cualquier página.
    return [];
}
'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

export interface SpotifyStreamItem {
    endTime?: string;
    artistName: string;
    trackName: string;
    msPlayed: number;
}

export interface TopArtistSummary {
    artist: string;
    totalMs: number;
    totalMinutes: number;
    uniqueTracksCount: number;
}

export interface TopTrackSummary {
    track: string;
    artist: string;
    plays: number;
}

export interface MonthlyBarData {
    monthName: string;
    year: number;
    monthIndex: number;
    minutes: number;
}

interface PeriodStats {
    totalMinutes: number;
    totalTracksCount: number;
    topSong: TopTrackSummary | null;
    topArtists: TopArtistSummary[];
    topTracks: TopTrackSummary[];
    monthlyDistribution: MonthlyBarData[];
    timeRange: { start: string; end: string } | null;
}

interface HistoryContextType {
    rawHistory: SpotifyStreamItem[];
    setRawHistory: (history: SpotifyStreamItem[]) => void;
    clearHistory: () => void;
    currentPeriod: 'all' | 'year';
    setCurrentPeriod: (period: 'all' | 'year') => void;
    showPeriodToggle: boolean;
    globalStats: PeriodStats;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export function HistoryProvider({ children }: { children: ReactNode }) {
    const [rawHistory, setRawHistory] = useState<SpotifyStreamItem[]>([]);
    const [currentPeriod, setCurrentPeriod] = useState<'all' | 'year'>('all');

    const clearHistory = () => {
        setRawHistory([]);
        setCurrentPeriod('all');
    };

    const isUnknown = (name: string) => {
        const lower = name.toLowerCase().trim();
        return lower === 'unknown track' || lower === 'unknown artist' || lower === 'unknown';
    };

    const showPeriodToggle = useMemo(() => {
        if (rawHistory.length === 0) return false;

        const currentYear = new Date().getFullYear();
        let hasBeforeCurrentYear = false;
        let hasCurrentYear = false;

        rawHistory.forEach(item => {
            if (!item.endTime) return;
            const playDate = new Date(item.endTime.replace(' ', 'T'));
            if (!isNaN(playDate.getTime())) {
                if (playDate.getFullYear() < currentYear) hasBeforeCurrentYear = true;
                if (playDate.getFullYear() === currentYear) hasCurrentYear = true;
            }
        });

        return hasBeforeCurrentYear && hasCurrentYear;
    }, [rawHistory]);

    const globalStats = useMemo(() => {
        const emptyStats: PeriodStats = { totalMinutes: 0, totalTracksCount: 0, topSong: null, topArtists: [], topTracks: [], monthlyDistribution: [], timeRange: null };
        if (rawHistory.length === 0) return emptyStats;

        const currentYear = new Date().getFullYear();
        const activePeriod = showPeriodToggle ? currentPeriod : 'all';

        let totalMs = 0;
        const artistMsMap: Record<string, number> = {};
        const trackPlaysMap: Record<string, { track: string; artist: string; plays: number }> = {};
        const monthlyAccumulator: Record<string, { year: number; monthIndex: number; minutes: number }> = {};
        const artistUniqueTracksMap: Record<string, Set<string>> = {};

        let firstStreamDate: Date | null = null;
        let lastStreamDate: Date | null = null;

        rawHistory.forEach((item) => {
            if (item.msPlayed < 10000 || !item.artistName || !item.trackName || !item.endTime) return;

            const playDate = new Date(item.endTime.replace(' ', 'T'));
            if (isNaN(playDate.getTime())) return;

            if (activePeriod === 'year' && playDate.getFullYear() !== currentYear) {
                return;
            }

            if (!firstStreamDate || playDate < firstStreamDate) firstStreamDate = playDate;
            if (!lastStreamDate || playDate > lastStreamDate) lastStreamDate = playDate;

            totalMs += item.msPlayed;

            const year = playDate.getFullYear();
            const monthIndex = playDate.getMonth();
            const periodKey = `${year}-${String(monthIndex).padStart(2, '0')}`;

            if (!monthlyAccumulator[periodKey]) {
                monthlyAccumulator[periodKey] = { year, monthIndex, minutes: 0 };
            }
            monthlyAccumulator[periodKey].minutes += Math.floor(item.msPlayed / 60000);

            const isArtistInvalid = item.artistName && isUnknown(item.artistName);
            const isTrackInvalid = item.trackName && isUnknown(item.trackName);

            if (item.artistName && !isArtistInvalid) {
                artistMsMap[item.artistName] = (artistMsMap[item.artistName] || 0) + item.msPlayed;

                if (!artistUniqueTracksMap[item.artistName]) {
                    artistUniqueTracksMap[item.artistName] = new Set();
                }

                if (item.trackName && !isTrackInvalid) {
                    artistUniqueTracksMap[item.artistName].add(item.trackName);
                }
            }

            if (item.trackName && item.artistName && !isTrackInvalid && !isArtistInvalid) {
                const trackId = `${item.trackName} ||| ${item.artistName}`;
                if (!trackPlaysMap[trackId]) {
                    trackPlaysMap[trackId] = { track: item.trackName, artist: item.artistName, plays: 0 };
                }
                trackPlaysMap[trackId].plays++;
            }
        });

        const sortedMonthlyDistribution: MonthlyBarData[] = Object.entries(monthlyAccumulator)
            .map(([_, data]) => ({
                monthName: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'][data.monthIndex],
                year: data.year,
                monthIndex: data.monthIndex,
                minutes: data.minutes
            }))
            .sort((a, b) => a.year !== b.year ? a.year - b.year : a.monthIndex - b.monthIndex);

        const sortedArtists: TopArtistSummary[] = Object.entries(artistMsMap)
            .map(([artist, ms]) => (
                {
                    artist,
                    totalMs: ms,
                    totalMinutes: Math.floor(ms / 60000),
                    uniqueTracksCount: artistUniqueTracksMap[artist]?.size || 0
                })
            ).sort((a, b) => b.totalMs - a.totalMs);

        const sortedTracks: TopTrackSummary[] = Object.values(trackPlaysMap)
            .sort((a, b) => b.plays - a.plays);

        const formatDateLabel = (d: Date | null) => {
            if (!d) return '';
            return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        };

        return {
            totalMinutes: Math.floor(totalMs / 60000),
            totalTracksCount: sortedTracks.length,
            topSong: sortedTracks.length > 0 ? sortedTracks[0] : null,
            topArtists: sortedArtists.slice(0, 5),
            topTracks: sortedTracks.slice(0, 5),
            monthlyDistribution: sortedMonthlyDistribution,
            timeRange: firstStreamDate && lastStreamDate ? { start: formatDateLabel(firstStreamDate), end: formatDateLabel(lastStreamDate) } : null
        };
    }, [rawHistory, currentPeriod, showPeriodToggle]);

    return (
        <HistoryContext.Provider value={{
            rawHistory,
            setRawHistory,
            clearHistory,
            currentPeriod,
            setCurrentPeriod,
            showPeriodToggle,
            globalStats
        }}>
            {children}
        </HistoryContext.Provider>
    );
}

export function useHistory() {
    const context = useContext(HistoryContext);
    if (!context) throw new Error('useHistory must be used within a HistoryProvider');
    return context;
}
'use client';

import { useHistory } from '../context/HistoryContext';
import { fetchArtistMetadata, fetchTrackMetadata } from '../context/spotifyService';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface EnrichedArtist {
    artist: string;
    totalMinutes: number;
    imageUrl: string | null;
    genres: string[];
    spotifyUrl: string | null;
}

interface EnrichedTrack {
    track: string;
    artist: string;
    plays: number;
    coverUrl: string | null;
    spotifyUrl: string | null;
}

export default function InsightsPage() {
    const { globalStats, rawHistory, currentPeriod, setCurrentPeriod, showPeriodToggle, isApiData } = useHistory();

    const [enrichedArtists, setEnrichedArtists] = useState<EnrichedArtist[]>([]);
    const [enrichedTracks, setEnrichedTracks] = useState<EnrichedTrack[]>([]);
    const [isHydrating, setIsHydrating] = useState<boolean>(false);

    useEffect(() => {
        if (globalStats.topArtists.length === 0) return;

        const hydrateData = async () => {
            setIsHydrating(true);

            const artistPromises = globalStats.topArtists.map(async (item) => {
                const meta = await fetchArtistMetadata(item.artist);
                return {
                    artist: item.artist,
                    totalMinutes: item.totalMinutes,
                    imageUrl: meta?.imageUrl || null,
                    genres: meta?.genres || [],
                    spotifyUrl: meta?.spotifyUrl || null
                };
            });

            const trackPromises = globalStats.topTracks.map(async (item) => {
                const meta = await fetchTrackMetadata(item.track, item.artist);
                return {
                    track: item.track,
                    artist: item.artist,
                    plays: item.plays,
                    coverUrl: meta?.coverUrl || null,
                    spotifyUrl: meta?.spotifyUrl || null
                };
            });

            const resArtists = await Promise.all(artistPromises);
            const resTracks = await Promise.all(trackPromises);

            setEnrichedArtists(resArtists);
            setEnrichedTracks(resTracks);
            setIsHydrating(false);
        };

        hydrateData();
    }, [globalStats.topArtists, globalStats.topTracks]);

    if (rawHistory.length === 0) {
        return (
            <main className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="text-4xl">📊</div>
                <h2 className="text-xl font-bold text-slate-800">No hay datos musicales para mostrar</h2>
                <p className="text-sm text-slate-500 max-w-sm">Primero debes cargar tus archivos JSON de Spotify o sincronizar tu cuenta en la pantalla de inicio.</p>
                <Link href="/"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm">
                    Ir al inicio
                </Link>
            </main>
        );
    }

    const maxMonthValue = Math.max(...globalStats.monthlyDistribution.map(m => m.minutes)) || 1;
    const topArtist = enrichedArtists[0];

    return (
        <main className="flex-1 bg-slate-50 p-8 overflow-y-auto h-full">
            <div className="max-w-4xl mx-auto space-y-8 pb-12">

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tu Resumen Musical</h1>
                        {globalStats.timeRange && !isApiData && (
                            <p className="text-sm text-indigo-600 font-bold mt-0.5">
                                📅 Rango seleccionado: <span
                                className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{globalStats.timeRange.start}</span> al <span
                                className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{globalStats.timeRange.end}</span>
                            </p>
                        )}
                        {isApiData && (
                            <p className="text-sm text-emerald-600 font-bold mt-0.5">
                                ✨ Sincronizado en tiempo real con tu perfil actual
                            </p>
                        )}
                    </div>

                    {showPeriodToggle && !isApiData && (
                        <div
                            className="bg-slate-200/60 p-1 rounded-xl flex gap-1 text-xs font-bold shadow-inner shrink-0 select-none">
                            <button
                                type="button" onClick={() => setCurrentPeriod('all')}
                                className={`px-4 py-1.5 rounded-lg transition-all ${currentPeriod === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Desde el Inicio
                            </button>
                            <button
                                type="button" onClick={() => setCurrentPeriod('year')}
                                className={`px-4 py-1.5 rounded-lg transition-all ${currentPeriod === 'year' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                Este año
                            </button>
                        </div>
                    )}
                </div>

                {isApiData && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="space-y-1">
                            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                                <span>💡</span> Análisis basado en tu Top Reciente
                            </h3>
                            <p className="text-xs text-amber-700 leading-relaxed max-w-2xl">
                                Estás viendo un desglose enfocado en tus <strong>150 canciones favoritas</strong> en Spotify. Para evitar distorsiones en tus patrones de tiempo, hemos deshabilitado los gráficos cronológicos. Si buscas un análisis profundo de tu histórico de minutos reales, usa la opción de subir archivos.
                            </p>
                        </div>
                        <Link
                            href="/"
                            className="text-xs text-center font-bold text-amber-900 bg-amber-200/60 hover:bg-amber-200 border border-amber-300 px-4 py-2.5 rounded-xl shrink-0 transition-colors shadow-sm"
                        >
                            Cargar JSON Histórico →
                        </Link>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch">
                    <div className="md:col-span-2 flex flex-col justify-between gap-6">
                        <div className="grid grid-cols-2 gap-4 flex-1">
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center h-full">
                                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-2xl font-bold shadow-inner mb-3">⏱</div>
                                <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                                    Minutos Totales
                                </div>
                                <span className="block text-3xl font-black text-indigo-600 tracking-tight">
                                    {globalStats.totalMinutes.toLocaleString()}
                                </span>
                                <span className="text-[9px] font-semibold text-slate-400 block mt-1 leading-tight">
                                    {isApiData ? 'Estimados de tu Top' : 'Historial completo'}
                                </span>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center h-full">
                                <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center text-2xl font-bold shadow-inner mb-3">🎵</div>
                                <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                                    Canciones Totales
                                </div>
                                <span className="block text-3xl font-black text-indigo-900 tracking-tight">
                                    {globalStats.totalTracksCount.toLocaleString()}
                                </span>
                                <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                                    {isApiData ? 'Analizadas del Top' : 'Escuchadas'}
                                </span>
                            </div>
                        </div>

                        {globalStats.topSong && (
                            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4 border-collapse">
                                <div className="w-14 h-14 border border-slate-200 text-white rounded-xl shrink-0 flex items-center justify-center text-xl shadow-inner relative overflow-hidden font-bold">
                                    {enrichedTracks[0]?.coverUrl ? (
                                        <img src={enrichedTracks[0].coverUrl} alt="Cover"
                                             className="w-full h-full object-cover"/>
                                    ) : "💿"}
                                </div>
                                <div className="truncate space-y-0.5 flex-1">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Canción más escuchada</span>
                                    <h3 className="text-base font-black text-indigo-600 truncate">{globalStats.topSong.track}</h3>
                                    <p className="text-xs font-semibold text-slate-600 truncate">{globalStats.topSong.artist} • <span
                                        className="font-mono font-bold text-slate-800">{globalStats.topSong.plays}</span> {isApiData ? 'frecuente' : 'plays'}
                                    </p>
                                </div>
                                {enrichedTracks[0]?.spotifyUrl && (
                                    <a href={enrichedTracks[0].spotifyUrl} target="_blank" rel="noreferrer"
                                       className="text-xs bg-slate-100 hover:bg-indigo-50 text-slate-700 font-bold p-2 rounded-full shrink-0 transition-colors">▶</a>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-3 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-end p-8 min-h-64 text-white">
                        {topArtist?.imageUrl && (
                            <div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity pointer-events-none"
                                 style={{backgroundImage: `url(${topArtist.imageUrl})`}}></div>
                        )}
                        <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
                             style={{backgroundImage: "radial-gradient(circle at 50% 10%, rgba(99,102,241,0.4) 0%, transparent 70%)"}}></div>

                        {globalStats.topArtists.length > 0 && (
                            <div className="absolute top-6 left-6 space-y-1 z-10">
                                <span className="inline-block text-[10px] font-black tracking-widest uppercase bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-md shadow-sm">Tu #1 Artista</span>
                                <h2 className="text-2xl font-black tracking-tight drop-shadow-md">{globalStats.topArtists[0].artist}</h2>
                                <p className="text-xs text-indigo-200/90">
                                    Has escuchado a {globalStats.topArtists[0].artist} por más de <span
                                    className="font-mono font-bold text-white bg-indigo-500/30 px-1 py-0.5 rounded">{globalStats.topArtists[0].totalMinutes.toLocaleString()}</span> minutos.
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end w-full z-10 mt-24">
                            {topArtist?.spotifyUrl && (
                                <a href={topArtist.spotifyUrl} target="_blank" rel="noreferrer"
                                   className="bg-white hover:bg-slate-100 text-slate-950 text-xs font-bold px-5 py-2.5 rounded-full flex items-center gap-1.5 shadow-md transition-all active:scale-95">
                                    ▶ Ir a Spotify
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Top 5 Artistas</h3>
                            <span className="text-slate-400 text-sm">⋮</span>
                        </div>
                        <ol className="divide-y divide-slate-100 flex-1 flex flex-col justify-around min-h-80">
                            {globalStats.topArtists.map((item, index) => {
                                const spotifyData = enrichedArtists[index];

                                return (
                                    <li key={item.artist} className="py-3 flex items-center justify-between gap-3 group first:pt-0 last:pb-0">
                                        <div className="flex items-center gap-3 truncate">
                                          <span className="font-mono text-xs font-bold text-slate-300 w-4 group-hover:text-indigo-600 transition-colors">
                                            {index + 1}
                                          </span>
                                            {spotifyData?.spotifyUrl ? (
                                                <a href={spotifyData.spotifyUrl} target="_blank" rel="noreferrer" className="w-10 h-10 bg-slate-200 rounded-full shrink-0 shadow-sm overflow-hidden block relative hover:opacity-80 transition-opacity">
                                                    {spotifyData.imageUrl ? <img src={spotifyData.imageUrl} alt={item.artist} className="w-full h-full object-cover" /> : "👤"}
                                                </a>
                                            ) : (
                                                <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0 flex items-center justify-center text-slate-400">👤</div>
                                            )}

                                            <div className="truncate space-y-0.5">
                                                {spotifyData?.spotifyUrl ? (
                                                    <a href={spotifyData.spotifyUrl} target="_blank" rel="noreferrer" className="font-bold text-slate-900 text-sm truncate block hover:text-indigo-600 hover:underline">
                                                        {item.artist}
                                                    </a>
                                                ) : (
                                                    <span className="block font-bold text-slate-900 text-sm truncate">{item.artist}</span>
                                                )}

                                                <span className="block text-[11px] font-medium text-slate-400 truncate">
                                                  {item.uniqueTracksCount} {item.uniqueTracksCount === 1 ? 'canción diferente' : 'canciones diferentes'}
                                                </span>
                                            </div>
                                        </div>

                                        <span className="font-mono text-xs font-bold text-indigo-600 shrink-0 bg-indigo-50/50 px-2 py-1 rounded-md">
                                          {item.totalMinutes.toLocaleString()} min
                                        </span>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Top 5 Canciones</h3>
                            <span className="text-slate-400 text-sm">⋮</span>
                        </div>
                        <ol className="divide-y divide-slate-100 flex-1 flex flex-col justify-around min-h-80">
                            {(enrichedTracks.length > 0 ? enrichedTracks : globalStats.topTracks).map((item, index) => {
                                const trackData = enrichedTracks[index];

                                return (
                                    <li key={`${item.track}-${item.artist}`}
                                        className="py-3 flex items-center justify-between gap-3 group first:pt-0 last:pb-0">
                                        <div className="flex items-center gap-3 truncate">
                                            <span className="font-mono text-xs font-bold text-slate-300 w-4 group-hover:text-indigo-600 transition-colors">{index + 1}</span>

                                            {trackData?.spotifyUrl ? (
                                                <a href={trackData.spotifyUrl} target="_blank" rel="noreferrer"
                                                   className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-lg shrink-0 flex items-center justify-center border border-indigo-100/50 overflow-hidden hover:opacity-80 transition-all">
                                                    {trackData.coverUrl ? <img src={trackData.coverUrl} alt="Cover"
                                                                               className="w-full h-full object-cover"/> : "🎵"}
                                                </a>
                                            ) : (
                                                <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-lg shrink-0 flex items-center justify-center border border-indigo-100/50">🎵</div>
                                            )}

                                            <div className="truncate space-y-0.5">
                                                {trackData?.spotifyUrl ? (
                                                    <a href={trackData.spotifyUrl} target="_blank" rel="noreferrer"
                                                       className="font-bold text-slate-900 text-sm truncate block hover:text-indigo-600 hover:underline">{item.track}</a>
                                                ) : (
                                                    <span className="block font-bold text-slate-900 text-sm truncate">{item.track}</span>
                                                )}
                                                <span className="block text-[11px] font-medium text-slate-400 truncate">{item.artist}</span>
                                            </div>
                                        </div>
                                        <span className="font-mono text-xs font-bold text-slate-500 shrink-0">
                                          {('plays' in item ? item.plays : (item as any).plays)} {isApiData ? 'frecuente' : 'plays'}
                                        </span>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                </div>

                {/* ADAPTACIÓN UX: El gráfico de barras mensual se oculta por completo si los datos vienen de la API */}
                {!isApiData && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Distribución Mensual Cronológica</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Actividad calculada exclusivamente para el rango seleccionado.</p>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-full inline-block"></span> 2025</div>
                                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-purple-600 rounded-full inline-block"></span> 2026</div>
                            </div>
                        </div>

                        <div className="h-48 w-full flex justify-between items-end gap-1.5 border-b border-slate-100 pb-1 pt-6 relative">
                            {globalStats.monthlyDistribution.map((monthData) => {
                                const percentageHeight = (monthData.minutes / maxMonthValue) * 100;
                                const barColorClass = monthData.year === 2025 ? 'bg-indigo-500 hover:bg-indigo-400' : 'bg-purple-600 hover:bg-purple-500';

                                return (
                                    <div key={`${monthData.year}-${monthData.monthIndex}`}
                                         className="flex-1 flex flex-col items-center gap-2 group h-full justify-end relative">
                                      <span className="opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded bottom-full mb-1 transition-all duration-150 absolute pointer-events-none z-10 shadow-md whitespace-nowrap">
                                        {monthData.minutes.toLocaleString()} min
                                      </span>
                                        <div style={{height: `${Math.max(4, percentageHeight)}%`}}
                                             className={`w-full ${barColorClass} rounded-t-md transition-all cursor-pointer shadow-sm`}></div>
                                        <div className="text-center flex flex-col -space-y-0.5 select-none shrink-0">
                                            <span className="text-[10px] font-black tracking-wider text-slate-600 font-mono">{monthData.monthName}</span>
                                            <span className="text-[8px] font-bold text-slate-400 font-mono">'{String(monthData.year).slice(2)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

            </div>
        </main>
    );
}
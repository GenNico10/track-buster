'use client';

import { useState, useMemo } from 'react';
import { useHistory } from '../context/HistoryContext';
import { useSession } from 'next-auth/react';

interface FilteredTrack {
    track: string;
    artist: string;
    plays: number;
    totalMs: number;
    firstPlayed: string;
    lastPlayed: string;
}

export default function DashboardPage() {
    const { rawHistory, isApiData } = useHistory();
    const { data: session } = useSession();

    const [results, setResults] = useState<FilteredTrack[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isCreatingPlaylist, setIsCreatingPlaylist] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    const [minPlays, setMinPlays] = useState<string>('');
    const [maxPlays, setMaxPlays] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [artistSearchInput, setArtistSearchInput] = useState<string>('');
    const [includedArtists, setIncludedArtists] = useState<string[]>([]);
    const [excludedArtists, setExcludedArtists] = useState<string[]>([]);
    const [minWords, setMinWords] = useState<string>('');
    const [maxWords, setMaxWords] = useState<string>('');

    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 10;

    const uniqueArtists = useMemo(() => {
        if (rawHistory.length === 0) return [];
        const artists = new Set<string>();
        rawHistory.forEach(item => {
            if (item.artistName) artists.add(item.artistName);
        });
        return Array.from(artists).sort((a, b) => a.localeCompare(b));
    }, [rawHistory]);

    const suggestedArtists = useMemo(() => {
        if (!artistSearchInput.trim()) return [];
        const searchLower = artistSearchInput.toLowerCase();
        return uniqueArtists.filter(artist =>
            artist.toLowerCase().includes(searchLower) &&
            !includedArtists.includes(artist) &&
            !excludedArtists.includes(artist)
        ).slice(0, 5);
    }, [artistSearchInput, uniqueArtists, includedArtists, excludedArtists]);

    const handleApplyFilters = (e: React.FormEvent) => {
        e.preventDefault();
        if (rawHistory.length === 0) {
            setErrorMessage('Por favor, sube tus archivos JSON o conecta tu cuenta en el inicio.');
            return;
        }

        setIsLoading(true);
        setCurrentPage(1);
        setSuccessMessage('');

        setTimeout(() => {
            try {
                const trackCounts: Record<string, FilteredTrack> = {};

                const filterStartDate = startDate ? new Date(startDate) : null;
                const filterEndDate = endDate ? new Date(endDate) : null;

                const excludedLower = excludedArtists.map(a => a.toLowerCase());
                const includedLower = includedArtists.map(a => a.toLowerCase());

                rawHistory.forEach((item) => {
                    if (!item.artistName || !item.trackName) return;

                    if (!isApiData && item.msPlayed < 10000) return;

                    const wordCount = item.trackName.trim().split(/\s+/).filter(Boolean).length;
                    const minW = minWords !== '' ? Math.max(0, Number(minWords)) : 0;
                    const maxW = maxWords !== '' ? Math.max(0, Number(maxWords)) : Infinity;
                    if (wordCount < minW || wordCount > maxW) return;

                    const currentArtistLower = item.artistName.toLowerCase();

                    if (excludedLower.length > 0 && excludedLower.includes(currentArtistLower)) return;
                    if (includedLower.length > 0 && !includedLower.includes(currentArtistLower)) return;

                    const formattedDate = item.endTime ? item.endTime.replace(' ', 'T') : new Date().toISOString();
                    const playDate = new Date(formattedDate);

                    if (!isApiData) {
                        if (filterStartDate && playDate < filterStartDate) return;
                        if (filterEndDate && playDate > filterEndDate) return;
                    }

                    const trackId = `${item.trackName} ||| ${item.artistName}`;

                    if (!trackCounts[trackId]) {
                        trackCounts[trackId] = {
                            track: item.trackName,
                            artist: item.artistName,
                            plays: 0,
                            totalMs: 0,
                            firstPlayed: item.endTime || formattedDate,
                            lastPlayed: item.endTime || formattedDate
                        };
                    }

                    trackCounts[trackId].plays++;
                    trackCounts[trackId].totalMs += item.msPlayed;

                    if (!isApiData && item.endTime) {
                        if (new Date(formattedDate) < new Date(trackCounts[trackId].firstPlayed.replace(' ', 'T'))) {
                            trackCounts[trackId].firstPlayed = item.endTime;
                        }
                        if (new Date(formattedDate) > new Date(trackCounts[trackId].lastPlayed.replace(' ', 'T'))) {
                            trackCounts[trackId].lastPlayed = item.endTime;
                        }
                    }
                });

                const filtered = Object.values(trackCounts).filter((item) => {
                    const min = minPlays !== '' ? Math.max(0, Number(minPlays)) : 0;
                    const max = maxPlays !== '' ? Math.max(0, Number(maxPlays)) : Infinity;
                    return item.plays >= min && item.plays <= max;
                });

                filtered.sort((a, b) => b.plays - a.plays);
                setResults(filtered);
                setErrorMessage('');
            } catch (err) {
                setErrorMessage('Ocurrió un error al procesar los filtros.');
            } finally {
                setIsLoading(false);
            }
        }, 50);
    };

    const handleCreateSpotifyPlaylist = async () => {
        if (!session?.accessToken) {
            setErrorMessage('Debes iniciar sesión con Spotify para usar esta función.');
            return;
        }

        if (results.length === 0) return;

        const userCustomName = prompt(
            "📝 ¿Qué nombre quieres ponerle a tu nueva Playlist?",
            "Mi Filtro Personalizado 🚀"
        );

        if (userCustomName === null) return;

        const finalPlaylistName = userCustomName.trim() || `Filtro TrackBuster (${new Date().toLocaleDateString('es-ES')})`;

        setIsCreatingPlaylist(true);
        setErrorMessage('');
        setSuccessMessage('');

        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        let addedCount = 0;

        try {
            const playlistRes = await fetch('https://api.spotify.com/v1/me/playlists', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: finalPlaylistName,
                    description: `Playlist optimizada generada desde tu panel de filtros de TrackBuster el ${new Date().toLocaleDateString('es-ES')}.`,
                    public: false
                })
            });

            if (!playlistRes.ok) {
                const errorData = await playlistRes.json().catch(() => ({}));
                throw new Error(`Error al crear lista (${playlistRes.status}): ${errorData.error?.message || 'Revisa permisos.'}`);
            }

            const playlistData = await playlistRes.json();
            const playlistId = playlistData.id;

            const tracksToSearch = results.slice(0, 25);
            console.log(`Iniciando inserción incremental uno a uno para ${tracksToSearch.length} canciones...`);

            for (const item of tracksToSearch) {
                try {
                    await delay(200);

                    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=track:${encodeURIComponent(item.track)}+artist:${encodeURIComponent(item.artist)}&type=track&limit=1`, {
                        headers: { 'Authorization': `Bearer ${session.accessToken}` }
                    });

                    if (searchRes.status === 429) {
                        console.warn(`[429] Búsqueda saturada para: ${item.track}. Esperando 1.5 segundos...`);
                        await delay(1500);
                        continue;
                    }

                    if (searchRes.ok) {
                        const searchData = await searchRes.json();
                        const uri = searchData.tracks?.items[0]?.uri;

                        if (uri) {
                            const appendRes = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${session.accessToken}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ uris: [uri] })
                            });

                            if (appendRes.status === 429) {
                                console.warn(`[429] Inserción saturada para: ${item.track}. Esperando 1.5 segundos...`);
                                await delay(1500);
                                continue;
                            }

                            if (appendRes.ok) {
                                addedCount++;
                                console.log(`✓ Añadida con éxito [${addedCount}]: ${item.track}`);
                            }
                        } else {
                            console.log(`✗ No se encontró coincidencia exacta para: ${item.track}`);
                        }
                    }
                } catch (err) {
                    console.error(`Error procesando de forma incremental el track ${item.track}:`, err);
                }
            }

            if (addedCount === 0) {
                throw new Error('Tu cuota temporal de la API de Spotify está totalmente saturada en este momento. La lista se ha creado en tu perfil, pero no se han podido buscar las canciones. Por favor, dale un par de minutos de margen e inténtalo de nuevo.');
            }

            setSuccessMessage(`¡Brutal! Playlist "${finalPlaylistName}" actualizada en tiempo real con ${addedCount} canciones de tu filtro.`);
        } catch (err: any) {
            console.error("Error en el proceso general:", err);
            setErrorMessage(err.message || 'Error inesperado al intentar generar la playlist.');
        } finally {
            setIsCreatingPlaylist(false);
        }
    };

    const totalDurationHours = useMemo(() => {
        const totalMs = results.reduce((acc, curr) => acc + curr.totalMs, 0);
        const totalMinutes = Math.floor(totalMs / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${hours}h ${mins}m`;
    }, [results]);

    const paginatedResults = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return results.slice(startIndex, startIndex + itemsPerPage);
    }, [results, currentPage]);

    const totalPages = Math.ceil(results.length / itemsPerPage) || 1;

    const handleAddArtistChip = (artist: string, type: 'include' | 'exclude') => {
        if (type === 'include') {
            if (!includedArtists.includes(artist)) setIncludedArtists([...includedArtists, artist]);
        } else {
            if (!excludedArtists.includes(artist)) setExcludedArtists([...excludedArtists, artist]);
        }
        setArtistSearchInput('');
    };

    const handleRemoveArtistChip = (artist: string, type: 'include' | 'exclude') => {
        if (type === 'include') {
            setIncludedArtists(includedArtists.filter(a => a !== artist));
        } else {
            setExcludedArtists(excludedArtists.filter(a => a !== artist));
        }
    };

    return (
        <div className="flex flex-1 w-full h-full overflow-hidden bg-slate-50">
            <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 overflow-hidden">
                <form onSubmit={handleApplyFilters} className="flex flex-col h-full overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 mb-1">Filtros</h2>
                            <p className="text-xs text-slate-500">Refina tu conjunto de datos</p>
                        </div>

                        {rawHistory.length === 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-medium">
                                ⚠️ No hay datos cargados. Ve a la pestaña de inicio para conectar tu cuenta o subir JSONs.
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Rango de Reproducciones</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="number" placeholder="Min" min="0" value={minPlays} onChange={e => setMinPlays(e.target.value)}
                                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-indigo-500"
                                />
                                <input
                                    type="number" placeholder="Max" min="0" value={maxPlays} onChange={e => setMaxPlays(e.target.value)}
                                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Palabras en el Título</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="number" placeholder="Mín" min="0" value={minWords} onChange={e => setMinWords(e.target.value)}
                                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-indigo-500"
                                />
                                <input
                                    type="number" placeholder="Máx" min="0" value={maxWords} onChange={e => setMaxWords(e.target.value)}
                                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-sm text-slate-900 font-medium focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                        {!isApiData && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Rango de Fechas</label>
                                <div className="space-y-2">
                                    <input
                                        type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                                        className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-sm text-slate-600 focus:outline-none focus:border-indigo-500"
                                    />
                                    <input
                                        type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                                        className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-sm text-slate-600 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="relative border-t border-slate-100 pt-4">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Filtro Global de Artistas</label>
                            <input
                                type="text" placeholder="Buscar artista..." value={artistSearchInput} onChange={e => setArtistSearchInput(e.target.value)}
                                disabled={rawHistory.length === 0}
                                className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                            />

                            {suggestedArtists.length > 0 && (
                                <ul className="absolute z-10 w-full bg-white border border-slate-200 mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm divide-y divide-slate-100">
                                    {suggestedArtists.map((artist) => (
                                        <li key={artist} className="p-2 hover:bg-slate-50 flex justify-between items-center gap-2">
                                            <span className="truncate text-slate-700 font-medium">{artist}</span>
                                            <div className="flex gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddArtistChip(artist, 'include')}
                                                    className="text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded hover:bg-indigo-100 border border-indigo-200/50"
                                                >
                                                    + Incluir
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddArtistChip(artist, 'exclude')}
                                                    className="text-[11px] bg-rose-50 text-rose-700 font-bold px-2 py-1 rounded hover:bg-rose-100 border border-rose-200/50"
                                                >
                                                    + Excluir
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Artistas Incluidos</label>
                            <div className="flex flex-wrap gap-1 bg-slate-50/50 p-2 min-h-10 border border-slate-200 rounded-lg">
                                {includedArtists.length === 0 && <span className="text-xs text-slate-400 p-0.5">Todos los artistas</span>}
                                {includedArtists.map(artist => (
                                    <span key={artist} className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                        {artist}
                                        <button type="button" onClick={() => handleRemoveArtistChip(artist, 'include')} className="cursor-pointer hover:text-indigo-200 font-bold ml-0.5">×</button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Artistas Excluidos</label>
                            <div className="flex flex-wrap gap-1 bg-slate-50/50 p-2 min-h-10 border border-slate-200 rounded-lg">
                                {excludedArtists.length === 0 && <span className="text-xs text-slate-400 p-0.5">Ninguno</span>}
                                {excludedArtists.map(artist => (
                                    <span key={artist} className="inline-flex items-center gap-1 bg-rose-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                       {artist}
                                        <button type="button" onClick={() => handleRemoveArtistChip(artist, 'exclude')} className="cursor-pointer hover:text-rose-200 font-bold ml-0.5">×</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-200 bg-white shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                        {errorMessage && <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100 mb-3">{errorMessage}</p>}
                        {successMessage && <p className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded-lg border border-emerald-100 mb-3">{successMessage}</p>}

                        <button
                            type="submit" disabled={isLoading || rawHistory.length === 0}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3.5 px-4 rounded-xl transition-colors text-sm shadow-sm"
                        >
                            {isLoading ? 'Filtrando...' : 'Aplicar todos los filtros'}
                        </button>
                    </div>

                </form>
            </aside>
            <main className="flex-1 bg-slate-50 p-8 overflow-y-auto h-full">
                <div className="max-w-5xl mx-auto space-y-6">

                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Filtrado de Historial</h1>
                            <p className="text-sm text-slate-500 mt-1">Visualiza y analiza tus patrones de escucha con precisión quirúrgica.</p>
                        </div>

                        <div className="flex gap-4">
                            <div className="bg-white border border-slate-200 rounded-xl py-3 px-6 text-right min-w-36 shadow-sm">
                                <span className="block text-2xl font-black text-indigo-600">{results.length.toLocaleString()}</span>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Tracks Encontrados</span>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl py-3 px-6 text-right min-w-36 shadow-sm">
                                <span className="block text-2xl font-black text-emerald-600">{totalDurationHours}</span>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Tiempo Total</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <span className="text-sm font-bold text-slate-700">Resultados Detallados</span>
                            {isApiData || session?.accessToken ? (
                                <button
                                    type="button"
                                    disabled={isCreatingPlaylist || results.length === 0}
                                    onClick={handleCreateSpotifyPlaylist}
                                    className="text-xs bg-emerald-500 hover:bg-emerald-600 border border-emerald-600/20 text-white font-bold px-3 py-1.5 rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow-sm flex items-center gap-1.5"
                                >
                                    🟢 {isCreatingPlaylist ? 'Buscando y creando...' : 'Crear Playlist en Spotify'}
                                </button>
                            ) : (
                                <button type="button" className="text-xs text-indigo-600 font-semibold hover:underline">↓ Exportar CSV</button>
                            )}
                        </div>

                        {results.length === 0 ? (
                            <div className="h-96 flex flex-col items-center justify-center text-slate-400 text-center px-4">
                                {rawHistory.length > 0 ? (
                                    <p className="text-sm font-medium">Ajusta los parámetros de la izquierda y haz click en "Aplicar todos los filtros"</p>
                                ) : (
                                    <p className="text-sm font-medium">No hay registros en caché. Ve a la pantalla principal para cargar tu historial.</p>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead>
                                        <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/20">
                                            <th className="p-4 w-12 text-center">#</th>
                                            <th className="p-4">Pista</th>
                                            <th className="p-4">Artista</th>
                                            <th className="p-4 text-right">Reproducciones</th>
                                            <th className="p-4 text-right">Primera Escucha</th>
                                            <th className="p-4 text-right">Última Escucha</th>
                                        </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                        {paginatedResults.map((item, index) => {
                                            const recordIndex = (currentPage - 1) * itemsPerPage + index + 1;
                                            const fFirst = item.firstPlayed ? item.firstPlayed.replace(' ', 'T') : new Date().toISOString();
                                            const fLast = item.lastPlayed ? item.lastPlayed.replace(' ', 'T') : new Date().toISOString();

                                            return (
                                                <tr key={recordIndex} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="p-4 text-center font-mono text-slate-400 text-xs">{recordIndex}</td>
                                                    <td className="p-4 font-semibold text-slate-900">{item.track}</td>
                                                    <td className="p-4 text-slate-600">{item.artist}</td>
                                                    <td className="p-4 text-right font-bold text-indigo-600 font-mono">{item.plays}</td>
                                                    <td className="p-4 text-right text-xs text-slate-500 font-medium">
                                                        {new Date(fFirst).toLocaleDateString('es-ES', {
                                                            day: '2-digit', month: 'short', year: 'numeric'
                                                        })}
                                                    </td>
                                                    <td className="p-4 text-right text-xs text-slate-500 font-medium">
                                                        {new Date(fLast).toLocaleDateString('es-ES', {
                                                            day: '2-digit', month: 'short', year: 'numeric'
                                                        })}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="p-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 bg-slate-50/30">
                                    <div>
                                        Mostrando {Math.min(results.length, (currentPage - 1) * itemsPerPage + 1)}-
                                        {Math.min(results.length, currentPage * itemsPerPage)} de {results.length} pistas
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            type="button" disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                            className="px-2.5 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 font-bold disabled:opacity-40"
                                        >
                                            &lt;
                                        </button>
                                        <span className="px-3 py-1.5 border border-indigo-100 rounded-md bg-indigo-50 text-indigo-600 font-bold">
                                          {currentPage} / {totalPages}
                                        </span>
                                        <button
                                            type="button" disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                            className="px-2.5 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 font-bold disabled:opacity-40"
                                        >
                                            &gt;
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}
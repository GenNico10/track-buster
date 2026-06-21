'use client';

import { useState, useMemo } from 'react';
import { useHistory } from '../context/HistoryContext';
import { applyTrackBusterFilters, FilteredTrack } from '../context/utils';

export default function DashboardPage() {
    const { rawHistory } = useHistory();

    const [results, setResults] = useState<FilteredTrack[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [showGuide, setShowGuide] = useState<boolean>(false);

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
            setErrorMessage('Por favor, sube tus archivos JSON en la pantalla de inicio.');
            return;
        }

        setIsLoading(true);
        setCurrentPage(1);
        setSuccessMessage('');
        setShowGuide(false);

        setTimeout(() => {
            try {
                const config = {
                    minPlays,
                    maxPlays,
                    startDate,
                    endDate,
                    minWords,
                    maxWords,
                    includedArtists,
                    excludedArtists
                };

                const filtered = applyTrackBusterFilters(rawHistory, config);
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

    const handleExportPlaylist = () => {
        if (results.length === 0) return;

        const fileContent = results
            .map((item) => `${item.artist} - ${item.track}`)
            .join('\n');

        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `playlist-trackbuster-${new Date().toISOString().slice(0,10)}.txt`;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setSuccessMessage(`📥 ¡Archivo .txt descargado con éxito con ${results.length} canciones!`);
        setErrorMessage('');
        setShowGuide(true);
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
        <div className="flex flex-1 w-full h-[calc(100vh-62px)] overflow-hidden bg-slate-50">
            <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 overflow-hidden">
                <form onSubmit={handleApplyFilters} className="flex flex-col h-full overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 mb-1">Filtros</h2>
                            <p className="text-xs text-slate-500">Refina tu conjunto de datos</p>
                        </div>

                        {rawHistory.length === 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-medium">
                                ⚠️ No hay datos cargados. Ve a la pestaña de inicio para subir tus JSONs.
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
                            {results.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleExportPlaylist}
                                    className="text-xs bg-indigo-600 hover:bg-indigo-700 border border-indigo-700/20 text-white font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                                >
                                    📥 Descargar Playlist (.txt)
                                </button>
                            )}
                        </div>

                        {showGuide && (
                            <div className="p-6 bg-gradient-to-br from-indigo-50/40 via-indigo-50/10 to-white border-b border-slate-100 space-y-4 animate-in fade-in duration-300">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                                            <span>✨</span> ¡Siguiente paso: Pásala a tu Spotify!
                                        </h3>
                                        <p className="text-xs text-slate-500 leading-normal max-w-2xl">
                                            Usa una de estas plataformas gratuitas para sincronizar el archivo <span className="font-mono text-indigo-600 bg-indigo-50/80 px-1.5 py-0.5 rounded font-semibold text-[11px]">.txt</span> que acabas de descargar directamente con tu cuenta musical.
                                        </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <a
                                            href="https://www.tunemymusic.com/?source=txt" target="_blank" rel="noreferrer"
                                            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 rounded-xl shadow-sm transition-all text-center flex items-center gap-1.5"
                                        >
                                            🔗 Ir a TuneMyMusic
                                        </a>
                                        <a
                                            href="https://soundiiz.com/" target="_blank" rel="noreferrer"
                                            className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-4 py-2.5 rounded-xl transition-all text-center"
                                        >
                                            Ir a Soundiiz
                                        </a>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                    <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex items-start gap-3">
                                        <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 w-5 h-5 rounded-full flex items-center justify-center shrink-0">1</span>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">
                                            Entra en la plataforma y selecciona <strong>"Texto"</strong> o <strong>"Subir Archivo"</strong> como la fuente de origen.
                                        </p>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex items-start gap-3">
                                        <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 w-5 h-5 rounded-full flex items-center justify-center shrink-0">2</span>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">
                                            Arrastra el archivo <span className="font-mono font-semibold text-slate-800">.txt</span> descargado. La web buscará y emparejará las canciones de inmediato.
                                        </p>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-sm flex items-start gap-3">
                                        <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 w-5 h-5 rounded-full flex items-center justify-center shrink-0">3</span>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">
                                            Elige <strong>Spotify</strong> como destino, dale a comenzar conversión y ¡listo!, aparecerá mágica en tu biblioteca.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {results.length === 0 ? (
                            <div className="h-96 flex flex-col items-center justify-center text-slate-400 text-center px-4">
                                {rawHistory.length > 0 ? (
                                    <p className="text-sm font-medium">Ajusta los parámetros de la izquierda y haz click en &#34;Aplicar todos los filtros&#34;</p>
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
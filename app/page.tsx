'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHistory, SpotifyStreamItem } from './context/HistoryContext';
import { signIn, signOut, useSession } from "next-auth/react";

export default function LandingPage() {
  const { setRawHistory, rawHistory, syncWithSpotify, isLoadingSpotify } = useHistory();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { data: session, status } = useSession();

  useEffect(() => {
    if (session?.accessToken && rawHistory.length === 0) {
      const autoSync = async () => {
        const success = await syncWithSpotify();
        if (success) {
          router.push('/insights');
        }
      };
      autoSync();
    }
  }, [session?.accessToken, rawHistory.length, syncWithSpotify, router]);

  const handleFileChange = async () => {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setErrorMessage('');
    let combined: SpotifyStreamItem[] = [];

    const readFile = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('File read error'));
        reader.readAsText(file);
      });
    };

    try {
      for (let i = 0; i < files.length; i++) {
        const content = await readFile(files[i]);
        const parsed: SpotifyStreamItem[] = JSON.parse(content);
        combined = combined.concat(parsed);
      }

      setRawHistory(combined);
      router.push('/insights');
    } catch (err) {
      setErrorMessage('Formato JSON inválido. Revisa tus archivos.');
      setIsLoading(false);
    }
  };

  const isProcessing = isLoading || isLoadingSpotify;

  return (
      <main className="flex-1 overflow-y-auto bg-slate-50 pt-10 pb-12 px-8 flex flex-col items-center justify-center">
        <div className="max-w-4xl w-full space-y-10">
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
              Tu historia musical, decodificada
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mx-auto">
              Descubre los patrones ocultos de tu cuenta. Conecta tu perfil para una radiografía instantánea de tus tendencias o sube tus JSON para liberar las métricas pesadas históricas.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                  <span>⚡</span> Conexión Express (Perfil API)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Analiza de forma instantánea tus <strong>150 canciones más escuchadas recientemente</strong>. Al ser una foto estática de tus gustos del momento, se omiten los gráficos cronológicos mensuales y los contadores masivos de minutos totales.
                </p>
              </div>
              <div className="pt-3 flex items-center justify-start">
                {status === "loading" || isLoadingSpotify ? (
                    <div className="text-[11px] font-bold text-slate-400 bg-slate-100 px-4 py-2 rounded-xl animate-pulse">
                      Sincronizando biblioteca...
                    </div>
                ) : session ? (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                      {session.user?.image && (
                          <img
                              src={session.user.image}
                              alt={session.user.name || "Perfil"}
                              className="w-5 h-5 rounded-full border border-emerald-500 shadow-sm shrink-0 object-cover"
                          />
                      )}
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-ping"></span>
                      <span className="font-bold text-slate-700 max-w-[100px] truncate">{session.user?.name}</span>
                      <button type="button" onClick={() => signOut()} className="text-slate-400 hover:text-rose-600 ml-1 font-bold cursor-pointer">×</button>
                    </div>
                ) : (
                    <div className="flex w-full justify-center">
                      <button
                          type="button" onClick={() => signIn("spotify")}
                          className="bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-95 cursor-pointer shrink-0"
                      >
                        <svg
                            className="w-4 h-4 fill-current shrink-0"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.076-.336.135-.668.47-.743 3.856-.88 7.15-.51 9.822 1.128.296.18.387.563.205.86zm1.224-2.723c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.08-1.182-.413.125-.847-.107-.972-.52-.125-.413.107-.847.52-.972 3.673-1.114 8.243-.57 11.35 1.343.366.226.486.706.256 1.071zm.105-2.836C14.437 8.71 8.795 8.523 5.534 9.512c-.502.152-1.03-.133-1.182-.635-.152-.502.133-1.03.635-1.182 3.75-1.137 9.973-.924 14.21 1.594.453.27.602.853.33 1.306-.27.453-.852.602-1.305.33z"/>
                        </svg>
                        Conectar Perfil
                      </button>
                    </div>
                )}
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                  <span>🔥</span> El Motor Completo (Archivos JSON)
                </div>
                <p className="text-xs text-indigo-950/80 leading-relaxed">
                  <strong>Esta aplicación funciona al 100% de su potencia con tus archivos.</strong> Desbloquea el análisis profundo de años: miles de minutos de escucha reales, desgloses por meses, picos de horas exactas y filtros avanzados de reproducciones.
                </p>
              </div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block pt-2">Recomendado para analítica avanzada</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center space-y-4">
              <input
                  type="file" accept=".json" ref={fileInputRef} multiple
                  onChange={handleFileChange} className="hidden"
                  disabled={isProcessing}
              />
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold shadow-inner">
                ☁
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-slate-800">Carga tus archivos descargados aquí</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Suelta los ficheros <span className="text-indigo-600 font-mono font-semibold">StreamingHistory*.json</span> o <span className="text-indigo-600 font-mono font-semibold">Audio/*.json</span> de tu paquete de datos.
                </p>
              </div>

              <button
                  type="button" disabled={isProcessing}
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer disabled:bg-slate-300"
              >
                {isProcessing ? 'Procesando registros...' : 'Seleccionar archivos JSON'}
              </button>
            </div>
            <div className="space-y-4 flex flex-col justify-between">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex-1 flex flex-col justify-center">
                <span className="text-indigo-600 text-xs font-bold uppercase tracking-wider block mb-1">🛡 Privacidad Local Estricta</span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tus datos nunca se suben a ningún servidor. Todo el procesamiento de los JSON se realiza localmente en la memoria de tu navegador de forma 100% privada.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex-1 flex flex-col justify-center">
                <span className="text-purple-600 text-xs font-bold uppercase tracking-wider block mb-1">📈 Desglose Cronológico</span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Al cargar tus archivos, las vistas analíticas desbloquearán automáticamente las gráficas por años y meses cronológicos.
                </p>
              </div>
            </div>
          </div>

          {rawHistory.length > 0 && (
              <div className="text-sm bg-indigo-50 border border-indigo-200 text-indigo-700 p-4 rounded-xl flex justify-between items-center max-w-xl mx-auto shadow-sm">
                <span>¡Tienes <strong>{rawHistory.length.toLocaleString()}</strong> registros cargados en tu contexto local!</span>
                <button onClick={() => router.push('/insights')} className="font-bold underline text-xs cursor-pointer">Ver Resumen →</button>
              </div>
          )}

          {errorMessage && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl max-w-md mx-auto text-center font-medium">{errorMessage}</p>}
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">📂 Cómo solicitar tus archivos JSON oficiales</h3>
              <p className="text-xs text-slate-500">Por normativas de protección de datos (RGPD), Spotify está obligada a darte tu historial completo. Pídelos siguiendo estos pasos:</p>
            </div>

            <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700">
              <li className="bg-white p-4 rounded-xl border border-slate-200/60 space-y-1.5 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">PASO 1</span>
                  <p className="font-bold text-slate-900 mt-2">Pestaña de Privacidad</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                    Inicia sesión en la versión web de Spotify, ve al panel de control de tu cuenta y entra en la sección llamada <strong>"Privacidad de los datos"</strong>.
                  </p>
                </div>
              </li>

              <li className="bg-white p-4 rounded-xl border border-slate-200/60 space-y-1.5 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">PASO 2</span>
                  <p className="font-bold text-slate-900 mt-2">Solicitar "Datos de la cuenta"</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                    Baja hasta el bloque de descargas y solicita el paquete básico de <strong>"Datos de la cuenta"</strong>. Spotify procesará tus ficheros y te enviará un zip por email en unos días.
                  </p>
                </div>
              </li>

              <li className="bg-white p-4 rounded-xl border border-slate-200/60 space-y-1.5 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">PASO 3</span>
                  <p className="font-bold text-slate-900 mt-2">Extrae y Arrastra</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                    Cuando te llegue el correo, descarga el archivo comprimido, busca los ficheros con el patrón de nombre <strong>StreamingHistory*.json</strong> (o los JSON dentro de la carpeta <strong>Audio</strong>) y lánzalos en el panel de arriba.
                  </p>
                </div>
              </li>
            </ol>
          </div>

        </div>
      </main>
  );
}
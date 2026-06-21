'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useHistory, SpotifyStreamItem } from './context/HistoryContext';

export default function LandingPage() {
  const { setRawHistory, rawHistory } = useHistory();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
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

  return (
      <div className="w-full min-h-[calc(100vh-64px)] flex flex-col justify-center bg-slate-50">
        <main className="w-full max-w-4xl mx-auto py-12 px-6 sm:px-8 space-y-10 animate-in fade-in duration-500">

          <div className="text-center space-y-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
              Tu historia musical, decodificada
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Descubre los patrones ocultos de tu cuenta. Sube tus archivos JSON descargados directamente desde Spotify para liberar analíticas avanzadas históricas con total privacidad.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center space-y-4 min-h-[240px]">
              <input
                  type="file" accept=".json" ref={fileInputRef} multiple
                  onChange={handleFileChange} className="hidden"
                  disabled={isLoading}
              />
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold shadow-inner">
                ☁
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-slate-800">Carga tus archivos descargados aquí</h3>
                <p className="text-xs text-slate-400 max-w-sm leading-normal">
                  Suelta los ficheros <span className="text-indigo-600 font-mono font-semibold">StreamingHistory*.json</span> o los archivos JSON de tu carpeta de datos.
                </p>
              </div>

              <button
                  type="button" disabled={isLoading}
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer disabled:bg-slate-300 active:scale-98 w-full sm:w-auto"
              >
                {isLoading ? 'Procesando registros...' : 'Seleccionar archivos JSON'}
              </button>
            </div>

            <div className="space-y-4 flex flex-col justify-between">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex-1 flex flex-col justify-center">
                <span className="text-indigo-600 text-xs font-bold uppercase tracking-wider block mb-1">🛡 Privacidad Local Estricta</span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tus datos nunca abandonan tu navegador. Todo el procesamiento se realiza localmente en la memoria de tu dispositivo de forma 100% privada.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex-1 flex flex-col justify-center">
                <span className="text-purple-600 text-xs font-bold uppercase tracking-wider block mb-1">📈 Desglose Cronológico</span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Al cargar tus archivos, las vistas analíticas desbloquearán automáticamente las gráficas interactivas por años y meses cronológicos.
                </p>
              </div>
            </div>
          </div>

          {rawHistory.length > 0 && (
              <div className="text-sm bg-indigo-50 border border-indigo-200 text-indigo-700 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center max-w-xl mx-auto shadow-sm gap-2">
                <span className="text-center sm:text-left">¡Tienes <strong>{rawHistory.length.toLocaleString()}</strong> registros cargados en tu contexto local!</span>
                <button onClick={() => router.push('/insights')} className="font-bold underline text-xs cursor-pointer shrink-0">Ver Resumen →</button>
              </div>
          )}

          {errorMessage && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl max-w-md mx-auto text-center font-medium shadow-sm">{errorMessage}</p>}

          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">📂 Cómo solicitar tus archivos JSON oficiales</h3>
              <p className="text-xs text-slate-500 leading-normal">Por normativas de protección de datos (RGPD), Spotify está obligada a darte tu historial completo. Pídelos siguiendo estos pasos:</p>
            </div>

            <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700">
              <li className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-between min-h-[140px]">
                <div>
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">PASO 1</span>
                  <p className="font-bold text-slate-900 mt-2">Pestaña de Privacidad</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                    Inicia sesión en la versión web de Spotify, ve al panel de control de tu cuenta y entra en la sección llamada <strong>"Privacidad de los datos"</strong>.
                  </p>
                </div>
              </li>

              <li className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-between min-h-[140px]">
                <div>
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">PASO 2</span>
                  <p className="font-bold text-slate-900 mt-2">Solicitar "Datos de la cuenta"</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                    Baja hasta el bloque de descargas y solicita el paquete básico de <strong>"Datos de la cuenta"</strong>. Spotify procesará tus ficheros y te enviará un zip por email en unos días.
                  </p>
                </div>
              </li>

              <li className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex flex-col justify-between min-h-[140px]">
                <div>
                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">PASO 3</span>
                  <p className="font-bold text-slate-900 mt-2">Extrae y Arrastra</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                    Cuando te llegue el correo, descarga el archivo comprimido, busca los ficheros con el patrón de nombre <strong>StreamingHistory*.json</strong> y lánzalos en el panel de arriba.
                  </p>
                </div>
              </li>
            </ol>
          </div>

        </main>
      </div>
  );
}
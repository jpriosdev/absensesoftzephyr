import { useState, useRef, useEffect } from 'react';

/**
 * UploadData.js - Refactorizado
 * Componente para carga de datos con normalización SQL/CSV
 * Validación mejorada, manejo de errores robusto
 */
export default function UploadData() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [keepOriginal, setKeepOriginal] = useState(true);
  const eventSourceRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setLogs([]);
    setRunning(true);

    // Convert file to base64 safely using FileReader (avoids spread over large arrays)
    const getBase64 = (f) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // reader.result is like: data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,....
        const res = reader.result || '';
        const parts = res.split(',');
        resolve(parts[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });

    const base64 = await getBase64(file);

    // Upload
    // Save uploaded file with standard name for processing
    const targetFilename = 'qa-data-upload.xlsx';
    setLogs(l => [...l, `Uploading and saving as ${targetFilename}...`]);
    const resp = await fetch('/api/upload-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: targetFilename, contentBase64: base64, originalFilename: file.name, saveOriginal: keepOriginal })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      setLogs(l => [...l, `ERROR uploading: ${err.error || resp.statusText}`]);
      setRunning(false);
      return;
    }

    const { runId } = await resp.json();

    // Connect to SSE for logs
    const es = new EventSource(`/api/generate-status?id=${runId}`);
    eventSourceRef.current = es;

    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload.type === 'log') setLogs(l => [...l, payload.msg]);
        if (payload.type === 'end') {
          setLogs(l => [...l, `Process finished (code: ${payload.code})`]);
          setShowSuccess(true);
          // After process ends, request fresh QA data from server and notify app
          (async () => {
            try {
              await fetch('/api/qa-data?force=1');
            } catch (e) {
              // ignore
            }
            try {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('qa:data:updated', { detail: { runId } }));
              }
            } catch (e) {}
            setRunning(false);
            try { es.close(); } catch (e) {}
          })();
        }
      } catch (e) {
        setLogs(l => [...l, ev.data]);
      }
    };

    es.onerror = () => {
      setLogs(l => [...l, 'Connection lost to server (SSE)']);
      setRunning(false);
      try { es.close(); } catch (e) {}
    };
  };

  // Auto-hide success toast after 5s
  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => setShowSuccess(false), 5000);
    return () => clearTimeout(t);
  }, [showSuccess]);

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <h3 className="font-medium mb-2">Actualizar datos desde Excel</h3>
      <p className="text-sm text-gray-600 mb-3">Adjunta el archivo Excel (ej. <code>Reporte_QA_V1.xlsx</code>) y el sistema regenerará el JSON automáticamente mostrando el progreso.</p>

      <div className="flex items-center space-x-3">
        <input type="file" accept=".xlsx,.xls" onChange={handleFile} disabled={running} />
        {running ? <span className="text-sm text-gray-600">Procesando…</span> : null}
      </div>

      <div className="mt-2 flex items-center space-x-2 text-sm">
        <label className="inline-flex items-center">
          <input type="checkbox" className="mr-2" checked={keepOriginal} onChange={(e) => setKeepOriginal(e.target.checked)} />
          Save copy with original name
        </label>
      </div>

      <div className="mt-3 bg-gray-50 p-3 rounded h-40 overflow-auto">
        {logs.length === 0 ? <div className="text-sm text-gray-500">Aquí aparecerán los logs del proceso.</div> : (
          logs.map((l, i) => <div key={i} className="text-xs font-mono text-gray-800 whitespace-pre-wrap">{l}</div>)
        )}
      </div>

      {/* Success toast */}
      {showSuccess && (
        <div className="fixed right-4 bottom-6 z-50">
          <div className="bg-green-600 text-white px-4 py-2 rounded shadow-lg flex items-center space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
            <div className="text-sm">Generación completada — datos actualizados</div>
          </div>
        </div>
      )}
    </div>
  );
}

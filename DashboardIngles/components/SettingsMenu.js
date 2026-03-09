/**
 * Componente: SettingsMenu.js
 * 
 * Menú desplegable en el header con opciones de:
 * - Gestión de Datos (upload, versiones)
 * - Actualizar datos
 * - Configuración
 */

import { useState, useRef, useEffect } from 'react';
import { Settings, Upload, History, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export default function SettingsMenu({ onRefresh, loading }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [versions, setVersions] = useState([]);
  const [activeVersion, setActiveVersion] = useState('current');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const menuRef = useRef(null);
  const modalRef = useRef(null);

  // Cerrar menú al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setShowDataManagement(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargar versiones
  async function fetchVersions() {
    try {
      const res = await fetch('/api/data-versions');
      const data = await res.json();
      setVersions(data.versions || []);
      const active = data.versions?.find(v => v.active);
      if (active) setActiveVersion(active.id);
    } catch (error) {
      console.error('Error fetching versions:', error);
    }
  }

  // Al abrir gestión de datos
  function openDataManagement() {
    setShowDataManagement(true);
    setIsOpen(false);
    fetchVersions();
  }

  // Cargar archivo
  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setMessage({
        type: 'error',
        text: 'Please select a valid CSV file'
      });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-csv', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `✅ ${data.message}`
        });
        setShowUploadForm(false);
        setTimeout(fetchVersions, 2000);
        setTimeout(() => window.location.reload(), 3000);
      } else {
        setMessage({
          type: 'error',
          text: `❌ Error: ${data.error}`
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ Error uploading file: ${error.message}`
      });
    } finally {
      setUploading(false);
    }
  }

  // Cambiar versión
  async function switchVersion(versionId) {
    if (versionId === activeVersion) return;

    try {
      const response = await fetch('/api/switch-data-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `✅ ${data.message}`
        });
        setActiveVersion(versionId);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({
          type: 'error',
          text: `❌ Error: ${data.error}`
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ Error al cambiar versión: ${error.message}`
      });
    }
  }

  return (
    <>
      {/* Botón de Menú */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center px-4 py-2 bg-executive-600 text-white rounded-lg hover:bg-executive-700 transition-colors gap-2"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline text-sm font-medium">Options</span>
          <span className="sm:hidden">⚙️</span>
        </button>

        {/* Menú desplegable */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="p-2 space-y-1">
              {/* Opción: Gestión de Datos */}
              <button
                onClick={openDataManagement}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <History className="w-4 h-4 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">Data Management</div>
                  <div className="text-xs text-gray-500">Upload files and versions</div>
                </div>
              </button>

              <div className="border-t border-gray-200 my-1"></div>

              {/* Opción: Actualizar */}
              <button
                onClick={() => {
                  onRefresh?.();
                  setIsOpen(false);
                }}
                disabled={loading}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-green-600 ${loading ? 'animate-spin' : ''}`} />
                <div className="text-left">
                  <div className="font-medium">Refresh</div>
                  <div className="text-xs text-gray-500">Reload current data</div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Gestión de Datos */}
      {showDataManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 pt-10" ref={modalRef}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between border-b border-blue-800 z-10">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6" />
                <h2 className="text-2xl font-bold">Data Management</h2>
              </div>
              <button onClick={() => setShowDataManagement(false)} className="text-white hover:bg-blue-600 p-2 rounded-lg transition-colors flex-shrink-0">✕</button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-6">
              {/* Status message */}
              {message && (
                <div
                  className={`flex items-center gap-3 p-4 rounded-lg ${
                    message.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              {/* Sección de Carga */}
              <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  Upload New File
                </h3>

                {!showUploadForm ? (
                  <button onClick={() => setShowUploadForm(true)} className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-base">+ Select CSV File</button>
                ) : (
                  <div className="space-y-3">
                    <label className="block cursor-pointer">
                      <div className="text-center py-8 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-100 transition-all bg-white">
                        <Upload className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                        <p className="text-base font-medium text-gray-700">Click to select file</p>
                        <p className="text-sm text-gray-500 mt-2">or drag a CSV file here</p>
                      </div>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleUpload}
                        disabled={uploading}
                        className="hidden"
                        aria-label="Select CSV file"
                      />
                    </label>
                    <p className="text-sm text-gray-600 text-center bg-yellow-50 p-3 rounded border border-yellow-200">📌 The file must have the same columns as MockDataV0.csv</p>
                    {uploading && (
                      <div className="mt-3 flex items-center justify-center gap-2 bg-blue-100 p-4 rounded-lg">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="text-blue-700 font-medium">Processing file...</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowUploadForm(false)}
                        disabled={uploading}
                        className="flex-1 px-3 py-2 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Selector de Versiones */}
              {versions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-600" />
                    Versiones de Datos ({versions.length})
                  </h3>

                  <div className="grid gap-3">
                    {versions.map(version => (
                      <button
                        key={version.id}
                        onClick={() => switchVersion(version.id)}
                        disabled={version.active}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          version.active
                            ? 'border-green-500 bg-green-50 shadow-md cursor-default'
                            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                              {version.label}
                              {version.active && (
                                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded flex-shrink-0">
                                  ACTIVA
                                </span>
                              )}
                            </h4>
                            <p className="text-sm text-gray-600 mt-2 flex flex-wrap gap-3">
                              <span>📊 {version.totalBugs} bugs</span>
                              <span>•</span>
                              <span>{version.sprints} sprints</span>
                              <span>•</span>
                              <span>{version.developers} devs</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(version.timestamp).toLocaleString('es-ES')}
                            </p>
                          </div>
                          {!version.active && (
                            <RefreshCw className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {versions.length === 1 && (
                    <p className="text-sm text-gray-600 italic bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      💡 Carga un nuevo archivo para crear una versión anterior
                    </p>
                  )}
                </div>
              )}

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Note:</strong> Only 2 versions are kept (current + previous).
                  When loading a new file, the previous version is replaced.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

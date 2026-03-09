/* eslint-disable react/no-unescaped-entities */
/**
 * ResolutionTimeModal.js
 * Modal detallado para "Average Resolution Time" 
 * Diseño consistente con otros modales del dashboard
 * Muestra claramente: Casos Resueltos vs Casos Pendientes
 * Explica el desglose de todos los 298+ registros con Fail
 */
import React from 'react';
import { X, TrendingUp, Clock, CheckCircle, AlertCircle, Hourglass, BarChart3, Info } from 'lucide-react';

const ResolutionTimeModal = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const {
    totalFailureRecords = 0,        // Total de registros con estado=Fail en CSV
    totalUniqueTestCases = 0,       // Total de casos únicos con Fail
    casesWithoutFail = 0,           // Casos nunca tuvieron Fail
    casesWithOnlyOneExecution = 0,  // Solo 1 ejecución (no se puede calcular tiempo)
    casesWithMultipleExecutions = 0, // Multi-ejecución
    resolvedCount = 0,              // Fail → Pass (se resolvieron) - CASOS ÚNICOS
    pendingCount = 0,               // Multi-ejecución, aún en Fail - CASOS ÚNICOS
    unresolvedSingle = 0,           // Solo 1 Fail, sin ruta de resolución
    resolvedRecords = 0,            // 238 registros resueltos
    openRecords = 0,                // 58 registros abiertos
    resolvedTestCases = 0,          // Número de CASOS ÚNICOS resueltos
    openTestCases = 0,              // Número de CASOS ÚNICOS abiertos
    resolutionRate = 0,
    average = 0,
    minimum = 0,
    maximum = 0,
    median = 0,
    count = 0,
    distribution = {},
    pendingCases = [],
    unresolvedSingleCases = []
  } = data;

  const ranges = [
    { key: 'same_day', label: 'Same Day', color: 'bg-green-100 text-green-800' },
    { key: 'one_to_seven', label: '1-7 Days', color: 'bg-blue-100 text-blue-800' },
    { key: 'eight_to_fourteen', label: '8-14 Days', color: 'bg-yellow-100 text-yellow-800' },
    { key: 'fifteen_to_thirty', label: '15-30 Days', color: 'bg-orange-100 text-orange-800' },
    { key: 'over_thirty', label: '30+ Days', color: 'bg-red-100 text-red-800' },
  ];

  const maxDistCount = Math.max(...ranges.map(r => distribution[r.key]?.count || 0));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-7 h-7" />
            <h2 className="text-2xl font-bold">Test Case Resolution Analysis</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Unified: Failure Records Breakdown + Resolved/Open Status */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 border-2 border-slate-300 rounded-lg p-6">
            <div className="flex gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-slate-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-gray-800 text-lg">
                  {totalFailureRecords} Failure Execution Records Breakdown
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Understanding how {totalFailureRecords} failure records map to {totalUniqueTestCases} unique test cases
                </p>
              </div>
            </div>

            {/* Core Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Resolved Column */}
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4">
                  <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Resolved Failures</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="bg-white rounded p-2.5 border border-green-200">
                      <p className="text-xs text-gray-600 font-medium">Failure Records (80%)</p>
                      <p className="text-2xl font-bold text-green-600">{resolvedRecords}</p>
                      <p className="text-xs text-gray-600 mt-1">Records that eventually passed</p>
                    </div>
                    <div className="bg-white rounded p-2.5 border border-green-200">
                      <p className="text-xs text-gray-600 font-medium">Unique Test Cases</p>
                      <p className="text-2xl font-bold text-green-700">{resolvedTestCases || resolvedCount}</p>
                      <p className="text-xs text-gray-600 mt-1">Cases with Fail → Pass</p>
                    </div>
                    <div className="bg-green-100 rounded p-2.5 border border-green-300">
                      <p className="text-xs font-semibold text-green-900">
                        Average: <strong>{(resolvedRecords > 0 && (resolvedTestCases || resolvedCount) > 0 ? (resolvedRecords / (resolvedTestCases || resolvedCount || 1)).toFixed(1) : '0')}</strong> records/case
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Open Column */}
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-300 rounded-lg p-4">
                  <h4 className="font-bold text-orange-900 mb-3 flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span>Open Failures</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="bg-white rounded p-2.5 border border-orange-200">
                      <p className="text-xs text-gray-600 font-medium">Failure Records (20%)</p>
                      <p className="text-2xl font-bold text-orange-600">{openRecords}</p>
                      <p className="text-xs text-gray-600 mt-1">Records still in Fail state</p>
                    </div>
                    <div className="bg-white rounded p-2.5 border border-orange-200">
                      <p className="text-xs text-gray-600 font-medium">Unique Test Cases</p>
                      <p className="text-2xl font-bold text-orange-700">{openTestCases || pendingCount}</p>
                      <p className="text-xs text-gray-600 mt-1">Cases with no passing execution</p>
                    </div>
                    <div className="bg-orange-100 rounded p-2.5 border border-orange-300">
                      <p className="text-xs font-semibold text-orange-900">
                        Average: <strong>{(openRecords > 0 && (openTestCases || pendingCount) > 0 ? (openRecords / (openTestCases || pendingCount || 1)).toFixed(1) : '0')}</strong> records/case
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Note */}
            <p className="text-xs font-semibold text-blue-900 bg-blue-100 p-3 rounded mt-4 border border-blue-200">
              📌 {totalFailureRecords} execution records across {totalUniqueTestCases} test cases = 
              {totalUniqueTestCases > 0 ? (totalFailureRecords / totalUniqueTestCases).toFixed(1) : '0'} avg executions per case
            </p>
          </div>

          {/* Resolution Time Statistics */}
          {resolvedCount > 0 && (
            <>
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Time to Resolution ({count} of {resolvedCount} Test Cases with Complete Date Data)
                </h3>

                <div className="text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded border border-blue-200 space-y-2">
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-800 mb-2">Why Only {count} of {resolvedCount} Cases?</p>
                      <ul className="text-xs space-y-1.5 text-gray-700">
                        <li>• <strong>{resolvedCount} total cases</strong> have Fail → Pass progression (resolved)</li>
                        <li>• <strong>Only {count} cases</strong> have complete date information (Fail date + Pass date) to calculate resolution time</li>
                        <li>• <strong>{resolvedCount - (count || 0)} cases</strong> are resolved but lack resolution dates</li>
                        <li>• The distribution below shows data for the {count} measurable cases</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Average Time</p>
                    <p className="text-2xl font-bold text-purple-600">{average.toFixed(1)}</p>
                    <p className="text-xs text-gray-600">days</p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Median Time</p>
                    <p className="text-2xl font-bold text-blue-600">{median.toFixed(1)}</p>
                    <p className="text-xs text-gray-600">days</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Failures Resolved</p>
                    <p className="text-2xl font-bold text-green-600">{resolvedRecords}</p>
                    <p className="text-xs text-gray-600">records</p>
                  </div>

                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Failures Open</p>
                    <p className="text-2xl font-bold text-red-600">{openRecords}</p>
                    <p className="text-xs text-gray-600">records</p>
                  </div>
                </div>

                {/* Distribution + Understanding Section */}
                <div className="space-y-4">
                  {/* Distribution Grid */}
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-4 border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Resolution Timeline: {count} cases with complete date data</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {ranges
                        .map(range => ({
                          ...range,
                          count: distribution[range.key]?.count || 0
                        }))
                        .sort((a, b) => b.count - a.count)
                        .map((range) => {
                          const item = distribution[range.key] || { count: 0, percentage: 0 };
                          return (
                            <div 
                              key={range.key} 
                              className={`${range.color} rounded-lg p-3 text-center border border-opacity-50 transition-transform hover:scale-105 cursor-default`}
                            >
                              <p className="text-lg font-bold text-gray-800">{item.count}</p>
                              <p className="text-xs text-gray-700 font-semibold mt-1">{item.percentage}%</p>
                              <p className="text-xs text-gray-600 mt-1.5">{range.label}</p>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Pending Cases - Multiple executions, still Fail */}
          {pendingCount > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                Open/Pending Cases ({openRecords} Failure Records | {openTestCases} Cases)
              </h3>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                  <p className="text-xs text-orange-700 font-semibold">Total Records</p>
                  <p className="text-2xl font-bold text-orange-600">{openRecords}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                  <p className="text-xs text-orange-700 font-semibold">Unique Cases</p>
                  <p className="text-2xl font-bold text-orange-600">{openTestCases}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                  <p className="text-xs text-orange-700 font-semibold">Avg per Case</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {openTestCases > 0 ? (openRecords / openTestCases).toFixed(1) : 0}
                  </p>
                </div>
              </div>

              {pendingCases.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-orange-100 border-b border-orange-300">
                        <th className="text-left px-3 py-2 font-bold text-orange-900">Clave</th>
                        <th className="text-left px-3 py-2 font-bold text-orange-900">Priority</th>
                        <th className="text-left px-3 py-2 font-bold text-orange-900">Test Level</th>
                        <th className="text-center px-3 py-2 font-bold text-orange-900">Failures</th>
                        <th className="text-left px-3 py-2 font-bold text-orange-900">System</th>
                        <th className="text-left px-3 py-2 font-bold text-orange-900">Browser</th>
                        <th className="text-left px-3 py-2 font-bold text-orange-900">User Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingCases.map((caseItem, idx) => {
                        const getPriorityColor = (priority) => {
                          if (!priority) return 'bg-gray-100 text-gray-800';
                          const lower = priority.toLowerCase();
                          if (lower.includes('high') || lower.includes('critical')) return 'bg-red-100 text-red-800';
                          if (lower.includes('medium') || lower.includes('standard')) return 'bg-yellow-100 text-yellow-800';
                          if (lower.includes('low')) return 'bg-blue-100 text-blue-800';
                          return 'bg-gray-100 text-gray-800';
                        };

                        return (
                          <tr key={idx} className="border-b border-orange-100 hover:bg-orange-50">
                            <td className="px-3 py-2 font-bold text-gray-900">{caseItem.clave}</td>
                            <td className="px-3 py-2">
                              {caseItem.prioridad && (
                                <span className={`inline-block ${getPriorityColor(caseItem.prioridad)} font-bold px-2 py-1 rounded text-xs`}>
                                  {caseItem.prioridad}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {caseItem.nivelPrueba && (
                                <span className="inline-block bg-green-100 text-green-900 font-bold px-2 py-1 rounded text-xs border border-green-300">
                                  {caseItem.nivelPrueba}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-orange-700">{caseItem.failCount}</td>
                            <td className="px-3 py-2 text-xs">
                              {caseItem.tag0 ? (
                                <span className="inline-block bg-cyan-100 text-cyan-900 font-semibold px-2 py-1 rounded border border-cyan-300">
                                  {caseItem.tag0}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">–</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {caseItem.tag1 ? (
                                <span className="inline-block bg-purple-100 text-purple-900 font-semibold px-2 py-1 rounded border border-purple-300">
                                  {caseItem.tag1}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">–</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {caseItem.tag2 ? (
                                <span className="inline-block bg-indigo-100 text-indigo-900 font-semibold px-2 py-1 rounded border border-indigo-300">
                                  {caseItem.tag2}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">–</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {openTestCases > pendingCases.length && (
                    <div className="flex flex-col items-center gap-2 py-4 bg-gray-50 rounded-lg border border-gray-200 mt-3">
                      <p className="text-xs text-gray-600 font-medium">
                        ... and {openTestCases - pendingCases.length} more cases ({openRecords - pendingCases.reduce((sum, c) => sum + c.failCount, 0)} more failures)
                      </p>
                      <button 
                        onClick={() => {
                          // Placeholder para cargar más registros
                          console.log('Load more records');
                        }}
                        className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded hover:bg-orange-700 transition-colors"
                      >
                        Load More Cases
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Single Execution Failures - Can't be tracked */}
          {unresolvedSingle > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Single Execution Failures ({unresolvedSingle} Untrackable)
              </h3>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <p className="text-xs text-red-700 font-semibold">Single Fail Cases</p>
                  <p className="text-2xl font-bold text-red-600">{unresolvedSingle}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <p className="text-xs text-red-700 font-semibold">Status</p>
                  <p className="text-sm font-bold text-red-700">No Re-execution</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800 mb-3">
                  <strong>{unresolvedSingle}</strong> case{unresolvedSingle !== 1 ? "s" : ""} appear with only <strong>one Fail</strong> in the execution history. 
                  Without a second execution, resolution time cannot be calculated.
                </p>
                <div className="text-xs text-red-700 space-y-1">
                  <p className="font-semibold">Possible scenarios:</p>
                  <ul className="list-disc list-inside space-y-1 ml-1">
                    <li>Recently reported and not yet re-executed</li>
                    <li>Cases marked as abandoned or skipped</li>
                    <li>Data collection gaps or manual test records</li>
                  </ul>
                </div>
              </div>

              {unresolvedSingleCases.length > 0 && (
                <div className="space-y-2">
                  {unresolvedSingleCases.map((caseItem, idx) => (
                    <div 
                      key={idx} 
                      className="bg-white border border-red-100 rounded-lg p-3 hover:bg-red-50 transition-colors cursor-default"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 text-sm">{caseItem.clave}</p>
                          <p className="text-xs text-gray-600 mt-1">Single Fail record (no re-execution)</p>
                        </div>
                        <div className="text-right">
                          <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full">
                            1x
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {unresolvedSingle > unresolvedSingleCases.length && (
                    <div className="text-center py-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 font-medium">
                        ... and {unresolvedSingle - unresolvedSingleCases.length} more untrackable cases
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 rounded-b-xl border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResolutionTimeModal;

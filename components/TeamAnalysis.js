// TeamAnalysis.js - Reporter / Reportado analysis
import React, { useMemo, useState, useEffect } from 'react';
import { Users, CheckCircle2, XCircle, AlertCircle, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';

export default function TeamAnalysis({ data, tag0Filter = '', dateFilter = {}, priorityFilter = '', statusFilter = '', testTypeFilter = '', attributeFilter = '', testLevelFilter = '', ambienteFilter = '' }) {
  const { testerData: testerDataFromProp = [] } = data || {};

  const [fetchedTesters, setFetchedTesters] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch from /api/testers-data, applying active filters
  const fromDate = dateFilter?.from || '';
  const toDate   = dateFilter?.to   || '';

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tag0Filter)      params.set('tag0',      tag0Filter);
    if (fromDate)        params.set('from',      fromDate);
    if (toDate)          params.set('to',        toDate);
    if (priorityFilter)  params.set('priority',  priorityFilter);
    if (statusFilter)    params.set('status',    statusFilter);
    if (testTypeFilter)  params.set('testType',  testTypeFilter);
    if (attributeFilter) params.set('attribute', attributeFilter);
    if (testLevelFilter) params.set('testLevel', testLevelFilter);
    if (ambienteFilter)  params.set('ambiente',  ambienteFilter);
    const qs = params.toString();
    fetch(`/api/testers-data${qs ? '?' + qs : ''}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setFetchedTesters(d?.testersData || []))
      .catch(() => setFetchedTesters([]))
      .finally(() => setLoading(false));
  }, [tag0Filter, fromDate, toDate, priorityFilter, statusFilter, testTypeFilter, attributeFilter, testLevelFilter, ambienteFilter]);

  // Always use fetched data (it respects active filters)
  const testerData = fetchedTesters || testerDataFromProp;

  const [sortBy, setSortBy]       = useState('total');
  const [sortOrder, setSortOrder] = useState('desc');

  // Normalise: accept both raw-DB shape (from dal.js) and API-mapped shape
  const testers = useMemo(() => {
    return (testerData || []).map(t => ({
      name:        t.name        || t.tester        || '—',
      total:       t.totalTests  ?? t.total_bugs     ?? 0,
      passed:      t.passed      ?? 0,
      failed:      t.failed      ?? 0,
      notExecuted: t.notExecuted ?? t.not_executed   ?? 0,
      inProgress:  t.inProgress  ?? t.in_progress    ?? 0,
      blocked:     t.blocked     ?? 0,
      sprints:     t.sprintsInvolved ?? t.sprints_involved ?? 0,
      products:    typeof t.products === 'string'
                     ? t.products.split(',').map(p => p.trim()).filter(Boolean)
                     : Array.isArray(t.products) ? t.products : [],
    }));
  }, [testerData]);

  const sorted = useMemo(() => {
    const copy = [...testers];
    copy.sort((a, b) => {
      const av = a[sortBy] ?? 0;
      const bv = b[sortBy] ?? 0;
      if (typeof av === 'string') return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortOrder === 'asc' ? av - bv : bv - av;
    });
    return copy;
  }, [testers, sortBy, sortOrder]);

  const toggle = (col) => {
    if (sortBy === col) setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortOrder('desc'); }
  };

  const Th = ({ col, label }) => (
    <th
      onClick={() => toggle(col)}
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
    >
      <div className="flex items-center gap-1">
        {label}
        {sortBy === col
          ? (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
          : <span className="w-3 h-3 inline-block" />}
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="executive-card p-10 text-center">
        <Loader2 className="w-10 h-10 text-indigo-400 mx-auto mb-3 animate-spin" />
        <p className="text-gray-500 text-sm">Loading reporter data…</p>
      </div>
    );
  }

  if (!testers.length) {
    return (
      <div className="executive-card p-10 text-center bg-amber-50 border-2 border-amber-200">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-amber-900 mb-2">No reporter data available</h3>
        <p className="text-amber-700 text-sm">No records were found for the current filter selection.</p>
      </div>
    );
  }

  const totalTesters = testers.length;
  const totalTests   = testers.reduce((s, t) => s + t.total,  0);
  const totalPassed  = testers.reduce((s, t) => s + t.passed, 0);
  const totalFailed  = testers.reduce((s, t) => s + t.failed, 0);
  const overallPass  = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="executive-card text-center py-5">
          <Users className="w-7 h-7 text-indigo-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{totalTesters}</div>
          <div className="text-xs text-gray-500 mt-1">Reporters</div>
        </div>
        <div className="executive-card text-center py-5">
          <CheckCircle2 className="w-7 h-7 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{totalTests.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Total Executions</div>
        </div>
        <div className="executive-card text-center py-5">
          <CheckCircle2 className="w-7 h-7 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-green-600">{totalPassed.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Passed</div>
        </div>
        <div className="executive-card text-center py-5">
          <XCircle className="w-7 h-7 text-red-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-red-600">{totalFailed.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Failed</div>
        </div>
      </div>

      {/* Reporter Table */}
      <div className="executive-card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Reporter Performance</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Based on the <strong>Reported By</strong> field — click any column header to sort
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th col="name"        label="Reporter" />
                <Th col="total"       label="Total" />
                <Th col="passed"      label="Pass" />
                <Th col="failed"      label="Fail" />
                <Th col="notExecuted" label="Not Exec." />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Products
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((t, i) => {
                return (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                          {t.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-800">
                      {t.total.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                      {t.passed.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-red-600">
                      {t.failed.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {t.notExecuted.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {t.products.length > 0
                          ? t.products.map((p, j) => (
                              <span key={j} className="inline-block px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {p}
                              </span>
                            ))
                          : <span className="text-xs text-gray-400">—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

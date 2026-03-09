import { BarChart3, Target, CheckCircle, AlertTriangle, Activity, Bug, Clock, TrendingDown, Settings, TrendingUp, Calendar, X } from 'lucide-react';
// ExecutiveDashboard.js - Refactorizado y alineado
// Main dashboard component, normalized with SQL/CSV structure
// Todas las variables, cálculos y referencias actualizadas
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import ExecutiveRecommendations from './ExecutiveRecommendations';
import QualityMetrics from './QualityMetrics';
import DetailModal from './DetailModal';
import ResolutionTimeModal from './ResolutionTimeModal';
import SprintComparison from './SprintComparison';
import ActionableRecommendations from './ActionableRecommendations';
import SettingsMenu from './SettingsMenu';
import { QADataProcessor } from '../utils/dataProcessor'; // Nueva importación
import { useDashboardData } from '../hooks/useDashboardData'; // Importar el nuevo hook
import KPICard from './KPICard';
import UnderConstructionCard from './UnderConstructionCard';
import SprintTrendChart from './SprintTrendChart';
import ModuleAnalysis from './ModuleAnalysis';

// Convierte "MM-YYYY" → YYYYMM numérico para ordenamiento cronológico correcto cross-year
// Ej: "01-2026" → 202601, "12-2025" → 202512
const parseMonthKey = (k) => {
  const p = (k || '').split('-');
  return p.length === 2 ? parseInt(p[1], 10) * 100 + parseInt(p[0], 10) : 0;
};
const sortMonthKeys = (a, b) => parseMonthKey(a) - parseMonthKey(b);
// Convierte "MM-YYYY" → "Mon YYYY" legible (e.g. "08-2025" → "Aug 2025")
const formatMonth = (k) => {
  if (!k) return k;
  const p = k.split('-');
  if (p.length !== 2) return k;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const m = parseInt(p[0], 10) - 1;
  return `${months[m] || p[0]} ${p[1]}`;
};
import DeveloperAnalysis from './DeveloperAnalysis';
import TeamAnalysis from './TeamAnalysis';
import dynamic from 'next/dynamic';
const QualityRadarChart = dynamic(() => import('../ANterior/QualityRadarChart'), { ssr: false });

export default function ExecutiveDashboard({ 
  // Original props
  data: externalData, 
  lastUpdated: externalLastUpdated, 
  onRefresh: externalOnRefresh, 
  loading: externalLoading,
  
  // New props for parametric mode
  dataSource = '/api/qa-data',
  configSource = '/api/config',
  refreshInterval = 300000
}) {
  // Original states
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // New states for parametric mode
  const [parametricData, setParametricData] = useState(null);
  const [config, setConfig] = useState(null);
  const [parametricLoading, setParametricLoading] = useState(false);
  const [parametricLastUpdated, setParametricLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [useParametricMode, setUseParametricMode] = useState(false);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [kpiOrder, setKpiOrder] = useState([
    'cobertura',
    'matrizRiesgo',
    'densidad',
    'bugsCriticos',
    'criticosPendientes',
    'tiempoSolucion',
    'velocidadFixes',
    'bugLeakage',
    'completitud',
    'automatizacion'
  ]);
  // Global detail modal state so any tab can open the same modal
  const [detailModal, setDetailModal] = useState(null);
  
  // Resolution Time Modal state
  const [openResolutionModal, setOpenResolutionModal] = useState(false);

  // Leak Rate by Product state
  const [leakRateByProduct, setLeakRateByProduct] = useState([]);
  const [leakRateLoading, setLeakRateLoading] = useState(false);

  // Date range filter
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });

  // Tag0 (product) filter
  const [tag0Filter, setTag0Filter] = useState('');
  const [availableTag0s, setAvailableTag0s] = useState([]);
  const [tag0Data, setTag0Data] = useState(null);
  const [tag0Loading, setTag0Loading] = useState(false);
  // Resolution time data filtered by both tag0 + date range (undefined = fallback to base)
  const [filteredResolutionTime, setFilteredResolutionTime] = useState(undefined);

  // Priority and Status filters
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [availablePriorities, setAvailablePriorities] = useState([]);
  const [availableStatuses, setAvailableStatuses] = useState([]);

  // Test Type, Attribute, Test Level, Environment filters
  const [testTypeFilter, setTestTypeFilter] = useState('');
  const [attributeFilter, setAttributeFilter] = useState('');
  const [testLevelFilter, setTestLevelFilter] = useState('');
  const [ambienteFilter, setAmbienteFilter] = useState('');
  const [availableTestTypes, setAvailableTestTypes] = useState([]);
  const [availableAttributes, setAvailableAttributes] = useState([]);
  const [availableTestLevels, setAvailableTestLevels] = useState([]);
  const [availableAmbientes, setAvailableAmbientes] = useState([]);

  // Tooltip state for sprint details (rendered via portal to avoid clipping)
  const [tooltipInfo, setTooltipInfo] = useState({ visible: false, sprint: null, sprintData: null, rect: null });

  // Cargar configuración para modo paramétrico
  const loadConfiguration = useCallback(async () => {
    try {
      const response = await fetch(configSource);
      if (response.ok) {
        const configData = await response.json();
        let finalConfig = configData;
        try {
          if (typeof window !== 'undefined') {
            const persisted = localStorage.getItem('qa-config');
            if (persisted) {
              const parsed = JSON.parse(persisted);
              finalConfig = { ...configData, ...parsed };
            }
          }
        } catch (e) {
          console.warn('Failed to merge persisted config:', e);
        }
        setConfig(finalConfig);
        if (finalConfig.autoRefresh !== undefined) setAutoRefresh(finalConfig.autoRefresh);
        if (finalConfig.useParametricMode !== undefined) setUseParametricMode(finalConfig.useParametricMode);
        return;
      }
      if (typeof window !== 'undefined') {
        const persisted = localStorage.getItem('qa-config');
        if (persisted) {
          const configData = JSON.parse(persisted);
          setConfig(configData);
          if (configData.autoRefresh !== undefined) setAutoRefresh(configData.autoRefresh);
          if (configData.useParametricMode !== undefined) setUseParametricMode(configData.useParametricMode);
          return;
        }
      }
      console.warn('Using default configuration: remote not available');
      setConfig({ autoRefresh: true, refreshInterval: 300000, useParametricMode: true, weights: { resolutionRate: 0.3, testCoverage: 0.25, bugDensity: 0.2, criticalBugs: 0.25 }, thresholds: { criticalBugsAlert: 20, maxBugsDeveloper: 15, criticalModulePercentage: 60 } });
    } catch (error) {
      try {
        if (typeof window !== 'undefined') {
          const persisted = localStorage.getItem('qa-config');
          if (persisted) {
            const configData = JSON.parse(persisted);
            setConfig(configData);
            if (configData.autoRefresh !== undefined) setAutoRefresh(configData.autoRefresh);
            if (configData.useParametricMode !== undefined) setUseParametricMode(configData.useParametricMode);
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to load persisted config:', e);
      }
      console.warn('Using default configuration:', error);
      setConfig({ autoRefresh: true, refreshInterval: 300000, useParametricMode: true, weights: { resolutionRate: 0.3, testCoverage: 0.25, bugDensity: 0.2, criticalBugs: 0.25 }, thresholds: { criticalBugsAlert: 20, maxBugsDeveloper: 15, criticalModulePercentage: 60 } });
    }
  }, [configSource]);

  useEffect(() => {
    loadConfiguration();
    const onConfigUpdated = () => loadConfiguration();
    if (typeof window !== 'undefined') window.addEventListener('config:updated', onConfigUpdated);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('config:updated', onConfigUpdated);
    };
  }, [loadConfiguration]);

  useEffect(() => {
    if (!externalData) setUseParametricMode(true);
  }, [externalData]);

  // Filter options are loaded by the useDashboardData hook

  const showSprintTooltip = (e, sprintKey, sprintData) => {
    try {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipInfo({ visible: true, sprint: sprintKey, sprintData, rect });
    } catch (err) {
      // ignore
    }
  };

  const hideSprintTooltip = () => {
    setTooltipInfo({ visible: false, sprint: null, sprintData: null, rect: null });
  };

  // Determinar qué datos usar (debe estar ANTES de los useEffects que lo usan)
  const isParametricMode = useParametricMode && !externalData;
  const currentData = isParametricMode ? parametricData : externalData;
  const currentLoading = isParametricMode ? parametricLoading : externalLoading;
  const currentLastUpdated = isParametricMode ? parametricLastUpdated : externalLastUpdated;

  // ===== Carga de datos paramétricos =====
  async function loadParametricData() {
    setParametricLoading(true);
    setError(null);
    try {
      const response = await fetch(dataSource);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rawData = await response.json();
      if (!rawData) return;

      // Construir summary enriquecido con los campos del nivel raíz que el dashboard espera
      const enrichedSummary = {
        // Campos propios del summary del JSON
        ...(rawData.summary || {}),
        // Mapear campos de nivel raíz al summary si no existen ya
        totalBugs:               rawData.summary?.totalBugs              ?? rawData.totalBugs              ?? 0,
        bugsClosed:              rawData.summary?.bugsClosed             ?? rawData.bugsClosed             ?? 0,
        bugsPending:             rawData.summary?.bugsPending            ?? rawData.pendingBugs            ?? 0,
        criticalBugs:            rawData.summary?.criticalBugs           ?? rawData.criticalBugs           ?? 0,
        testCasesTotal:          rawData.summary?.testCasesTotal         ?? rawData.testCasesTotal         ?? 0,
        testCasesExecuted:       rawData.summary?.testCasesExecuted      ?? rawData.testCasesExecuted      ?? 0,
        testCasesWithExecutions: rawData.summary?.testCasesWithExecutions ?? rawData.testCasesWithExecutions ?? 0,
        testCasesWithoutExecutions: rawData.summary?.testCasesWithoutExecutions ?? rawData.testCasesWithoutExecutions ?? 0,
        testCasesReused:         rawData.summary?.testCasesReused        ?? rawData.testCasesReused        ?? 0,
        testCasesUsed:           rawData.summary?.testCasesUsed          ?? rawData.testCasesUsed          ?? 0,
        testCasesNotUsed:        rawData.summary?.testCasesNotUsed       ?? rawData.testCasesNotUsed       ?? 0,
        testCasesReusedRate:     rawData.summary?.testCasesReusedRate    ?? rawData.testCasesReusedRate    ?? 0,
        testCasesUsedRate:       rawData.summary?.testCasesUsedRate      ?? rawData.testCasesUsedRate      ?? 0,
        testCasesNotUsedRate:    rawData.summary?.testCasesNotUsedRate   ?? rawData.testCasesNotUsedRate   ?? 0,
        testCasesPlanned:        rawData.summary?.testCasesPlanned       ?? rawData.testCasesPlanned       ?? 0,
        testCasesEfficiency:     rawData.summary?.testCasesEfficiency    ?? rawData.testCasesEfficiency    ?? 0,
        testCasesExecutionRate:  rawData.summary?.testCasesExecutionRate ?? rawData.testCasesExecutionRate ?? 0,
        productionBugs:          rawData.summary?.productionBugs         ?? rawData.productionBugs         ?? 0,
      };

      // Calcular avgTestCasesPerMonth para el summary
      const months = Object.keys(rawData.testCasesByMonth || {}).length || 1;
      enrichedSummary.avgTestCasesPerMonth = enrichedSummary.testCasesTotal > 0
        ? Math.round(enrichedSummary.testCasesTotal / months)
        : 0;

      // Aplicar QADataProcessor para calcular kpis y alerts sobre los datos enriquecidos
      const dataForProcessor = { ...rawData, summary: enrichedSummary };
      let processedResult;
      if (config) {
        processedResult = QADataProcessor.processQAData(dataForProcessor, config);
      } else {
        processedResult = { ...dataForProcessor, kpis: {}, alerts: [], recommendations: [] };
      }
      // Asegurar que el summary enriquecido y los campos de nivel raíz estén en el resultado
      processedResult = { ...processedResult, summary: enrichedSummary };

      setParametricData(processedResult);
      setParametricLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading parametric data:', error);
      setError(error.message);
    } finally {
      setParametricLoading(false);
    }
  }

  // Cargar datos cuando el modo paramétrico está activo y hay configuración
  useEffect(() => {
    if (isParametricMode && config) {
      loadParametricData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isParametricMode, config, dataSource]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !isParametricMode) return;
    const interval = setInterval(() => {
      if (isParametricMode) loadParametricData();
      else if (externalOnRefresh) externalOnRefresh();
    }, refreshInterval);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, isParametricMode, refreshInterval]);

  // ===== Centralized Data & Filter Logic =====
  const { 
    processedData, 
  } = useDashboardData(isParametricMode ? parametricData : externalData);

  // Cargar opciones de filtros en cascada: se recalculan cuando cambia cualquier filtro activo.
  // Para cada dimensión, las opciones reflejan los valores disponibles dadas las OTRAS selecciones.
  useEffect(() => {
    const params = new URLSearchParams();
    if (tag0Filter)      params.set('product',   tag0Filter);
    if (priorityFilter)  params.set('priority',  priorityFilter);
    if (statusFilter)    params.set('status',    statusFilter);
    if (testTypeFilter)  params.set('testType',  testTypeFilter);
    if (attributeFilter) params.set('attribute', attributeFilter);
    if (testLevelFilter) params.set('testLevel', testLevelFilter);
    if (ambienteFilter)  params.set('ambiente',  ambienteFilter);
    fetch(`/api/filter-options?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        if (d.products)    setAvailableTag0s(d.products);
        if (d.priorities)  setAvailablePriorities(d.priorities);
        if (d.statuses)    setAvailableStatuses(d.statuses);
        if (d.testTypes)   setAvailableTestTypes(d.testTypes);
        if (d.attributes)  setAvailableAttributes(d.attributes);
        if (d.testLevels)  setAvailableTestLevels(d.testLevels);
        if (d.ambientes)   setAvailableAmbientes(d.ambientes);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag0Filter, priorityFilter, statusFilter, testTypeFilter, attributeFilter, testLevelFilter, ambienteFilter]);

  // Cargar datos filtrados cuando cambia cualquier filtro no-fecha
  useEffect(() => {
    const hasFilter = tag0Filter || priorityFilter || statusFilter || testTypeFilter || attributeFilter || testLevelFilter || ambienteFilter;
    if (!hasFilter) { setTag0Data(null); return; }
    setTag0Loading(true);
    const params = new URLSearchParams();
    if (tag0Filter)      params.set('product',   tag0Filter);
    if (priorityFilter)  params.set('priority',  priorityFilter);
    if (statusFilter)    params.set('status',    statusFilter);
    if (testTypeFilter)  params.set('testType',  testTypeFilter);
    if (attributeFilter) params.set('attribute', attributeFilter);
    if (testLevelFilter) params.set('testLevel', testLevelFilter);
    if (ambienteFilter)  params.set('ambiente',  ambienteFilter);
    fetch(`/api/qa-data-filtered?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setTag0Data(d || null); })
      .catch(() => { setTag0Data(null); })
      .finally(() => setTag0Loading(false));
  }, [tag0Filter, priorityFilter, statusFilter, testTypeFilter, attributeFilter, testLevelFilter, ambienteFilter]);

  // Cargar datos de resolution time filtrados cuando cambian filtros de producto o fecha
  useEffect(() => {
    const { from, to } = dateFilter;
    // Si no hay ningún filtro activo, limpiar el override
    if (!tag0Filter && !from && !to) {
      setFilteredResolutionTime(undefined);
      return;
    }
    const params = new URLSearchParams();
    if (tag0Filter) params.set('tag0', tag0Filter);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    fetch(`/api/resolution-time-filtered?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setFilteredResolutionTime(d?.resolutionTimeData ?? null))
      .catch(() => setFilteredResolutionTime(null));
  }, [tag0Filter, dateFilter.from, dateFilter.to]);

  // Base data con override de tag0 (antes de filtro de fechas)
  const tag0BaseData = useMemo(() => {
    if (!processedData) return processedData;
    const hasFilter = tag0Filter || priorityFilter || statusFilter || testTypeFilter || attributeFilter || testLevelFilter || ambienteFilter;
    if (!hasFilter || !tag0Data) return processedData;

    // Recomputar executionSummary para el producto seleccionado
    const bm  = tag0Data.bugsByMonth     || {};
    const tcm = tag0Data.testCasesByMonth || {};
    const exTotal    = Object.values(tcm).reduce((a, m) => a + (m.executed    || 0), 0);
    const exPassed   = Object.values(tcm).reduce((a, m) => a + (m.passed      || 0), 0);
    const exFailed   = Object.values(tcm).reduce((a, m) => a + (m.failed      || 0), 0);
    const exNotExec  = Object.values(tcm).reduce((a, m) => a + (m.notExecuted || 0), 0);
    const exInProg   = Object.values(tcm).reduce((a, m) => a + (m.inProgress  || 0), 0);
    const exBlocked  = Object.values(tcm).reduce((a, m) => a + (m.blocked     || 0), 0);
    const exPlanned  = Object.values(tcm).reduce((a, m) => a + (m.planned     || 0), 0);
    const exNotRun   = Math.max(0, exPlanned - exTotal);

    return {
      ...processedData,
      bugsByMonth: bm,
      testCasesByMonth: tcm,
      summary: { ...processedData.summary, ...(tag0Data.summary || {}) },
      bugsByPriority: tag0Data?.bugsByPriority || processedData?.bugsByPriority,
      executionSummary: {
        total_executions: exTotal,
        passed:           exPassed,
        failed:           exFailed,
        not_executed:     exNotExec + exNotRun,
        in_progress:      exInProg,
        blocked:          exBlocked,
      },
      // resolutionTimeData virá overrideado por filteredResolutionTime en filteredData
      resolutionTimeData: tag0Data?.resolutionTimeData || processedData?.resolutionTimeData,
    };
  }, [processedData, tag0Filter, priorityFilter, statusFilter, testTypeFilter, attributeFilter, testLevelFilter, ambienteFilter, tag0Data]);

  // Meses disponibles derivados de los datos procesados
  const availableMonths = useMemo(() => {
    if (!tag0BaseData) return [];
    const allMonths = new Set([
      ...Object.keys(tag0BaseData.bugsByMonth || {}),
      ...Object.keys(tag0BaseData.testCasesByMonth || {}),
    ]);
    return Array.from(allMonths).sort(sortMonthKeys);
  }, [tag0BaseData]);

  // Datos filtrados por rango de fechas
  const filteredData = useMemo(() => {
    if (!tag0BaseData) return tag0BaseData;
    const { from, to } = dateFilter;
    if (!from && !to) return tag0BaseData;

    const isInRange = (month) => {
      const mVal = parseMonthKey(month);
      const fVal = from ? parseMonthKey(from) : 0;
      const tVal = to   ? parseMonthKey(to)   : Infinity;
      return mVal >= fVal && mVal <= tVal;
    };

    const filteredBugsByMonth = Object.fromEntries(
      Object.entries(tag0BaseData.bugsByMonth || {}).filter(([k]) => isInRange(k))
    );
    const filteredTestCasesByMonth = Object.fromEntries(
      Object.entries(tag0BaseData.testCasesByMonth || {}).filter(([k]) => isInRange(k))
    );
    const filteredBugsByMonthByPriority = Object.fromEntries(
      Object.entries(tag0BaseData.bugsByMonthByPriority || {}).filter(([k]) => isInRange(k))
    );
    const filteredExecutionRateByMonth = Object.fromEntries(
      Object.entries(tag0BaseData.executionRateByMonth || {}).filter(([k]) => isInRange(k))
    );
    const filteredSprintData = (tag0BaseData.sprintData || []).filter(
      s => s.sprint && isInRange(s.sprint)
    );

    // Recomputar totales del summary desde los meses filtrados
    const totalBugs = Object.values(filteredBugsByMonth).reduce((acc, m) => acc + (m.count || 0), 0);
    const testCasesExecuted = Object.values(filteredTestCasesByMonth).reduce((acc, m) => acc + (m.executed || 0), 0);
    const testCasesTotal = Object.values(filteredTestCasesByMonth).reduce((acc, m) => acc + (m.planned || 0), 0);
    const numMonths = Object.keys(filteredTestCasesByMonth).length || 1;

    const filteredSummary = {
      ...tag0BaseData.summary,
      totalBugs,
      testCasesTotal,
      testCasesExecuted,
      testCasesWithExecutions: testCasesExecuted,
      avgTestCasesPerMonth: numMonths > 0 ? Math.round(testCasesTotal / numMonths) : 0,
    };

    // Recomputar executionSummary desde los meses filtrados
    const filtExTotal   = Object.values(filteredTestCasesByMonth).reduce((a, m) => a + (m.executed    || 0), 0);
    const filtExPassed  = Object.values(filteredTestCasesByMonth).reduce((a, m) => a + (m.passed      || 0), 0);
    const filtExFailed  = Object.values(filteredTestCasesByMonth).reduce((a, m) => a + (m.failed      || 0), 0);
    const filtExNotExec = Object.values(filteredTestCasesByMonth).reduce((a, m) => a + (m.notExecuted || 0), 0);
    const filtExInProg  = Object.values(filteredTestCasesByMonth).reduce((a, m) => a + (m.inProgress  || 0), 0);
    const filtExBlocked = Object.values(filteredTestCasesByMonth).reduce((a, m) => a + (m.blocked     || 0), 0);
    const filtExPlanned = Object.values(filteredTestCasesByMonth).reduce((a, m) => a + (m.planned     || 0), 0);
    const filtExNotRun  = Math.max(0, filtExPlanned - filtExTotal);
    const filteredExecutionSummary = {
      total_executions: filtExTotal,
      passed:           filtExPassed,
      failed:           filtExFailed,
      not_executed:     filtExNotExec + filtExNotRun,
      in_progress:      filtExInProg,
      blocked:          filtExBlocked,
    };

    // resolutionTimeData: si filteredResolutionTime está definido úsalo, si no fall back al base
    const filteredResolutionTimeData = filteredResolutionTime !== undefined
      ? filteredResolutionTime
      : (tag0BaseData?.resolutionTimeData ?? null);

    return {
      ...tag0BaseData,
      summary: filteredSummary,
      executionSummary: filteredExecutionSummary,
      bugsByMonth: filteredBugsByMonth,
      testCasesByMonth: filteredTestCasesByMonth,
      bugsByMonthByPriority: filteredBugsByMonthByPriority,
      executionRateByMonth: filteredExecutionRateByMonth,
      sprintData: filteredSprintData,
      resolutionTimeData: filteredResolutionTimeData,
    };
  }, [tag0BaseData, dateFilter, filteredResolutionTime]);

  const handleRefresh = () => {
    if (isParametricMode) {
      loadParametricData();
    } else if (externalOnRefresh) {
      externalOnRefresh();
    }
  };

  if (!processedData && currentLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-xl mb-4">📊</div>
            <p className="text-gray-600 mb-4">Loading Dashboard Data...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-executive-600 mx-auto"></div>
          </div>
        </div>
      </>
    );
  }

  if (!processedData) return null;

  const { 
    kpis, 
    summary, 
    alerts,
    bugs,
    sprintData,
    bugsByModule,
    bugsByPriority,
    developerData,
    bugsByCategory,
  } = processedData;

  const tabs = [
    { id: 'overview', label: 'Executive Summary', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'teams', label: 'Team Analysis', icon: <Activity className="w-4 h-4" /> },
    { id: 'roadmap', label: 'Quality Radar', icon: <Target className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f6fd] via-white to-[#f8f6fd]">
      {/* Sprint tooltip portal (rendered at document.body) */}
      {typeof document !== 'undefined' && tooltipInfo.visible && tooltipInfo.rect && createPortal(
        <div
          style={{
            position: 'fixed',
            left: Math.max(8, tooltipInfo.rect.left),
            top: tooltipInfo.rect.bottom + 8,
            zIndex: 9999,
            width: 260,
          }}
        >
          <div className="bg-gray-900 text-white text-xs rounded-md p-2 shadow-lg">
            <div className="font-semibold mb-1">{tooltipInfo.sprint}</div>
            {tooltipInfo.sprintData ? (
              <div className="text-xs space-y-1">
                <div>📅 {tooltipInfo.sprintData.startDate || 'N/A'}</div>
                <div>💻 {tooltipInfo.sprintData.version || 'N/A'}</div>
                <div>🌎 {tooltipInfo.sprintData.environment || 'N/A'}</div>
                <div>🏷️ {tooltipInfo.sprintData.tags || 'N/A'}</div>
                <div className="border-t border-gray-700 pt-1 mt-1">🐞 {tooltipInfo.sprintData.bugs || 0} • 🧪 {tooltipInfo.sprintData.testCases || 0}</div>
              </div>
            ) : (
              <div className="text-xs">No additional information</div>
            )}
          </div>
        </div>
      , document.body)}
      {/* Header mejorado con branding */}
      <div className="bg-white/90 backdrop-blur-md shadow-lg border-b sticky top-0 z-40" style={{ borderColor: '#e0e0e0' }}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo y Título */}
            <div className="flex items-center space-x-6">
              {/* Logo Absencesoft */}
              <div className="flex-shrink-0">
                <Image
                  src="/Absencesoft.jpg"
                  alt="Absencesoft"
                  width={203}
                  height={62}
                  className="h-16 w-auto object-contain"
                />
              </div>

              {/* Separador */}
              <div className="hidden md:block h-12 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent"></div>

              {/* Logo Abstracta */}
              <div className="flex-shrink-0">
                <Image
                  src="/abstracta.png"
                  alt="Abstracta.us"
                  width={50}
                  height={50}
                  className="h-10 w-auto"
                />
              </div>
              
              {/* Separador */}
              <div className="hidden md:block h-12 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent"></div>
              
              {/* Título */}
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold" style={{ color: '#754bde' }}>
                    QA Executive Dashboard
                  </h1>
                  {/* Modo Paramétrico - Oculto temporalmente */}
                  {false && isParametricMode && (
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold rounded-full shadow-sm">
                      Modo Paramétrico
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium mt-0.5" style={{ color: '#80868d' }}>
                  Quality Control and Test Process Traceability
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Indicador de error */}
              {error && (
                <div className="flex items-center px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span className="text-xs font-medium">Connection Error</span>
                </div>
              )}
              
              {/* Última actualización */}
              <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-500 font-medium">Last reported Sprint</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">
                  {currentLastUpdated ? format(currentLastUpdated, 'MM/dd/yyyy HH:mm', { locale: enUS }) : 'Not reported'}
                </p>
              </div>
              
              <SettingsMenu 
                onRefresh={handleRefresh}
                loading={currentLoading}
              />
            </div>
          </div>
        </div>
      </div>

          {/* Critical Alerts (improved) */}
      {alerts && alerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-3 mb-3">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-3 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-1">
                  Critical Alerts ({alerts.filter(a => a.type === 'critical').length})
                </h3>
                <div className="space-y-1 text-sm">
                  {alerts.slice(0, 3).map((alert, index) => (
                    <div key={alert.id || index} className="flex items-start justify-between">
                      <p className="text-sm text-red-700 flex-1">
                        • {alert.message || alert.title}
                      </p>
                      {alert.action && (
                        <button className="text-xs text-red-600 hover:text-red-800 ml-3 underline">
                          {alert.action}
                        </button>
                      )}
                    </div>
                  ))}
                  {alerts.length > 3 && (
                    <p className="text-xs text-red-600 mt-1">
                      +{alerts.length - 3} additional alerts
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* ===== Date Range Filter Bar ===== */}
        {availableMonths.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-5 bg-white/70 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm border" style={{ borderColor: '#e0e0e0' }}>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
              <Calendar className="w-4 h-4" style={{ color: '#754bde' }} />
              <span>Period</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">From</label>
              <select
                value={dateFilter.from}
                onChange={e => setDateFilter(f => ({ ...f, from: e.target.value }))}
                className="text-sm border rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#754bde' }}
              >
                <option value="">All</option>
                {availableMonths
                  .filter(m => !dateFilter.to || parseMonthKey(m) <= parseMonthKey(dateFilter.to))
                  .map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">To</label>
              <select
                value={dateFilter.to}
                onChange={e => setDateFilter(f => ({ ...f, to: e.target.value }))}
                className="text-sm border rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#754bde' }}
              >
                <option value="">All</option>
                {availableMonths
                  .filter(m => !dateFilter.from || parseMonthKey(m) >= parseMonthKey(dateFilter.from))
                  .map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
              </select>
            </div>

            {/* Separator */}
            {availableTag0s.length > 0 && (
              <div className="h-5 w-px bg-gray-200 mx-1" />
            )}

            {/* Tag0 / Product filter */}
            {availableTag0s.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 font-semibold">Product</label>
                <select
                  value={tag0Filter}
                  onChange={e => { setTag0Filter(e.target.value); setDateFilter({ from: '', to: '' }); }}
                  disabled={tag0Loading}
                  className="text-sm border rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#754bde' }}
                >
                  <option value="">All products</option>
                  {availableTag0s.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}

            {/* Priority filter */}
            {availablePriorities.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 font-semibold">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={e => setPriorityFilter(e.target.value)}
                  disabled={tag0Loading}
                  className="text-sm border rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#754bde' }}
                >
                  <option value="">All priorities</option>
                  {availablePriorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}

            {/* Status filter */}
            {availableStatuses.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 font-semibold">Status</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  disabled={tag0Loading}
                  className="text-sm border rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#754bde' }}
                >
                  <option value="">All statuses</option>
                  {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {/* Test Type filter */}
            {availableTestTypes.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 font-semibold">Test Type</label>
                <select
                  value={testTypeFilter}
                  onChange={e => setTestTypeFilter(e.target.value)}
                  disabled={tag0Loading}
                  className="text-sm border rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#754bde' }}
                >
                  <option value="">All types</option>
                  {availableTestTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            {/* Attribute (Module) filter */}
            {availableAttributes.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 font-semibold">Module</label>
                <select
                  value={attributeFilter}
                  onChange={e => setAttributeFilter(e.target.value)}
                  disabled={tag0Loading}
                  className="text-sm border rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#754bde' }}
                >
                  <option value="">All modules</option>
                  {availableAttributes.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            )}

            {/* Test Level filter */}
            {availableTestLevels.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 font-semibold">Level</label>
                <select
                  value={testLevelFilter}
                  onChange={e => setTestLevelFilter(e.target.value)}
                  disabled={tag0Loading}
                  className="text-sm border rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#754bde' }}
                >
                  <option value="">All levels</option>
                  {availableTestLevels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            )}

            {/* Environment (Browser) filter */}
            {availableAmbientes.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 font-semibold">Environment</label>
                <select
                  value={ambienteFilter}
                  onChange={e => setAmbienteFilter(e.target.value)}
                  disabled={tag0Loading}
                  className="text-sm border rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#754bde' }}
                >
                  <option value="">All environments</option>
                  {availableAmbientes.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            )}

            {tag0Loading && <span className="text-xs text-gray-400 animate-pulse">Loading...</span>}

            {(dateFilter.from || dateFilter.to || tag0Filter || priorityFilter || statusFilter || testTypeFilter || attributeFilter || testLevelFilter || ambienteFilter) && (
              <>
                <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: '#f0ebff', color: '#754bde' }}>
                  {[tag0Filter, priorityFilter, statusFilter, testTypeFilter, attributeFilter, testLevelFilter, ambienteFilter, dateFilter.from && formatMonth(dateFilter.from), dateFilter.to && formatMonth(dateFilter.to)].filter(Boolean).join(' \u00b7 ')}
                </span>
                <button
                  onClick={() => { setDateFilter({ from: '', to: '' }); setTag0Filter(''); setPriorityFilter(''); setStatusFilter(''); setTestTypeFilter(''); setAttributeFilter(''); setTestLevelFilter(''); setAmbienteFilter(''); }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 border rounded-md px-2 py-1 hover:bg-gray-50 transition-colors"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              </>
            )}
          </div>
        )}

        {/* Navegación por tabs con estilo moderno */}
        <div className="mb-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-2 shadow-sm border" style={{ borderColor: '#e0e0e0' }}>
            <nav className="flex space-x-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'text-white shadow-lg'
                      : 'hover:bg-[#f8f6fd]'
                  }`}
                  style={activeTab === tab.id ? {
                    background: '#754bde',
                    boxShadow: '0 10px 25px -5px rgba(117, 75, 222, 0.3)'
                  } : { color: '#80868d' }}
                >
                  <span className={`mr-2 ${
                    activeTab === tab.id ? 'text-white' : ''
                  }`} style={activeTab === tab.id ? {} : { color: '#b2b2b2' }}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Contenido por tabs */}
        <div className="animate-fade-in">
          {activeTab === 'overview' && (
            <OverviewTab
              data={filteredData}
              recommendations={recommendations}
              config={config}
              setDetailModal={setDetailModal}
              detailModal={detailModal}
              tooltipInfo={tooltipInfo}
              showSprintTooltip={showSprintTooltip}
              hideSprintTooltip={hideSprintTooltip}
              setTooltipInfo={setTooltipInfo}
              openResolutionModal={openResolutionModal}
              setOpenResolutionModal={setOpenResolutionModal}
            />
          )}
          {activeTab === 'quality' && <QualityTab data={filteredData} config={config} setDetailModal={setDetailModal} />}
          {activeTab === 'teams' && <TeamAnalysis data={filteredData} tag0Filter={tag0Filter} dateFilter={dateFilter} priorityFilter={priorityFilter} statusFilter={statusFilter} testTypeFilter={testTypeFilter} attributeFilter={attributeFilter} testLevelFilter={testLevelFilter} ambienteFilter={ambienteFilter} setDetailModal={setDetailModal} />}
          {/* trends tab removed */}
          {activeTab === 'roadmap' && (
            <div className="pb-6 w-full min-h-screen">
              <div className="bg-white rounded-lg shadow-lg p-6 h-full">
                <div style={{ height: '600px', width: '100%' }}>
                  <QualityRadarChart data={filteredData} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===============================
// TAB COMPONENTS (keep existing ones)
// ===============================

function OverviewTab({ 
  data, 
  recommendations, 
  config, 
  setDetailModal, 
  detailModal, 
  openResolutionModal, 
  setOpenResolutionModal
}) {
  // Extraer toda la data procesada del hook
  const { 
    kpis = {}, 
    summary = {}, 
    bugs = [],
    sprintData = [],
    bugsByMonth = {},
    testCasesByMonth = {},
    executionSummary = {},
    bugsByPriority = {},
    bugsByMonthByPriority = {},
    resolutionTimeData = {},
    executionRateByMonth = {},
    moduleData = {},
    developerData = {},
  } = data || {};

  // Helper para verificar si un KPI es visible
  const isKpiVisible = (kpiId) => {
    const visible = config?.visibleKpis?.overview;
    return !visible || !Array.isArray(visible) || visible.includes(kpiId);
  };

  // Labels para los gráficos de series de tiempo (meses)
  const monthLabels = useMemo(() => {
    const allMonthsSet = new Set([
      ...Object.keys(bugsByMonth),
      ...Object.keys(testCasesByMonth)
    ]);
    return Array.from(allMonthsSet).sort(sortMonthKeys);
  }, [bugsByMonth, testCasesByMonth]);

  // Series para gráficos
  const plannedSeries = useMemo(() => monthLabels.map(month => testCasesByMonth[month]?.planned || 0), [monthLabels, testCasesByMonth]);
  const executedSeries = useMemo(() => monthLabels.map(month => testCasesByMonth[month]?.executed || 0), [monthLabels, testCasesByMonth]);
  
  // Datos para la tarjeta de Tasa de Ejecución
  const executionRateData = useMemo(() => {
    const totalDesigned = summary?.testCasesTotal || 0;
    const totalWithExecutions = summary?.testCasesWithExecutions || 0;
    const executionRate = totalDesigned > 0 ? Math.round((totalWithExecutions / totalDesigned) * 100) : 0;
    return {
      avg: executionRate,
      completed: totalWithExecutions,
      total: totalDesigned,
      months: monthLabels.length || 0
    };
  }, [summary, monthLabels]);

  // Datos para la tarjeta de Densidad de Hallazgos
  const defectDensityData = useMemo(() => {
    const bugsPerMonth = monthLabels.map(m => bugsByMonth[m]?.count || 0);
    if (bugsPerMonth.length === 0) return { avg: 0, total: 0, max: 0, min: 0, months: 0 };
    
    const totalBugs = bugsPerMonth.reduce((acc, count) => acc + count, 0);
    const avgBugsPerMonth = totalBugs / bugsPerMonth.length;
    return {
      avg: Math.round(avgBugsPerMonth * 10) / 10,
      total: totalBugs,
      max: Math.max(...bugsPerMonth),
      min: Math.min(...bugsPerMonth),
      months: bugsPerMonth.length
    };
  }, [bugsByMonth, monthLabels]);

  // Datos para la tarjeta de Cobertura de Automatización (simulada)
  const automationData = useMemo(() => {
    const coverage = kpis.automationCoverage || 42;
    const totalTests = summary.testCasesTotal || 0;
    const automatedTests = Math.round(totalTests * (coverage / 100));
    const manualTests = totalTests - automatedTests;
    return {
      coverage,
      automated: automatedTests,
      manual: manualTests,
      total: totalTests,
    };
  }, [kpis.automationCoverage, summary.testCasesTotal]);
  
  return (
    <div className="space-y-8">
      
      
      {/* Coverage Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 1. COBERTURA: Media de Casos */}
        {isKpiVisible('cobertura') && (
          <KPICard
          title="Test Cases designed"
          value={
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{summary.testCasesTotal || 0}</div>
              <div className="text-xs text-gray-500 font-normal mt-0.5">Total Designed</div>
            </div>
          }
          icon={<Activity className="w-6 h-6 text-blue-600" />}
          trend={kpis.testCasesTrend || 0}
          status={summary.avgTestCasesPerMonth >= 170 ? "success" : "warning"}
          subtitle={
            <div className="flex items-center gap-2">
              <span>{monthLabels?.length || 0} months analyzed</span>
              <div className="flex-1 max-w-[200px] h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${summary.avgTestCasesPerMonth >= 170 ? 'bg-success-500' : 'bg-warning-500'}`}
                  style={{ width: `${Math.min((summary.avgTestCasesPerMonth / 170) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          }
          formula={`Average = ${summary.testCasesTotal || 0} / ${monthLabels?.length || 1} = ${summary.avgTestCasesPerMonth || 0}`}
          tooltip={
            <div>
              <div className="font-semibold text-sm text-gray-800 mb-1">What it measures</div>
              <div className="text-xs text-gray-600 mb-2">Average number of test cases designed per month (calculated from month-year data).</div>
              <div className="font-semibold text-sm text-gray-800 mb-1">Why it matters</div>
              <div className="text-xs text-gray-600">Measures the test planning and design capacity of the QA team on a monthly basis and helps identify trends in test case creation and specification.</div>
            </div>
          }
          onClick={() => {
            const { 
              testCasesReused = 0, testCasesUsed = 0, testCasesNotUsed = 0, 
              testCasesTotal = 0, testCasesReusedRate = 0, testCasesUsedRate = 0, 
              testCasesNotUsedRate = 0 
            } = summary;
            
            setDetailModal({
              type: 'testCases',
              title: 'Analysis of Test Cases designed by Month',
              data: {
                avg: summary.avgTestCasesPerMonth,
                total: testCasesTotal,
                months: monthLabels?.length || 0,
                plannedSeries: plannedSeries,
                executedSeries: executedSeries,
                testCasesTotal: testCasesTotal,
                testCasesReused: testCasesReused,
                testCasesUsed: testCasesUsed,
                testCasesNotUsed: testCasesNotUsed,
                reusedRate: testCasesReusedRate,
                usedRate: testCasesUsedRate,
                notUsedRate: testCasesNotUsedRate
              },
              sparklineData: plannedSeries,
              sprints: monthLabels.map(month => ({ sprint: month })),
              monthLabels: monthLabels
            })
          }}
          detailData={{ avg: summary.avgTestCasesPerMonth, total: summary.testCasesTotal }}
        />
        )}
        
        {/* 2. TEST EXECUTION SUMMARY: Total executions and state breakdown */}
        {isKpiVisible('testExecution') && (() => {
          const {
            total_executions = 0, passed = 0, failed = 0, 
            in_progress = 0, blocked = 0, not_executed = 0
          } = executionSummary;
          
          const successRate = total_executions > 0 ? Math.round((passed / total_executions) * 100) : 0;
          
          return (
            <KPICard
              title="Test Execution Summary"
              value={
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{total_executions}</div>
                    <div className="text-xs text-gray-500 font-normal mt-0.5">Total</div>
                  </div>
                  <div className="h-12 w-px bg-gray-200"></div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-success-600">{passed}</div>
                      <div className="text-xs text-gray-500 font-normal">Passed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-danger-600">{failed}</div>
                      <div className="text-xs text-gray-500 font-normal">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-warning-600">{not_executed}</div>
                      <div className="text-xs text-gray-500 font-normal">Not Run</div>
                    </div>
                  </div>
                </div>
              }
              icon={<Activity className="w-6 h-6 text-success-600" />}
              trend={successRate >= 90 ? 5 : successRate >= 80 ? 0 : -5}
              status={successRate >= 90 ? "success" : successRate >= 80 ? "warning" : "danger"}
              subtitle={
                <div className="flex items-center gap-2">
                  <span>{successRate}% success rate</span>
                  <div className="flex-1 max-w-[200px] h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${successRate >= 90 ? 'bg-success-500' : successRate >= 80 ? 'bg-warning-500' : 'bg-danger-500'}`}
                      style={{ width: `${successRate}%` }}
                    ></div>
                  </div>
                </div>
              }
              formula={`Success = ${passed} / ${total_executions} × 100 = ${successRate}%`}
              tooltip={
                <div>
                  <div className="font-semibold text-sm text-gray-800 mb-1">What it measures</div>
                  <div className="text-xs text-gray-600 mb-2">Summary of all test case executions: total test runs and breakdown by execution state (Passed, Failed, In Progress, Blocked, Not Executed).</div>
                  <div className="font-semibold text-sm text-gray-800 mb-1">Why it matters</div>
                  <div className="text-xs text-gray-600">Provides comprehensive view of test execution status and quality metrics across all test cases.</div>
                </div>
              }
              onClick={() => setDetailModal({
                type: 'testExecutionSummary',
                title: 'Test Execution Summary Analysis',
                data: {
                  ...executionSummary,
                  success_rate: successRate,
                  failure_rate: total_executions > 0 ? Math.round((failed / total_executions) * 100) : 0,
                  execution_progress: total_executions > 0 ? Math.round(((passed + failed + in_progress) / total_executions) * 100) : 0,
                  at_risk: in_progress + blocked + not_executed
                },
                sparklineData: monthLabels.map(month => (testCasesByMonth?.[month]?.executed || 0)),
                sprints: monthLabels.map(month => ({ sprint: month })),
                monthLabels: monthLabels
              })}
              detailData={{ passed, failed, total: total_executions }}
            />
          );
        })()}
        
        
        
        {/* 4. EXECUTION RATE */}
        {isKpiVisible('testExecutionRate') && (
          <KPICard
            title="Execution Rate"
            value={
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{executionRateData.avg || 0}%</div>
                  <div className="text-xs text-gray-500 font-normal mt-0.5">avg execution</div>
                </div>
                <div className="h-12 w-px bg-gray-200"></div>
                <div className="flex gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-xl font-semibold text-success-600">{executionRateData.completed}</div>
                    <div className="text-xs text-gray-500 font-normal">at least one execution</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-gray-600">{executionRateData.total}</div>
                    <div className="text-xs text-gray-500 font-normal">Total Designed</div>
                  </div>
                </div>
              </div>
            }
            icon={<Activity className="w-6 h-6 text-blue-600" />}
            trend={kpis.executionTrend || 0}
            status={executionRateData.avg >= 95 ? 'success' : executionRateData.avg >= 80 ? 'warning' : 'danger'}
            subtitle={
              <div className="flex items-center gap-2">
                <span>{executionRateData.months} months analyzed</span>
                <div className="flex-1 max-w-[200px] h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${executionRateData.avg >= 95 ? 'bg-success-500' : executionRateData.avg >= 80 ? 'bg-warning-500' : 'bg-danger-500'}`}
                    style={{ width: `${executionRateData.avg}%` }}
                  ></div>
                </div>
              </div>
            }
            formula={`Execution Rate = ${executionRateData.completed} / ${executionRateData.total} × 100 = ${executionRateData.avg}%`}
            tooltip={(
              <div>
                <div className="font-semibold text-sm text-gray-800 mb-1">What it measures</div>
                <div className="text-xs text-gray-600 mb-2">Percentage of test cases that have at least one execution out of total test cases designed.</div>
                <div className="font-semibold text-sm text-gray-800 mb-1">Why it matters</div>
                <div className="text-xs text-gray-600">Shows test coverage and execution progress; higher rates indicate more test cases are being executed.</div>
              </div>
            )}
            onClick={() => setDetailModal({
              type: 'testExecutionRate',
              title: 'Analysis of Execution Rate (Monthly Trend)',
              data: {
                ...executionRateData,
                executionRateByMonth: executionRateByMonth || {}
              },
              sparklineData: monthLabels.map(month => (executionRateByMonth?.[month]?.rate || 0)),
              sprints: monthLabels.map(month => ({ sprint: month })),
              monthLabels: monthLabels
            })}
            detailData={{ completed: executionRateData.completed, total: executionRateData.total }}
          />
        )}
      </div>

      {/* Main and tracking metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isKpiVisible('bugsCriticos') && (() => {
          const criticalCount = bugsByPriority?.['High']?.count || 0;
          const lowPriorityCount = bugsByPriority?.['Low']?.count || 0;
          const totalBugs = summary.totalBugs || 0;

          // Dynamic formula: iterate actual priorities with count > 0
          const formulaParts = Object.entries(bugsByPriority || {})
            .filter(([, v]) => (v?.count || 0) > 0)
            .map(([p, v]) => `${v.count} ${p}`);
          const formulaStr = formulaParts.length
            ? `Total = ${formulaParts.join(' + ')}`
            : `Total = 0`;

          return (
            <KPICard
              title="Findings Detected"
              value={
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-danger-600">{totalBugs}</div>
                    <div className="text-xs text-gray-500 font-normal mt-0.5">Total</div>
                  </div>
                  <div className="h-12 w-px bg-gray-200"></div>
                  <div className="flex gap-3 text-sm">
                    <div className="text-center">
                      <div className="text-xl font-semibold text-danger-600">{criticalCount}</div>
                      <div className="text-xs text-gray-500 font-normal">Critical</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-semibold text-blue-600">{lowPriorityCount}</div>
                      <div className="text-xs text-gray-500 font-normal">Low</div>
                    </div>
                  </div>
                </div>
              }
              icon={<Bug className="w-6 h-6 text-danger-600" />}
              trend={kpis.criticalBugsTrend || 0}
              status={(() => {
                // Status based on failure rate vs total executions (not raw count)
                const totalExec = executionSummary?.total_executions || 0;
                const failurePct = totalExec > 0 ? (totalBugs / totalExec) * 100 : 100;
                return failurePct <= 8 ? 'success' : failurePct <= 15 ? 'warning' : 'danger';
              })()}
              subtitle={
                <div className="flex items-center gap-2">
                  <span>Breakdown by priority level</span>
                </div>
              }
              formula={formulaStr}
              tooltip={
                <div>
                  <div className="font-semibold text-sm text-gray-800 mb-1">What it measures</div>
                  <div className="text-xs text-gray-600 mb-2">Total number of findings (bugs) detected, classified by priority level: High (critical), Medium, and Low priority.</div>
                  <div className="font-semibold text-sm text-gray-800 mb-1">Why it matters</div>
                  <div className="text-xs text-gray-600">Provides a complete overview of all issues and their severity levels, helping prioritize resolution efforts.</div>
                </div>
              }
              onClick={() => setDetailModal({
                type: 'criticalBugs',
                title: 'Analysis of Findings Detected',
                data: {
                  total: totalBugs,
                  critical: criticalCount,
                  medium: bugsByPriority?.['Medium']?.count || 0,
                  lowPriority: lowPriorityCount,
                  totalBugs: totalBugs,
                  allPriorities: bugsByPriority,
                  trendData: bugsByMonth,
                  trendDataByPriority: bugsByMonthByPriority
                },
                sparklineData: monthLabels.map(m => bugsByMonth[m]?.count || 0),
                sprints: monthLabels.map(m => ({sprint: m}))
              })}
              detailData={{ total: totalBugs, critical: criticalCount }}
            />
          );
        })()}
        {/* 2. PRODUCT QUALITY: Finding Density */}
        {isKpiVisible('densidad') && (
          <KPICard
          title="Finding Density per Month"
          value={
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{defectDensityData.avg}</div>
                <div className="text-xs text-gray-500 font-normal mt-0.5">findings/month</div>
              </div>
              <div className="h-12 w-px bg-gray-200"></div>
              <div className="flex gap-3 text-sm">
                <div className="text-center">
                  <div className="text-xl font-semibold text-gray-700">{defectDensityData.max}</div>
                  <div className="text-xs text-gray-500 font-normal">Max</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-semibold text-gray-700">{defectDensityData.min}</div>
                  <div className="text-xs text-gray-500 font-normal">Min</div>
                </div>
              </div>
            </div>
          }
          icon={<Target className="w-6 h-6 text-orange-600" />}
          trend={defectDensityData.avg <= 20 ? 5 : -5}
          status={defectDensityData.avg <= 20 ? "success" : defectDensityData.avg <= 30 ? "warning" : "danger"}
          subtitle={
            <div className="flex items-center gap-2">
              <span>{defectDensityData.total} findings in {defectDensityData.months} months</span>
            </div>
          }
          formula={`Average = ${defectDensityData.total} / ${defectDensityData.months} = ${defectDensityData.avg}`}
          tooltip={
            <div>
              <div className="font-semibold text-sm text-gray-800 mb-1">What it measures</div>
              <div className="text-xs text-gray-600 mb-2">Average findings detected per month. Target: ≤20 findings/month.</div>
              <div className="font-semibold text-sm text-gray-800 mb-1">Why it matters</div>
              <div className="text-xs text-gray-600">Indicates product quality over time; trends help identify improvements in development and testing processes.</div>
            </div>
          }
          onClick={() => {
            const densitySparkline = monthLabels.map(month => (bugsByMonth?.[month]?.count || 0));
            setDetailModal({
              type: 'defectDensity',
              title: 'Analysis of Finding Density per Month',
              data: defectDensityData,
              sparklineData: densitySparkline,
              sprints: monthLabels.map(month => ({ sprint: month })),
              monthLabels: monthLabels,
              bugsByPriority: bugsByPriority || {},
              bugsByModule: moduleData || []
            });
          }}
          detailData={defectDensityData}
        />
        )}
        
        {/* 3. VELOCITY: Average Resolution Time */}
        {isKpiVisible('tiempoSolucion') && resolutionTimeData && (
          <KPICard
            title="Average Resolution Time"
            value={
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{resolutionTimeData.average}</div>
                  <div className="text-xs text-gray-500 font-normal mt-0.5">days avg</div>
                </div>
                <div className="h-12 w-px bg-gray-200"></div>
                <div className="flex gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-xl font-semibold text-green-600">✅ {resolutionTimeData.resolvedRecords || 0}</div>
                    <div className="text-xs text-gray-500 font-normal">Resolved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-orange-600">❌ {resolutionTimeData.openRecords || 0}</div>
                    <div className="text-xs text-gray-500 font-normal">Open</div>
                  </div>
                </div>
              </div>
            }
            icon={<Clock className="w-6 h-6 text-purple-600" />}
            trend={resolutionTimeData.average <= 3 ? 5 : resolutionTimeData.average <= 7 ? 0 : -5}
            status={resolutionTimeData.average <= 3 ? 'success' : resolutionTimeData.average <= 7 ? 'warning' : 'danger'}
            subtitle={
              <div className="flex flex-col gap-2 w-full">
                <div className="text-xs text-gray-600">
                  <div className="font-semibold mb-2">
                    From {resolutionTimeData.totalFailureRecords || 0} failure records
                  </div>
                  <div className="text-gray-500">
                    Related to {resolutionTimeData.totalUniqueTestCases || 0} unique test cases
                  </div>
                </div>
              </div>
            }
            
            tooltip={
              <div>
                <div className="font-semibold text-sm text-gray-800 mb-1">What it measures</div>
                <div className="text-xs text-gray-600 mb-2">Average time in days from first failure to successful resolution across test cases with multiple execution attempts.</div>
                <div className="font-semibold text-sm text-gray-800 mb-1">Why it matters</div>
                <div className="text-xs text-gray-600">Indicates team efficiency in fixing defects and reworking test cases to successful execution.</div>
              </div>
            }
            onClick={() => setOpenResolutionModal(true)}
            detailData={{ avg: resolutionTimeData.average, count: resolutionTimeData.count }}
          />
        )}
        
        {/* 4. EFICIENCIA: Eficiencia de Resolución - OCULTO */}
        {/* Sección ocultada para resolución */}
      </div>

      {/* Comparación Sprint-over-Sprint */}
      <SprintComparison data={data} filteredSprintData={sprintData} />

      {/* Second row of additional metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Ficha 7: Tasa de Regresión - UNDER CONSTRUCTION */}
        {isKpiVisible('regressionRate') && (
          <UnderConstructionCard
            title="Regression Rate"
            value={
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">{kpis.regressionRate || 'N/A'}%</div>
                  <div className="text-xs text-gray-500 font-normal mt-0.5">regression</div>
                </div>
              </div>
            }
            icon={<TrendingDown className="w-6 h-6 text-orange-600" />}
            subtitle="Findings reopened after closure"
            help={(
              <div>
                <div className="font-semibold">What it measures:</div>
                <div className="text-xs">Percentage of findings reopened after closure.</div>
                <div className="font-semibold mt-2">Why it matters:</div>
                <div className="text-xs">Indicates correction quality; high rates suggest issues in resolution or insufficient testing.</div>
              </div>
            )}
          />
        )}
        {isKpiVisible('automatizacion') && (
          <UnderConstructionCard
          title="Automation Coverage"
          value={
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{automationData.coverage}%</div>
                <div className="text-xs text-gray-500 font-normal mt-0.5">coverage</div>
              </div>
              <div className="h-12 w-px bg-gray-200"></div>
              <div className="flex gap-3 text-sm">
                <div className="text-center">
                  <div className="text-xl font-semibold text-success-600">{automationData.automated}</div>
                  <div className="text-xs text-gray-500 font-normal">Automated</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-semibold text-gray-600">{automationData.manual}</div>
                  <div className="text-xs text-gray-500 font-normal">Manual</div>
                </div>
              </div>
            </div>
          }
          icon={<Settings className="w-6 h-6 text-purple-600" />}
          subtitle={
            <div className="flex items-center gap-2">
              <span>Test automation progress</span>
              <div className="flex-1 max-w-[200px] h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-purple-500"
                  style={{ width: `${automationData.coverage}%` }}
                ></div>
              </div>
            </div>
          }
          onClick={() => setDetailModal({
            type: 'automationCoverage',
            title: 'Automation Coverage Analysis',
            data: automationData,
            sparklineData: [],
            sprints: []
          })}
          help={(
            <div>
              <div className="font-semibold">What it measures:</div>
              <div className="text-xs">Percentage of tests executed automatically.</div>
              <div className="font-semibold mt-2">Why it matters:</div>
              <div className="text-xs">Shows how much test work can run without manual intervention, speeding up validations.</div>
            </div>
          )}
          />
        )}
        
        {((kpis && kpis.bugLeakageRate !== undefined) || summary.totalBugs > 0) && (
          <UnderConstructionCard
            title="Leak Rate"
            value={
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{kpis.bugLeakageRate || 'N/A'}%</div>
                <div className="text-xs text-gray-500 font-normal mt-0.5">leak rate</div>
              </div>
            }
            icon={<TrendingUp className="w-6 h-6 text-red-600" />}
            subtitle="Findings that reached production"
            help={
              <div>
                <div className="font-semibold text-sm text-gray-800 mb-1">What it measures</div>
                <div className="text-xs text-gray-600 mb-2">Percentage of defects detected in production versus total.</div>
                <div className="font-semibold text-sm text-gray-800 mb-1">Why it matters</div>
                <div className="text-xs text-gray-600">Indicates impact on real users and helps prioritize urgent fixes.</div>
              </div>
            }
          />
        )}
      </div>

      {/* Main filtered charts */}
      <div className="grid grid-cols-1 gap-8">
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Trend of Selected Sprints
          </h3>
          <SprintTrendChart data={sprintData} />
        </div>
      </div>

      {/* Comparativa Sprint a Sprint */}
      {sprintData && sprintData.length >= 2 && (
        <SprintComparison 
          sprintData={sprintData} 
          selectedSprints={[]}
        />
      )}

      {/* Summary of critical modules */}
      {moduleData && (
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Module Analysis
          </h3>
          <ModuleAnalysis data={moduleData} />
        </div>
      )}

      {/* Actionable Recommendations */}
      <ActionableRecommendations data={data} filteredSprintData={sprintData} />

      {/* Modal de detalles */}
      <DetailModal 
        modal={detailModal} 
        onClose={() => setDetailModal(null)} 
        recommendations={recommendations || data?.recommendations || {}}
      />
      
      {/* Resolution Time Modal */}
      {openResolutionModal && (
        <ResolutionTimeModal 
          isOpen={openResolutionModal}
          onClose={() => setOpenResolutionModal(false)}
          data={resolutionTimeData}
        />
      )}
    </div>
  );
}

// Mantén las otras funciones de tabs exactamente como las tienes...
function QualityTab({ data, config, setDetailModal }) {
  const { 
    kpis = {}, 
    qualityMetrics = {}, 
    summary = {},
    moduleData = [],
    sprintData = [],
  } = data || {};

  const visible = config?.visibleKpis?.quality;

  // Helper para obtener datos de sparkline (simulado por ahora)
  const getSparklineData = (metric) => {
    // En una implementación real, esto vendría de `data`
    return [5, 10, 5, 20, 15, 25, 30];
  };

  return (
    <div className="space-y-8">
      <QualityMetrics 
        data={{ ...kpis, ...qualityMetrics, summary: summary }} 
        visibleKeys={visible} 
        sprintData={sprintData}
        onOpenDetail={setDetailModal}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Defect Density</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-executive-600 mb-2">
              {kpis?.defectDensity || '0.00'}
            </div>
            <p className="text-sm text-gray-600">bugs per test case</p>
          </div>
        </div>
        
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Automation</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-success-600 mb-2">
              {qualityMetrics?.testAutomation || kpis.automationCoverage || 0}%
            </div>
            <p className="text-sm text-gray-600">automated coverage</p>
          </div>
        </div>
        
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cycle Time</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-warning-600 mb-2">
              {qualityMetrics?.cycleTime || kpis?.averageResolutionTime || 0}
            </div>
            <p className="text-sm text-gray-600">average days</p>
          </div>
        </div>
      </div>
      
      <div className="executive-card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Modules Analysis</h3>
        <div className="space-y-4">
          {moduleData && moduleData.length > 0 ? (
            moduleData.slice(0, 8).map((module) => {
              const pct = module.percentage || 0;
              const level = pct >= 60 ? 'High' : pct >= 40 ? 'Medium' : 'Low';
              const badgeClass = level === 'High' ? 'bg-red-100 text-red-800' : level === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
              const Icon = level === 'High' || level === 'Medium' ? AlertTriangle : CheckCircle;

              return (
                <div
                  key={module.module}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailModal({
                    type: 'module',
                    title: module.module,
                    data: { [module.module]: module },
                    sparklineData: getSparklineData('defectDensity'),
                    sprints: sprintData
                  })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setDetailModal({ type: 'module', title: module.module, data: { [module.module]: module }, sparklineData: getSparklineData('defectDensity'), sprints: sprintData }); }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:shadow-md focus:shadow-md"
                >
                  <div>
                    <h4 className="font-medium text-gray-900">{module.module}</h4>
                    <p className="text-sm text-gray-600">{module.total || 0} bugs</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${badgeClass}`}>
                      <Icon className="w-3 h-3 mr-1" />
                      {level}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{pct}%</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-sm text-gray-600">No module data available for the current selection.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamsTab({ data, filteredData, setDetailModal, detailModal, config }) {
  // Determine source of bugs and developer summary
  const bugs = (filteredData && Array.isArray(filteredData.bugs)) ? filteredData.bugs : (data && Array.isArray(data.bugs) ? data.bugs : []);
  // Only consider items whose issue type is 'Bug' for developer and pending counts
  const filteredBugs = bugs.filter(b => {
    const it = (b.tipo_incidencia || b.issueType || b.type || '').toString().toLowerCase();
    return it === 'bug';
  });

  // If processed developerData exists, prefer it; otherwise derive from bugs
  let developerData = (data && data.developerData && Array.isArray(data.developerData) && data.developerData.length > 0)
    ? data.developerData
    : null;

  if (!developerData) {
    const byDev = {};
    // iterate only over bug-type issues
    filteredBugs.forEach(b => {
      const name = (b.developer || b.developer_name || b.reported || b.owner || 'Sin asignar').toString().trim() || 'Sin asignar';
      if (!byDev[name]) byDev[name] = { name, totalBugs: 0, pending: 0, resolved: 0 };
      byDev[name].totalBugs += 1;
      const status = (b.status || b.estado || '').toString().toLowerCase();
      const resolvedKeywords = ['resolved', 'closed', 'resuelto', 'cerrado'];
      if (resolvedKeywords.some(k => status.includes(k))) {
        byDev[name].resolved += 1;
      } else {
        byDev[name].pending += 1;
      }
    });

    const maxThreshold = (config && config.thresholds && config.thresholds.maxBugsDeveloper) ? config.thresholds.maxBugsDeveloper : 15;
    developerData = Object.values(byDev).map(d => {
      const workload = d.pending > maxThreshold ? 'Alto' : (d.pending > Math.round(maxThreshold / 2) ? 'Medio' : 'Bajo');
      const efficiency = d.totalBugs > 0 ? Math.round((d.resolved / d.totalBugs) * 100) : 0;
      return { ...d, workload, efficiency };
    }).sort((a, b) => (b.pending || 0) - (a.pending || 0));
  }

  return (
    <div className="space-y-8">
      <DeveloperAnalysis data={developerData} />

      {/* Productivity Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Workload Distribution
          </h3>
          <div className="space-y-3">
            {(developerData || []).map((dev, index) => (
              <div key={index} className="flex items-center">
                <span className="w-32 text-sm font-medium text-gray-600 truncate">
                  {dev.name}
                </span>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-200 rounded-full h-3 relative">
                    <div
                      className={`h-3 rounded-full ${
                        dev.workload === 'Alto' || dev.pending > 15 ? 'bg-red-500' :
                        dev.workload === 'Medio' || dev.pending > 10 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min((dev.pending / Math.max(1, (config?.thresholds?.maxBugsDeveloper || 15))) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-16">
                  {dev.pending || 0} bugs
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Eficiencia por Desarrollador
          </h3>
          <div className="space-y-3">
            {(developerData || []).map((dev, index) => {
              const totalBugs = dev.totalBugs || (dev.resolved + dev.pending) || dev.assigned || 0;
              const resolved = dev.resolved || 0;
              const efficiency = totalBugs > 0 ? Math.round((resolved / totalBugs) * 100) : 0;
              
              return (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {dev.name}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-executive-500 h-2 rounded-full"
                        style={{ width: `${efficiency}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-10">
                      {efficiency}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}



function RecommendationsTab({ data, setDetailModal, detailModal }) {
  // Use both existing and new recommendations
  const recommendations = data.recommendations || [];
  
  return (
    <div className="space-y-8">
      {/* Improved recommendations */}
      {recommendations.length > 0 ? (
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Smart Recommendations
          </h3>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={rec.id || index} className="border-l-4 border-blue-500 pl-4 py-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{rec.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        rec.impact === 'high' ? 'bg-red-100 text-red-800' : 
                        rec.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'
                      }`}>
                        Impacto: {rec.impact}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        rec.effort === 'high' ? 'bg-red-100 text-red-800' :
                        rec.effort === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        Esfuerzo: {rec.effort}
                      </span>
                      {rec.type && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {rec.type}
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-800 font-medium ml-4">
                    Implementar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Use existing component if no new recommendations
        <ExecutiveRecommendations data={data.recommendations} />
      )}
      
      {/* ROI and Value Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ROI del Proceso QA
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">
                Bugs Detectados Temprano
              </span>
              <span className="text-lg font-bold text-green-600">
                ${data.roi?.earlyDetection || '276,000'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">
                Mejora en Velocidad
              </span>
              <span className="text-lg font-bold text-blue-600">
                +{data.roi?.velocityImprovement || '15'}%
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">
                Reducción Hotfixes
              </span>
              <span className="text-lg font-bold text-purple-600">
                -{data.roi?.hotfixReduction || '80'}%
              </span>
            </div>
            {/* New ROI metrics if available */}
            {data.kpis?.averageResolutionTime && (
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  Average Resolution Time
                </span>
                <span className="text-lg font-bold text-orange-600">
                  {data.kpis.averageResolutionTime} days
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Madurez del Proceso
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                <span>Nivel Actual</span>
                <span>{data.processMaturity?.current || '3/5'} ({data.processMaturity?.currentLevel || 'Definido'})</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-executive-500 h-2 rounded-full" 
                  style={{ width: `${(data.processMaturity?.currentScore || 3) * 20}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 space-y-2">
              <p>• <strong>Objetivo Q1 2025:</strong> {data.processMaturity?.q1Target || '4/5 (Gestionado Cuantitativamente)'}</p>
              <p>• <strong>Meta Anual:</strong> {data.processMaturity?.yearTarget || '5/5 (Optimizado)'}</p>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">Next Milestones</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {data.processMaturity?.milestones ? (
                  data.processMaturity.milestones.map((milestone, index) => (
                    <li key={index}>• {milestone}</li>
                  ))
                ) : (
                  <>
                    <li>• Automatización 60% (actual: {data.qualityMetrics?.testAutomation || 25}%)</li>
                    <li>• Reducir tiempo ciclo a 1.5 días</li>
                    <li>• Implement predictive metrics</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Predictive analysis if available */}
      {data.predictions && (
        <div className="executive-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Predictive Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.predictions.map((prediction, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`text-2xl font-bold mb-2 ${
                  prediction.trend === 'up' ? 'text-green-600' :
                  prediction.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {prediction.value}
                </div>
                <div className="text-sm font-medium text-gray-900 mb-1">
                  {prediction.metric}
                </div>
                <div className="text-xs text-gray-600">
                  Próximos 30 días
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
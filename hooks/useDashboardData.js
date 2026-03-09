import { useState, useEffect, useMemo } from 'react';

const normalize = (str) => (str || '').toString().toLowerCase().trim();

const initialFilters = {
  yearMonth: ['All'],
  status: ['All'],
  priority: ['All'],
  tester: ['All'],
  product: ['All'],
  testType: ['All'],
  attribute: ['All'],
};

export function useDashboardData(initialData) {
  const [filters, setFilters] = useState(initialFilters);

  const processedData = useMemo(() => {
    if (!initialData) return null;

    // Si no hay array bugs (datos pre-agregados del API), pasar directamente sin filtrar
    if (!initialData.bugs || !Array.isArray(initialData.bugs) || initialData.bugs.length === 0) {
      return initialData;
    }

    const filterSets = {
      yearMonth: new Set(filters.yearMonth.map(normalize)),
      status: new Set(filters.status.map(normalize)),
      priority: new Set(filters.priority.map(normalize)),
      tester: new Set(filters.tester.map(normalize)),
      product: new Set(filters.product.map(normalize)),
      testType: new Set(filters.testType.map(normalize)),
      attribute: new Set(filters.attribute.map(normalize)),
    };

    const filteredBugs = initialData.bugs.filter(b => {
      const bugYearMonth = normalize(b.fecha_reporte ? b.fecha_reporte.substring(0, 7) : '');

      if (!filters.yearMonth.includes('All') && !filterSets.yearMonth.has(bugYearMonth)) return false;
      if (!filters.status.includes('All') && !filterSets.status.has(normalize(b.estado))) return false;
      if (!filters.priority.includes('All') && !filterSets.priority.has(normalize(b.prioridad))) return false;
      if (!filters.tester.includes('All') && !filterSets.tester.has(normalize(b.reportado_por))) return false;
      if (!filters.product.includes('All') && !filterSets.product.has(normalize(b.tag0))) return false;
      if (!filters.testType.includes('All') && !filterSets.testType.has(normalize(b.tipo_prueba))) return false;
      if (!filters.attribute.includes('All') && !filterSets.attribute.has(normalize(b.atributo))) return false;
      
      return true;
    });

    // Recalculate KPIs and summaries based on filteredBugs
    const totalBugs = filteredBugs.length;
    const totalPassed = filteredBugs.filter(b => normalize(b.estado) === 'pass').length;
    const totalFailed = filteredBugs.filter(b => normalize(b.estado) === 'fail').length;
    const totalNotExecuted = filteredBugs.filter(b => normalize(b.estado) === 'not executed').length;
    const totalInProgress = filteredBugs.filter(b => normalize(b.estado) === 'in progress').length;
    const totalBlocked = filteredBugs.filter(b => normalize(b.estado) === 'blocked').length;

    const summary = {
      totalBugs,
      totalPassed,
      totalFailed,
      totalNotExecuted,
      totalInProgress,
      totalBlocked,
      bugsClosed: totalPassed, // Assuming 'Pass' means closed for this context
      findingRate: totalBugs > 0 ? (totalFailed / totalBugs) * 100 : 0,
    };

    const kpis = {
      totalTests: totalBugs, // Simplified: total tests = total bugs recorded
      totalPassed,
      totalFailed,
      findingRate: summary.findingRate,
      // Other KPIs can be calculated here
    };

    return {
      ...initialData,
      bugs: filteredBugs,
      kpis,
      summary,
    };
  }, [initialData, filters]);

  // Compute distinct filter option lists from the ORIGINAL (unfiltered) data
  const filterOptions = useMemo(() => {
    if (!initialData) {
      return { yearMonths: [], statuses: [], priorities: [], testers: [], products: [], testTypes: [], attributes: [] };
    }
    const unique = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));

    // Si hay array bugs, derivar opciones de él
    if (initialData.bugs && Array.isArray(initialData.bugs) && initialData.bugs.length > 0) {
      const bugs = initialData.bugs;
      const yearMonths = unique(
        bugs.map(b => {
          if (!b.fecha_reporte) return null;
          const d = b.fecha_reporte.substring(0, 7); // 'YYYY-MM'
          const [year, month] = d.split('-');
          return month && year ? `${month}-${year}` : null;
        })
      ).sort((a, b) => {
        const parse = k => { const p = k.split('-'); return parseInt(p[1], 10) * 100 + parseInt(p[0], 10); };
        return parse(a) - parse(b);
      });
      return {
        yearMonths,
        statuses: unique(bugs.map(b => b.estado)),
        priorities: unique(bugs.map(b => b.prioridad)),
        testers: unique(bugs.map(b => b.reportado_por)),
        products: unique(bugs.map(b => b.tag0)),
        testTypes: unique(bugs.map(b => b.tipo_prueba)),
        attributes: unique(bugs.map(b => b.atributo)),
      };
    }

    // Con datos pre-agregados, derivar opciones de los objetos de agrupación
    const priorities = Object.keys(initialData.bugsByPriority || {});
    const products = (initialData.bugsByModule || []).map ? 
      (Array.isArray(initialData.bugsByModule) ? initialData.bugsByModule.map(m => m.module || m.name) : Object.keys(initialData.bugsByModule)) : [];

    // yearMonths de bugsByMonth o bugsByDate
    let yearMonths = [];
    if (initialData.bugsByMonth && typeof initialData.bugsByMonth === 'object') {
      yearMonths = Object.keys(initialData.bugsByMonth).sort((a, b) => {
        const parse = k => { const p = k.split('-'); return parseInt(p[1], 10) * 100 + parseInt(p[0], 10); };
        return parse(a) - parse(b);
      });
    }

    return {
      yearMonths,
      statuses: ['Pass', 'Fail', 'Not Executed', 'In Progress', 'Blocked'],
      priorities: unique(priorities),
      testers: [],
      products: unique(products),
      testTypes: [],
      attributes: [],
    };
  }, [initialData]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prevFilters => {
      const newValues = Array.isArray(value) ? value : [value];
      
      // If 'All' is selected, or the array is empty, reset to ['All']
      if (newValues.includes('All') || newValues.length === 0) {
        return { ...prevFilters, [filterType]: ['All'] };
      }
      
      // Remove 'All' if other values are present
      const cleanedValues = newValues.filter(v => v !== 'All');
      
      return { ...prevFilters, [filterType]: cleanedValues };
    });
  };

  return {
    processedData,
    filters,
    handleFilterChange,
    setFilters,
    filterOptions,
  };
}

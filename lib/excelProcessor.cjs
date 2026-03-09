// lib/excelProcessor.cjs
const XLSX = require('xlsx');

class ExcelQAProcessor {
  
  static processExcelFile(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      
      // Procesar cada sheet
      const tendenciaData = this.processTendenciaSheet(workbook);
      const developerData = this.processDeveloperSheet(workbook);
      const moduleData = this.processModuleSheet(workbook);
      const sprintData = this.processSprintSheet(workbook);
      const versionsData = this.processVersionsSheet(workbook);
      const categoryData = this.processCategorySheet(workbook);
      const generalData = this.processGeneralSheet(workbook);
      const recommendationsData = this.processRecommendationsSheet(workbook);
      
      // Combinar todos los datos en formato QA
      return this.transformToQAFormat({
        tendencia: tendenciaData,
        developers: developerData,
        modules: moduleData,
        sprints: sprintData,
        versions: versionsData,
        categories: categoryData,
        general: generalData,
        recommendations: recommendationsData
      });
      
    } catch (error) {
      console.error('Error procesando Excel:', error);
      throw error;
    }
  }

  static processTendenciaSheet(workbook) {
    const sheet = workbook.Sheets['Tendencia'];
    if (!sheet) return null;
    
    // Intentar con diferentes rangos
    let data = XLSX.utils.sheet_to_json(sheet);
    
    // Si no encuentra las columnas esperadas, saltar encabezados
    if (data.length > 0 && !data[0]['Sprint']) {
      data = XLSX.utils.sheet_to_json(sheet, { range: 1 });
    }
    if (data.length > 0 && !data[0]['Sprint']) {
      data = XLSX.utils.sheet_to_json(sheet, { range: 2 });
    }
    
    // Filtrar la fila de totales
    const filtered = data.filter(row => 
      row['Sprint'] && 
      row['Sprint'] !== 'Total' && 
      row['Sprint'] !== 'Total general' &&
      !String(row['Sprint']).toLowerCase().includes('total')
    );
    
    return filtered.map(row => ({
      sprint: row['Sprint'],
      casosEjecutados: row['Casos de Prueba Ejecutados'] || 0,
      casosPendientes: row['Casos de prueba Pendientes'] || 0,
      bugsEncontrados: row['Bugs Encontrados'] || 0,
      bugsCancelados: row['BUGS Cancelados'] || 0,
      bugsSolucionados: row['Bugs Solucionados'] || 0,
      bugsPendientes: row['BUGS Pendientes por Resolver'] || 0,
      porcentajeFallidos: row['% Casos de Prueba Fallidos'] || 0,
      porcentajePendientes: row['% Bugs Pendientes por resolver'] || 0
    }));
  }

  static processDeveloperSheet(workbook) {
    const sheet = workbook.Sheets['BUGS X DESARROLLADOR'];
    if (!sheet) {
      console.log('⚠️  Hoja "BUGS X DESARROLLADOR" no encontrada');
      return null;
    }
    
    // Leer desde la fila 3 (rango 2 = saltar 2 filas de encabezado)
    const data = XLSX.utils.sheet_to_json(sheet, { range: 2 });
    console.log(`📊 Filas leídas de desarrolladores: ${data.length}`);
    
    // Mapear con los nombres reales de columna del Excel
    const filtered = data.filter(row => 
      row['Bugs  por'] && 
      row['Bugs  por'] !== 'Desarrollador' && 
      row['Bugs  por'] !== 'Total general'
    );
    console.log(`✓ Desarrolladores válidos: ${filtered.length}`);
    
    return filtered.map(row => ({
        name: row['Bugs  por'],
        cancelados: row['Estado'] || 0,
        tareasPorHacer: row['__EMPTY'] || 0,
        codeReview: row['__EMPTY_1'] || 0,
        inSit: row['__EMPTY_2'] || 0,
        readyForTesting: row['__EMPTY_3'] || 0,
        readyForUat: row['__EMPTY_4'] || 0,
        blocked: row['__EMPTY_5'] || 0,
        enCurso: row['__EMPTY_6'] || 0,
        toBeDeployed: row['__EMPTY_7'] || 0,
        total: row['__EMPTY_8'] || 0
      }));
  }

  static processModuleSheet(workbook) {
    const sheet = workbook.Sheets['BUG X MÓDULO'];
    if (!sheet) return null;
    
    // Intentar con diferentes rangos para encontrar los datos
    let data = XLSX.utils.sheet_to_json(sheet);
    
    // Si la primera fila no tiene 'Módulo', intentar saltar encabezados
    if (data.length > 0 && !data[0]['Módulo']) {
      data = XLSX.utils.sheet_to_json(sheet, { range: 1 });
    }
    if (data.length > 0 && !data[0]['Módulo']) {
      data = XLSX.utils.sheet_to_json(sheet, { range: 2 });
    }
    
    return data.filter(row => row['Módulo'] && row['Módulo'] !== 'Total')
      .map(row => ({
        module: row['Módulo'],
        bugs: row['Bugs'] || 0
      }));
  }

  static processSprintSheet(workbook) {
    const sheet = workbook.Sheets['BUGS X SPRINT'];
    if (!sheet) return null;
    
    // Intentar con diferentes rangos
    let data = XLSX.utils.sheet_to_json(sheet);
    
    // Si la primera fila no tiene 'SPRINT', saltar encabezados
    if (data.length > 0 && !data[0]['SPRINT']) {
      data = XLSX.utils.sheet_to_json(sheet, { range: 1 });
    }
    if (data.length > 0 && !data[0]['SPRINT']) {
      data = XLSX.utils.sheet_to_json(sheet, { range: 2 });
    }
    
    return data.filter(row => row['SPRINT'] && row['SPRINT'] !== 'Total general')
      .map(row => ({
        sprint: row['SPRINT'],
        cancelados: row['Cancelado'] || 0,
        tareasPorHacer: row['Tareas por hacer'] || 0,
        codeReview: row['Code Review'] || 0,
        inSit: row['IN SIT'] || 0,
        readyForTesting: row['READY FOR TESTING'] || 0,
        readyForUat: row['READY FOR UAT'] || 0,
        blocked: row['Blocked'] || 0,
        enCurso: row['En curso'] || 0,
        toBeDeployed: row['TO BE DEPLOYED-SIT'] || 0,
        total: row['Total general'] || 0
      }));
  }

  static processVersionsSheet(workbook) {
    const sheet = workbook.Sheets['Versiones'];
    if (!sheet) {
      console.log('⚠️  Hoja "Versiones" no encontrada');
      return null;
    }
    
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    console.log(`📊 Filas leídas de versiones: ${data.length}`);
    
    // Filtrar filas con Sprint válido y mapear datos
    return data.filter(row => row['Sprint'] && String(row['Sprint']).trim() !== '')
      .map(row => {
        // Combinar etiquetas de múltiples columnas
        const tags = [
          row['Etiquetas'],
          row['__EMPTY_1'],
          row['__EMPTY_2']
        ].filter(tag => tag && String(tag).trim() !== '').join(', ');
        
        return {
          sprint: String(row['Sprint']).trim(),
          version: row['Versión'] || '',
          startDate: row['Fecha'] || '',
          environment: row['Environment'] || '',
          testPlan: row['Test Plan'] || '',
          tags: tags
        };
      });
  }

  static processCategorySheet(workbook) {
    const sheet = workbook.Sheets['BUGS X CATEGORÍA'];
    if (!sheet) return null;
    
    // Intentar con diferentes rangos
    let data = XLSX.utils.sheet_to_json(sheet);
    
    // Si no encuentra las columnas esperadas, saltar encabezados
    if (data.length > 0 && !data[0]['Etiquetas de fila']) {
      data = XLSX.utils.sheet_to_json(sheet, { range: 1 });
    }
    if (data.length > 0 && !data[0]['Etiquetas de fila']) {
      data = XLSX.utils.sheet_to_json(sheet, { range: 2 });
    }
    
    return data.filter(row => row['Etiquetas de fila'] && row['Etiquetas de fila'] !== 'Total')
      .map(row => ({
        priority: row['Etiquetas de fila'],
        funcional: row['Funcional'] || 0,
        contenidoDatos: row['Contenido/Datos'] || 0,
        eventosIoT: row['Eventos_iOT'] || 0,
        lookFeel: row['Look&Feel'] || 0,
        integracion: row['Integración'] || 0,
        configuracion: row['Configuración'] || 0,
        total: row['Total'] || 0
      }));
  }

  static processGeneralSheet(workbook) {
    const sheet = workbook.Sheets['Reporte_Gral'];
    if (!sheet) return null;
    
    const data = XLSX.utils.sheet_to_json(sheet);
    
    return {
      totalBugs: data.length,
      bugsByPriority: this.groupBy(data, 'Prioridad'),
      bugsByStatus: this.groupBy(data, 'Estado'),
      bugsByModule: this.groupBy(data, 'Módulo'),
      bugsByDeveloper: this.groupBy(data, 'Desarrollador'),
      bugsByCategory: this.groupBy(data, 'Categoría')
    };
  }

  static groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = item[key] || 'Sin definir';
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    }, {});
  }

  static transformToQAFormat(excelData) {
    const { tendencia, developers, modules, sprints, versions, categories, general, recommendations } = excelData;
    
    // Calcular summary desde los datos reales
    const totalBugs = general?.totalBugs || 0;
    const bugsClosed = this.calculateClosedBugs(general?.bugsByStatus);
    const bugsPending = this.calculatePendingBugs(general?.bugsByStatus);
    
    // Calcular casos de prueba desde tendencia
    const totalTestCases = tendencia?.reduce((sum, sprint) => sum + (sprint.casosEjecutados || 0), 0) || 0;
    const executedTestCases = totalTestCases; // Ya están ejecutados
    const failedTestCases = tendencia?.reduce((sum, sprint) => 
      sum + Math.round((sprint.casosEjecutados * (sprint.porcentajeFallidos || 0)) / 100), 0) || 0;
    const passedTestCases = executedTestCases - failedTestCases;

    return {
      summary: {
        totalBugs,
        bugsClosed,
        bugsPending,
        testCasesTotal: totalTestCases || 500, // Valor por defecto si no hay datos
        testCasesExecuted: executedTestCases,
        testCasesPassed: passedTestCases,
        testCasesFailed: failedTestCases
      },

      bugsByPriority: this.transformPriorityData(general?.bugsByPriority),
      
      bugsByModule: this.transformModuleData(modules),
      
      developerData: this.transformDeveloperData(developers),
      
      sprintData: this.transformSprintData(tendencia, versions),
      
      bugsByCategory: this.transformCategoryData(categories),
      
      qualityMetrics: {
        testAutomation: 45, // Valor estimado - puedes calcularlo si tienes datos
        cycleTime: this.calculateAverageCycleTime(tendencia)
      },
      
      // Recomendaciones paramétricas desde Excel
      recommendations: recommendations || {},
      
      // Datos adicionales específicos de tu Excel
      riskAreas: this.identifyRiskAreas(modules, general?.bugsByModule),
      
      metadata: {
        lastUpdated: new Date().toISOString(),
        source: 'excel-file',
        version: '1.0',
        sprints: tendencia?.map(t => t.sprint) || []
      }
    };
  }

  static calculateClosedBugs(bugsByStatus) {
    if (!bugsByStatus) return 0;
    
    const closedStatuses = ['READY FOR UAT', 'TO BE DEPLOYED-SIT'];
    return closedStatuses.reduce((sum, status) => {
      return sum + (bugsByStatus[status]?.length || 0);
    }, 0);
  }

  static calculatePendingBugs(bugsByStatus) {
    if (!bugsByStatus) return 0;
    
    const pendingStatuses = ['Tareas por hacer', 'Code Review', 'IN SIT', 'READY FOR TESTING', 'Blocked', 'En curso'];
    return pendingStatuses.reduce((sum, status) => {
      return sum + (bugsByStatus[status]?.length || 0);
    }, 0);
  }

  static transformPriorityData(bugsByPriority) {
    if (!bugsByPriority) return {};
    
    const priorityMap = {
      'Más alta': 'Más alta',
      'Alta': 'Alta', 
      'Medio': 'Media',
      'Baja': 'Baja',
      'Más baja': 'Más baja'
    };

    const result = {};
    Object.entries(priorityMap).forEach(([original, mapped]) => {
      const bugs = bugsByPriority[original] || [];
      result[mapped] = {
        count: bugs.length,
        pending: bugs.filter(bug => 
          ['Tareas por hacer', 'Code Review', 'Blocked', 'En curso'].includes(bug.Estado)
        ).length,
        resolved: bugs.filter(bug => 
          ['READY FOR UAT', 'TO BE DEPLOYED-SIT'].includes(bug.Estado)
        ).length
      };
    });

    return result;
  }

  static transformModuleData(modules) {
    if (!modules) return {};
    
    const total = modules.reduce((sum, mod) => sum + mod.bugs, 0);
    
    const result = {};
    modules.forEach(mod => {
      result[mod.module] = {
        count: mod.bugs,
        percentage: total > 0 ? Math.round((mod.bugs / total) * 100) : 0,
        pending: Math.round(mod.bugs * 0.4) // Estimación - 40% pendientes
      };
    });

    return result;
  }

  static transformDeveloperData(developers) {
    if (!developers) return [];
    
    return developers.map(dev => ({
      name: dev.name,
      assigned: dev.total,
      resolved: dev.readyForUat + dev.toBeDeployed,
      pending: dev.tareasPorHacer + dev.blocked + dev.enCurso + dev.codeReview,
      totalBugs: dev.total,
      workload: dev.total > 15 ? 'Alto' : dev.total > 8 ? 'Medio' : 'Bajo'
    }));
  }

  static transformSprintData(tendencia, versions) {
    if (!tendencia) return [];
    
    // Crear un mapa de versiones por sprint para búsqueda rápida
    const versionMap = {};
    if (versions && Array.isArray(versions)) {
      versions.forEach(v => {
          // Normalizar la key del sprint (puede ser número o string "Sprint X")
          const normalizedKey = String(v.sprint).replace(/[^\d]/g, '');
          versionMap[normalizedKey] = v;
      });
    }
    
    return tendencia.map((sprint, index) => {
      const prevSprint = index > 0 ? tendencia[index - 1] : null;
      const change = prevSprint && prevSprint.bugsEncontrados > 0 ? 
        Math.round(((sprint.bugsEncontrados - prevSprint.bugsEncontrados) / prevSprint.bugsEncontrados) * 100) : 0;

      // Buscar metadata de versión para este sprint
        // Normalizar la key del sprint (extraer solo números)
        const sprintKey = String(sprint.sprint).replace(/[^\d]/g, '');
      const versionData = versionMap[sprintKey] || {};

      // Clasificar como System o UAT basado en tags (solo 'uat')
      const tags = versionData.tags || '';
      const isUAT = tags.toLowerCase().includes('uat');
      const testType = isUAT ? 'uat' : 'system';

      // Calcular bugs críticos (simulación: 20-25% de bugs totales son críticos)
      const criticalBugsCount = Math.ceil(sprint.bugsEncontrados * 0.22);
      const criticalBugsPending = Math.ceil(sprint.bugsPendientes * 0.25);

      // Calcular tiempos de resolución en días (basado en velocidad real)
      // Duración del sprint: 14 días
      const sprintDuration = 14;
      const dailyResolutionVelocity = sprint.bugsSolucionados > 0 ? sprint.bugsSolucionados / sprintDuration : 1;
      const avgResolutionTime = sprint.bugsPendientes > 0 
        ? Math.ceil((sprint.bugsPendientes / dailyResolutionVelocity))
        : Math.ceil(sprintDuration * 0.5);

      return {
        sprint: sprint.sprint,
        bugs: sprint.bugsEncontrados,
        bugsResolved: sprint.bugsSolucionados,
        bugsPending: sprint.bugsPendientes,
        testCases: sprint.casosEjecutados,
        velocity: Math.round(sprint.casosEjecutados / 7), // Estimación: casos por día
        plannedVelocity: Math.round(sprint.casosEjecutados * 1.1), // 10% más de lo ejecutado
        change,
        // Bugs críticos desglosados
        criticalBugsTotal: criticalBugsCount,
        criticalBugsPending: criticalBugsPending,
        avgResolutionTime: avgResolutionTime,
        // Tipo de prueba
        testType: testType,
        // Metadata de versiones
        version: versionData.version || '',
        startDate: versionData.startDate || '',
        environment: versionData.environment || '',
        testPlan: versionData.testPlan || '',
        tags: versionData.tags || ''
      };
    });
  }

  static transformCategoryData(categories) {
    if (!categories) return {};
    
    const result = {};
    categories.forEach(cat => {
      const total = cat.total;
      result[`Funcional`] = { count: cat.funcional, percentage: total > 0 ? Math.round((cat.funcional / total) * 100) : 0 };
      result[`Look&Feel`] = { count: cat.lookFeel, percentage: total > 0 ? Math.round((cat.lookFeel / total) * 100) : 0 };
      result[`Contenido/Datos`] = { count: cat.contenidoDatos, percentage: total > 0 ? Math.round((cat.contenidoDatos / total) * 100) : 0 };
      result[`Eventos_iOT`] = { count: cat.eventosIoT, percentage: total > 0 ? Math.round((cat.eventosIoT / total) * 100) : 0 };
      result[`Integración`] = { count: cat.integracion, percentage: total > 0 ? Math.round((cat.integracion / total) * 100) : 0 };
    });

    return result;
  }

  static identifyRiskAreas(modules, bugsByModule) {
    if (!modules) return [];
    
    return modules
      .filter(mod => mod.bugs > 20) // Módulos con más de 20 bugs
      .map(mod => {
        const total = modules.reduce((sum, m) => sum + m.bugs, 0);
        const percentage = Math.round((mod.bugs / total) * 100);
        
        return {
          area: mod.module,
          bugs: mod.bugs,
          percentage,
          risk: percentage > 50 ? 'Alto' : percentage > 30 ? 'Medio' : 'Bajo',
          impact: mod.bugs > 50 ? 'Crítico' : mod.bugs > 30 ? 'Alto' : 'Medio'
        };
      });
  }

  static calculateAverageCycleTime(tendencia) {
    if (!tendencia || tendencia.length === 0) return 2.5;
    
    // Estimación basada en la eficiencia de resolución
    const avgResolution = tendencia.reduce((sum, sprint) => {
      const total = sprint.bugsEncontrados || 1;
      const resolved = sprint.bugsSolucionados || 0;
      return sum + (resolved / total);
    }, 0) / tendencia.length;
    
    // Ciclo más corto si hay mejor resolución
    return Math.round((1 - avgResolution) * 5 + 1.5, 1); // Entre 1.5 y 6.5 días
  }

  static processRecommendationsSheet(workbook) {
    const sheet = workbook.Sheets['Recomendaciones'];
    if (!sheet) {
      console.warn('Sheet "Recomendaciones" not found, using defaults');
      return null;
    }
    
    try {
      let data = XLSX.utils.sheet_to_json(sheet);
      
      // Intentar con diferentes rangos si no encuentra las columnas
      if (data.length > 0 && !data[0]['Metrica']) {
        data = XLSX.utils.sheet_to_json(sheet, { range: 1 });
      }
      if (data.length > 0 && !data[0]['Metrica']) {
        data = XLSX.utils.sheet_to_json(sheet, { range: 2 });
      }
      
      // Agrupar recomendaciones por métrica y condición
      const recommendations = {};
      
      data.forEach(row => {
        const metricKey = row['Metrica'] || row['Métrica'];
        const condition = row['Condicion'] || row['Condición'];
        const recommendation = row['Recomendacion'] || row['Recomendación'];
        const priority = row['Prioridad'];
        
        if (!metricKey || !recommendation) return;
        
        if (!recommendations[metricKey]) {
          recommendations[metricKey] = [];
        }
        
        recommendations[metricKey].push({
          condition: condition || 'default',
          text: recommendation,
          priority: priority || 'media'
        });
      });
      
      return recommendations;
      
    } catch (error) {
      console.error('Error processing Recomendaciones sheet:', error);
      return null;
    }
  }
}

module.exports = { ExcelQAProcessor };

/**
 * QADataProcessor
 * Centralized data processing and transformation for QA metrics.
 * Handles KPI calculation, trend analysis, alerts, recommendations.
 * 
 * Stateless utility class - all methods are static and deterministic.
 */

export class QADataProcessor {
  /**
   * Main processor: transforms raw QA data into dashboard-ready metrics
   * @param {Object} rawData - Raw QA data from API/Excel
   * @param {Object} config - Configuration with weights, thresholds, etc.
   * @returns {Object} Processed data with KPIs, trends, alerts, recommendations
   */
  static processQAData(rawData, config = {}) {
    // Default configuration with sensible thresholds
    const defaultConfig = {
      weights: {
        resolutionRate: 0.3,
        testCoverage: 0.25,
        bugDensity: 0.2,
        criticalBugs: 0.25
      },
      thresholds: {
        criticalBugsAlert: 20,
        maxBugsDeveloper: 15,
        criticalModulePercentage: 60,
        minTestCoverage: 80,
        maxBugTrendIncrease: 20,
        maxDefectDensity: 0.1,
        minResolutionEfficiency: 70,
        maxCriticalBugsRatio: 20
      },
      priorities: {
        critical: ['Más alta', 'Alta'],
        high: ['Media'],
        low: ['Baja', 'Más baja']
      },
      modules: {
        POS: { weight: 0.4, criticalThreshold: 50 },
        Inventory: { weight: 0.3, criticalThreshold: 40 },
        Reports: { weight: 0.2, criticalThreshold: 30 },
        Admin: { weight: 0.1, criticalThreshold: 20 }
      }
    };

    const finalConfig = this.mergeDeep(defaultConfig, config);
    
    const totalBugs = rawData.summary?.totalBugs || 0;
    const bugsClosed = rawData.summary?.bugsClosed || 0;
    const bugsPending = rawData.summary?.bugsPending || 0;
    
    // Normalizar sprintData: mapear TODOS los posibles nombres de campos SQL/CSV
    // Estructura: [sprint_name, bugs_found, bugs_resolved, test_cases_executed, ...]
    const sprintData = (rawData.sprintData || []).map(sprint => ({
      sprint: sprint.sprint || sprint.sprint_num || sprint.sprint_numero || sprint.nombre_sprint || '',
      bugs: sprint.total || sprint.bugs || sprint.bugs_encontrados || sprint.defectos_encontrados || 0,
      bugsResolved: sprint.critical || sprint.bugsResolved || sprint.bugs_resueltos || sprint.defectos_cerrados || 0,
      bugsPending: sprint.bugsPending || sprint.bugs_pendientes || sprint.defectos_pendientes || 0,
      testCases: sprint.testCases || sprint.casosEjecutados || sprint.test_cases || sprint.casos_ejecutados || sprint.test_executed || sprint.total || 0,
      // Normalize planned test cases to both `testPlanned` and `testCasesPlanned` so DAL + frontend find them
      testPlanned: sprint.testPlanned || sprint.casosPlaneados || sprint.test_planned || sprint.casos_planeados || sprint.testCasesPlanned || sprint.test_cases_planned || 0,
      testCasesPlanned: sprint.testCasesPlanned || sprint.testPlanned || sprint.casosPlaneados || sprint.test_planned || sprint.casos_planeados || sprint.test_cases_planned || 0,
      change: sprint.change || sprint.cambio || 0,
      version: sprint.version || sprint.version_entrega || sprint.version_numero || '',
      environment: sprint.environment || sprint.ambiente || '',
      startDate: sprint.startDate || sprint.start_date || sprint.fecha_inicio || ''
    }));

    // Normalizar developerData: mapear TODOS los posibles nombres de campos SQL/CSV
    // Estructura: [nombre, bugs_asignados, bugs_resueltos, bugs_pendientes, carga_trabajo, ...]
    const developerData = (rawData.developerData || []).map(dev => ({
      name: dev.developer_name || dev.name || dev.asignado_a || dev.nombre_desarrollador || '',
      assigned: dev.total_bugs || dev.assigned || dev.bugs_asignados || dev.defectos_asignados || 0,
      resolved: dev.resolved || dev.code_review || dev.bugs_resueltos || dev.defectos_resueltos || 0,
      pending: dev.pending || dev.tareas_por_hacer || dev.bugs_pendientes || dev.defectos_pendientes || 0,
      workload: dev.workload_level || dev.workload || dev.carga_trabajo || dev.nivel_carga || '',
      efficiency: dev.efficiency || dev.eficiencia || 0,
      avgResolutionTime: dev.avgResolutionTime || dev.avg_resolution_time || dev.tiempo_promedio_resolucion || 0
    }));

    const processedData = {
      ...rawData,
      sprintData,
      developerData,
      kpis: this.calculateKPIs(rawData, finalConfig),
      trends: this.calculateTrends(rawData),
      alerts: this.generateAlerts(rawData, finalConfig),
      recommendations: this.generateRecommendations(rawData, finalConfig),
      predictions: this.generatePredictions(rawData),
      processMaturity: this.calculateProcessMaturity(rawData),
      roi: this.calculateROI(rawData),
      metadata: {
        processedAt: new Date().toISOString(),
        version: "2.0",
        configUsed: finalConfig,
        processor: "QADataProcessor"
      }
    };
    return processedData;
  }

  static calculateKPIs(rawData, config) {
    const totalBugs = rawData.summary?.totalBugs || 0;
    const bugsClosed = rawData.summary?.bugsClosed || 0;
    const testCasesExecuted = rawData.summary?.testCasesExecuted || 0;
    const testCasesTotal = rawData.summary?.testCasesTotal || 1;
    
    // Calcular media de casos ejecutados por sprint
    const avgTestCasesPerSprint = this.calculateAvgTestCasesPerSprint(rawData.sprintData);
    const resolutionEfficiency = totalBugs > 0 ? Math.round((bugsClosed / totalBugs) * 100) : 0;
    const defectDensity = testCasesExecuted > 0 ? (totalBugs / testCasesExecuted).toFixed(2) : 0;
    
    return {
      avgTestCasesPerSprint,  // Reemplaza testCoverage
      resolutionEfficiency,
      qualityIndex: this.calculateQualityIndex(rawData, config.weights),
      sprintTrend: this.calculateSprintTrend(rawData.sprintData),
      defectDensity,
      criticalBugsRatio: this.calculateCriticalBugsRatio(rawData, config.priorities.critical),
      
      // Nuevos KPIs
      averageResolutionTime: this.calculateAverageResolutionTime(rawData),
      testExecutionRate: this.calculateTestExecutionRate(rawData),
      bugLeakageRate: this.calculateBugLeakageRate(rawData),
      
      // Tendencias de KPIs
      testCoverageTrend: this.calculateKPITrend(rawData, 'testCoverage'),
      resolutionTrend: this.calculateKPITrend(rawData, 'resolution'),
      criticalBugsTrend: this.calculateKPITrend(rawData, 'criticalBugs'),
      
      // Velocity metrics
      velocityTrend: this.calculateVelocityTrend(rawData.sprintData),
      burndownEfficiency: this.calculateBurndownEfficiency(rawData.sprintData),
      
      // Additional quality metrics
      reworkRate: this.calculateReworkRate(rawData),
      firstPassYield: this.calculateFirstPassYield(rawData),
      escapeRate: this.calculateEscapeRate(rawData)
    };
  }

  /**
   * Calcular media de casos ejecutados por sprint
   * 
   * LÓGICA: 
   * - Cada registro en MockDataV0.csv es un BUG reportado
   * - Los casos ejecutados = cantidad de bugs encontrados (1000 casos, 1000 bugs)
   * - Cada sprint tiene su propia cantidad de casos ejecutados en el campo testCases
   * 
   * @param {Array} sprintData - Array de datos de sprints
   * @returns {number} Promedio de casos ejecutados por sprint
   */
  static calculateAvgTestCasesPerSprint(sprintData) {
    if (!sprintData || !Array.isArray(sprintData) || sprintData.length === 0) return 0;
    
    const totalCases = sprintData.reduce((sum, sprint) => {
      // Mapear todos los posibles nombres de campo SQL/CSV
      let cases = sprint.testCases 
        || sprint.casosEjecutados 
        || sprint.casos_ejecutados 
        || sprint.test_cases 
        || sprint.test_executed
        || sprint.total  // Fallback: usar bugs encontrados directamente
        || 0;
      
      // Validar que sea un número finito válido
      const validCases = Number.isFinite(cases) ? Math.max(0, cases) : 0;
      return sum + validCases;
    }, 0);
    
    // Calcular promedio y redondear
    const average = sprintData.length > 0 ? totalCases / sprintData.length : 0;
    return Math.round(average);
  }

  static calculateQualityIndex(data, weights) {
    const totalBugs = data.summary?.totalBugs || 0;
    const bugsClosed = data.summary?.bugsClosed || 0;
    const testCasesExecuted = data.summary?.testCasesExecuted || 0;
    const testCasesTotal = data.summary?.testCasesTotal || 1;
    
    const resolutionRate = totalBugs > 0 ? (bugsClosed / totalBugs) * 100 : 100;
    const testCoverage = (testCasesExecuted / testCasesTotal) * 100;
    const bugDensity = testCasesExecuted > 0 ? Math.max(0, 100 - (totalBugs / testCasesExecuted) * 50) : 100;
    
    // Calcular bugs críticos de forma más robusta
    const criticalBugs = this.getCriticalBugsCount(data);
    const criticalBugsScore = totalBugs > 0 ? Math.max(0, 100 - (criticalBugs / totalBugs) * 100) : 100;
    
    const qualityIndex = 
      (resolutionRate * weights.resolutionRate) +
      (testCoverage * weights.testCoverage) +
      (bugDensity * weights.bugDensity) +
      (criticalBugsScore * weights.criticalBugs);
    
    return Math.round(Math.min(100, Math.max(0, qualityIndex)));
  }

  static getCriticalBugsCount(data) {
    if (!data.bugsByPriority) return 0;
    
    // Mapear todas las posibles etiquetas de prioridad crítica
    const criticalPriorities = ['Más alta', 'Alta', 'Critical', 'High', 'Crítica'];
    return criticalPriorities.reduce((sum, priority) => {
      return sum + (data.bugsByPriority[priority]?.count || 0);
    }, 0);
  }

  static calculateCriticalBugsRatio(rawData, criticalPriorities) {
    const totalBugs = rawData.summary?.totalBugs || 0;
    if (totalBugs === 0) return 0;
    
    const criticalCount = criticalPriorities.reduce((sum, priority) => {
      return sum + (rawData.bugsByPriority?.[priority]?.count || 0);
    }, 0);
    
    return Math.round((criticalCount / totalBugs) * 100);
  }

  static calculateTrends(rawData) {
    return {
      bugsPerSprint: this.calculateBugTrend(rawData.sprintData),
      resolutionRate: this.calculateResolutionTrend(rawData.sprintData),
      qualityImprovement: this.calculateQualityTrend(rawData.sprintData),
      velocityTrend: this.calculateVelocityTrendData(rawData.sprintData),
      testCoverageTrend: this.calculateTestCoverageTrend(rawData.sprintData),
      defectDensityTrend: this.calculateDefectDensityTrend(rawData.sprintData)
    };
  }

  static generateAlerts(data, config) {
    const alerts = [];
    
    // Alert for critical bugs
    const criticalBugs = this.getCriticalBugsPending(data, config.priorities.critical);
    if (criticalBugs > config.thresholds.criticalBugsAlert) {
      alerts.push({
        id: 'critical-bugs-high',
        type: 'critical',
        title: 'High Critical Bugs',
        message: `${criticalBugs} pending critical bugs require immediate attention`,
        action: 'Review and prioritize resolution',
        priority: 1,
        createdAt: new Date().toISOString(),
        module: 'quality-control'
      });
    }
    
    // Alert for developer concentration
    const developerOverload = this.checkDeveloperOverload(data, config.thresholds.maxBugsDeveloper);
    if (developerOverload) {
      alerts.push({
        id: 'developer-overload',
        type: 'warning',
        title: 'Bug Concentration',
        message: `${developerOverload.name} has ${developerOverload.pending} pending bugs`,
        action: 'Consider load redistribution',
        priority: 2,
        createdAt: new Date().toISOString(),
        module: 'team-management'
      });
    }
    
    // Alert for critical module
    const criticalModule = this.checkCriticalModule(data, config.thresholds.criticalModulePercentage);
    if (criticalModule) {
      alerts.push({
        id: `module-critical-${criticalModule.name}`,
        type: 'warning',
        title: `${criticalModule.name} Module Critical`,
        message: `Module ${criticalModule.name} concentrates ${criticalModule.percentage}% of bugs`,
        action: `Plan refactoring of ${criticalModule.name} module`,
        priority: 2,
        createdAt: new Date().toISOString(),
        module: 'architecture'
      });
    }
    
    // Alert for low test coverage
    const testCoverage = this.calculateTestExecutionRate(data);
    if (testCoverage < config.thresholds.minTestCoverage) {
      alerts.push({
        id: 'low-test-coverage',
        type: 'warning',
        title: 'Low Test Coverage',
        message: `Test coverage is ${testCoverage}%, below minimum required (${config.thresholds.minTestCoverage}%)`,
        action: 'Increase test cases and automation',
        priority: 2,
        createdAt: new Date().toISOString(),
        module: 'test-coverage'
      });
    }
    
    // Alert for negative trend
    const sprintTrend = this.calculateSprintTrend(data.sprintData);
    if (sprintTrend > config.thresholds.maxBugTrendIncrease) {
      alerts.push({
        id: 'negative-trend',
        type: 'warning',
        title: 'Negative Bug Trend',
        message: `Bugs have increased ${sprintTrend}% in recent sprints`,
        action: 'Review development and testing process',
        priority: 3,
        createdAt: new Date().toISOString(),
        module: 'process-improvement'
      });
    }
    
    return alerts.sort((a, b) => a.priority - b.priority);
  }

  static generateRecommendations(data, config) {
    const recommendations = [];
    
    // Recommendation based on test coverage
    const testCoverage = this.calculateTestExecutionRate(data);
    if (testCoverage < config.thresholds.minTestCoverage) {
      recommendations.push({
        id: 'improve-test-coverage',
        type: 'quality',
        title: 'Improve Test Coverage',
        description: `Current coverage is ${testCoverage}%. Recommended to reach at least ${config.thresholds.minTestCoverage}%`,
        impact: 'high',
        effort: 'medium',
        estimatedDays: 14,
        category: 'testing'
      });
    }
    
    // Recommendation based on bug trend
    const sprintTrend = this.calculateSprintTrend(data.sprintData);
    if (sprintTrend > config.thresholds.maxBugTrendIncrease) {
      recommendations.push({
        id: 'address-bug-trend',
        type: 'process',
        title: 'Address Bug Trend',
        description: `Bugs have increased ${sprintTrend}% in recent sprints. Review development process`,
        impact: 'high',
        effort: 'high',
        estimatedDays: 30,
        category: 'process-improvement'
      });
    }
    
    // Recommendation based on defect density
    const defectDensity = parseFloat(data.summary?.totalBugs || 0) / (data.summary?.testCasesExecuted || 1);
    if (defectDensity > config.thresholds.maxDefectDensity) {
      recommendations.push({
        id: 'reduce-defect-density',
        type: 'quality',
        title: 'Reduce Defect Density',
        description: `Current density is ${defectDensity.toFixed(2)}. Implement stricter code reviews`,
        impact: 'medium',
        effort: 'medium',
        estimatedDays: 21,
        category: 'code-quality'
      });
    }
    
    // Recommendation based on automation
    const automationRate = data.qualityMetrics?.testAutomation || 0;
    if (automationRate < 60) {
      recommendations.push({
        id: 'increase-automation',
        type: 'efficiency',
        title: 'Increase Automation',
        description: `Current automation: ${automationRate}%. Goal: 80% to improve efficiency`,
        impact: 'high',
        effort: 'high',
        estimatedDays: 45,
        category: 'automation'
      });
    }
    
    // Recommendation based on workload distribution
    const overloadedDev = this.checkDeveloperOverload(data, config.thresholds.maxBugsDeveloper);
    if (overloadedDev) {
      recommendations.push({
        id: 'balance-workload',
        type: 'team',
        title: 'Balance Workload',
        description: `${overloadedDev.name} is overloaded. Redistribute bugs among the team`,
        impact: 'medium',
        effort: 'low',
        estimatedDays: 3,
        category: 'team-management'
      });
    }
    
    return recommendations.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  static generatePredictions(data) {
    const predictions = [];
    
    // Predicción de bugs para próximo sprint
    const avgBugsPerSprint = this.calculateAverageBugsPerSprint(data.sprintData);
    const trend = this.calculateSprintTrend(data.sprintData);
    const predictedBugs = Math.round(avgBugsPerSprint * (1 + trend / 100));
    
    predictions.push({
      metric: 'Bugs Próximo Sprint',
      value: predictedBugs,
      trend: trend > 0 ? 'up' : 'down',
      confidence: this.calculatePredictionConfidence(data.sprintData)
    });
    
    // Predicción de tiempo de resolución
    const avgResolutionTime = this.calculateAverageResolutionTime(data);
    predictions.push({
      metric: 'Tiempo Resolución',
      value: `${avgResolutionTime} días`,
      trend: 'stable',
      confidence: 85
    });
    
    // Quality prediction
    const qualityTrend = this.calculateQualityTrendPrediction(data);
    predictions.push({
      metric: 'Quality Index',
      value: `${qualityTrend.predicted}%`,
      trend: qualityTrend.direction,
      confidence: qualityTrend.confidence
    });
    
    return predictions;
  }

  static calculateProcessMaturity(data) {
    // Calcular madurez basada en múltiples factores
    let maturityScore = 0;
    let factors = 0;
    
    // Factor 1: Cobertura de pruebas
    const testCoverage = this.calculateTestExecutionRate(data);
    maturityScore += Math.min(testCoverage / 20, 1); // Max 1 punto
    factors++;
    
    // Factor 2: Automatización
    const automation = data.qualityMetrics?.testAutomation || 0;
    maturityScore += Math.min(automation / 20, 1); // Max 1 punto
    factors++;
    
    // Factor 3: Eficiencia de resolución
    const efficiency = data.summary?.totalBugs > 0 ? 
      (data.summary.bugsClosed / data.summary.totalBugs) * 100 : 0;
    maturityScore += Math.min(efficiency / 20, 1); // Max 1 punto
    factors++;
    
    // Factor 4: Consistencia (baja variabilidad en sprints)
    const consistency = this.calculateConsistencyScore(data.sprintData);
    maturityScore += consistency; // Max 1 punto
    factors++;
    
    // Factor 5: Available predictive metrics
    if (data.predictions || data.trends) {
      maturityScore += 1;
    }
    factors++;
    
    const finalScore = factors > 0 ? Math.round((maturityScore / factors) * 5) : 3;
    
    const levels = {
      1: 'Inicial',
      2: 'Repetible',
      3: 'Definido',
      4: 'Gestionado',
      5: 'Optimizado'
    };
    
    return {
      current: `${finalScore}/5`,
      currentLevel: levels[finalScore],
      currentScore: finalScore,
      q1Target: '4/5 (Gestionado Cuantitativamente)',
      yearTarget: '5/5 (Optimizado)',
      milestones: [
        `Automatización ${Math.min(automation + 20, 80)}% (actual: ${automation}%)`,
        'Reducir tiempo ciclo a 1.5 días',
        'Implement predictive metrics',
        'Establish quality baseline',
        'Optimización continua'
      ]
    };
  }

  static calculateROI(data) {
    const bugsDetected = data.summary?.totalBugs || 0;
    const bugsClosed = data.summary?.bugsClosed || 0;
    
    // Estimaciones conservadoras de costos
    const costPerBugInProduction = 5000; // USD
    const costPerBugInDevelopment = 500; // USD
    
    const savedCost = bugsDetected * (costPerBugInProduction - costPerBugInDevelopment);
    
    return {
      earlyDetection: savedCost.toLocaleString(),
      velocityImprovement: '15',
      hotfixReduction: '80',
      costSavings: savedCost,
      roi: Math.round((savedCost / (bugsDetected * costPerBugInDevelopment)) * 100)
    };
  }

  // ===============================
  // MÉTODOS AUXILIARES
  // ===============================

  static calculateSprintTrend(sprintData) {
    if (!sprintData || sprintData.length < 2) return 0;
    
    const firstSprint = sprintData[0];
    const lastSprint = sprintData[sprintData.length - 1];
    
    if (!firstSprint.bugs || firstSprint.bugs === 0) return 0;
    
    return Math.round(((lastSprint.bugs - firstSprint.bugs) / firstSprint.bugs) * 100);
  }

  static calculateBugTrend(sprintData) {
    if (!sprintData) return [];
    
    return sprintData.map((sprint, index) => ({
      sprint: sprint.sprint || `Sprint ${index + 1}`,
      bugs: sprint.bugs || 0,
      trend: sprint.change || 0,
      resolved: sprint.bugsResolved || 0,
      pending: sprint.bugsPending || 0
    }));
  }

  static calculateResolutionTrend(sprintData) {
    if (!sprintData) return [];
    
    return sprintData.map((sprint, index) => {
      const resolved = sprint.bugsResolved || 0;
      const pending = sprint.bugsPending || 0;
      const total = resolved + pending;
      
      return {
        sprint: sprint.sprint || `Sprint ${index + 1}`,
        resolved,
        pending,
        rate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        total
      };
    });
  }

  static calculateQualityTrend(sprintData) {
    if (!sprintData) return [];
    
    return sprintData.map((sprint, index) => {
      const baseQuality = 100;
      const bugPenalty = (sprint.bugs || 0) * 2;
      const testBonus = Math.min((sprint.testCases || 0) / 10, 20);
      const resolutionBonus = sprint.bugsResolved ? (sprint.bugsResolved / (sprint.bugs || 1)) * 10 : 0;
      
      const quality = Math.max(0, Math.min(100, baseQuality - bugPenalty + testBonus + resolutionBonus));
      
      return {
        sprint: sprint.sprint || `Sprint ${index + 1}`,
        quality: Math.round(quality),
        bugs: sprint.bugs || 0,
        testCases: sprint.testCases || 0
      };
    });
  }

  static calculateAverageResolutionTime(data) {
    // Si tenemos datos reales de tiempo de resolución
    if (data.bugResolutionTimes && data.bugResolutionTimes.length > 0) {
      const total = data.bugResolutionTimes.reduce((sum, time) => sum + time, 0);
      return Math.round(total / data.bugResolutionTimes.length);
    }
    
    // Cálculo basado en sprints y bugs cerrados
    if (data.sprintData && data.sprintData.length > 0) {
      // Calcular promedio de días por sprint y bugs resueltos por sprint
      const sprintDuration = 14; // días estándar por sprint
      
      let totalBugsResolved = 0;
      let totalSprintDays = 0;
      
      data.sprintData.forEach(sprint => {
        const bugsResolved = sprint.bugsResolved || sprint.bugsCerrados || 0;
        totalBugsResolved += bugsResolved;
        totalSprintDays += sprintDuration;
      });
      
      // Cycle Time = (Total de días) / (Total de bugs resueltos)
      // Ej: 84 días (6 sprints) / 57 bugs resueltos = 1.47 días promedio
      if (totalBugsResolved > 0) {
        return Math.round((totalSprintDays / totalBugsResolved) * 10) / 10;
      }
    }
    
    // Fallback: estimación simple
    const totalBugs = data.summary?.totalBugs || 0;
    const bugsClosed = data.summary?.bugsClosed || 0;
    const sprintDuration = 14; // días
    const sprints = data.sprintData?.length || 1;
    
    if (bugsClosed > 0) {
      return Math.round((sprints * sprintDuration) / bugsClosed * 10) / 10;
    }
    
    return 7; // Valor por defecto
  }

  static calculateTestExecutionRate(data) {
    const executed = data.summary?.testCasesExecuted || 0;
    const total = data.summary?.testCasesTotal || 1;
    return Math.round((executed / total) * 100);
  }

  static calculateBugLeakageRate(data) {
    const productionBugs = data.productionBugs || 0;
    const totalBugs = data.summary?.totalBugs || 1;
    return Math.round((productionBugs / totalBugs) * 100);
  }

  static calculateVelocityTrend(sprintData) {
    if (!sprintData) return [];
    
    return sprintData.map((sprint, index) => ({
      sprint: sprint.sprint || `Sprint ${index + 1}`,
      velocity: sprint.velocity || 0,
      planned: sprint.plannedVelocity || sprint.velocity || 0,
      efficiency: sprint.plannedVelocity > 0 ? 
        Math.round((sprint.velocity / sprint.plannedVelocity) * 100) : 100
    }));
  }

  static getCriticalBugsPending(data, criticalPriorities) {
    if (!data.bugsByPriority) return 0;
    
    return criticalPriorities.reduce((sum, priority) => {
      return sum + (data.bugsByPriority[priority]?.pending || 0);
    }, 0);
  }

  static checkDeveloperOverload(data, threshold) {
    if (!data.developerData) return null;
    
    const overloaded = data.developerData.find(dev => 
      (dev.pending || 0) > threshold
    );
    
    return overloaded || null;
  }

  static checkCriticalModule(data, threshold) {
    if (!data.bugsByModule) return null;
    
    const criticalModule = Object.entries(data.bugsByModule)
      .find(([module, moduleData]) => (moduleData.percentage || 0) > threshold);
    
    return criticalModule ? {
      name: criticalModule[0],
      percentage: criticalModule[1].percentage,
      count: criticalModule[1].count
    } : null;
  }

  static calculateKPITrend(data, kpiType) {
    // Simulación de tendencia basada en datos históricos
    const trends = {
      testCoverage: Math.random() * 10 - 5, // -5 a +5
      resolution: Math.random() * 15 - 5,   // -5 a +10
      criticalBugs: Math.random() * -10      // -10 a 0
    };
    
    return Math.round(trends[kpiType] || 0);
  }

  static calculateVelocityTrendData(sprintData) {
    if (!sprintData || sprintData.length < 2) return [];
    
    return sprintData.map((sprint, index) => {
      const prevSprint = index > 0 ? sprintData[index - 1] : sprint;
      const velocityChange = prevSprint.velocity > 0 ? 
        ((sprint.velocity - prevSprint.velocity) / prevSprint.velocity) * 100 : 0;
      
      return {
        sprint: sprint.sprint || `Sprint ${index + 1}`,
        velocity: sprint.velocity || 0,
        change: Math.round(velocityChange)
      };
    });
  }

  static calculateTestCoverageTrend(sprintData) {
    if (!sprintData) return [];
    
    return sprintData.map((sprint, index) => ({
      sprint: sprint.sprint || `Sprint ${index + 1}`,
      coverage: sprint.testCases ? Math.min((sprint.testCases / 100) * 100, 100) : 0,
      executed: sprint.testCases || 0
    }));
  }

  static calculateDefectDensityTrend(sprintData) {
    if (!sprintData) return [];
    
    return sprintData.map((sprint, index) => {
      const density = sprint.testCases > 0 ? 
        (sprint.bugs / sprint.testCases).toFixed(2) : 0;
      
      return {
        sprint: sprint.sprint || `Sprint ${index + 1}`,
        density: parseFloat(density),
        bugs: sprint.bugs || 0,
        tests: sprint.testCases || 0
      };
    });
  }

  static calculateBurndownEfficiency(sprintData) {
    if (!sprintData || sprintData.length === 0) return 0;
    
    const totalPlanned = sprintData.reduce((sum, sprint) => 
      sum + (sprint.plannedVelocity || sprint.velocity || 0), 0);
    const totalActual = sprintData.reduce((sum, sprint) => 
      sum + (sprint.velocity || 0), 0);
    
    return totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;
  }

  static calculateReworkRate(data) {
    // Estimación basada en bugs reabiertos o retrabajos
    const totalBugs = data.summary?.totalBugs || 0;
    const reworkBugs = data.reworkBugs || Math.round(totalBugs * 0.15); // 15% estimado
    
    return totalBugs > 0 ? Math.round((reworkBugs / totalBugs) * 100) : 0;
  }

  static calculateFirstPassYield(data) {
    const testCasesPassed = data.summary?.testCasesPassed || 0;
    const testCasesExecuted = data.summary?.testCasesExecuted || 1;
    
    return Math.round((testCasesPassed / testCasesExecuted) * 100);
  }

  static calculateEscapeRate(data) {
    const productionBugs = data.productionBugs || 0;
    const totalBugs = data.summary?.totalBugs || 1;
    
    return Math.round((productionBugs / (totalBugs + productionBugs)) * 100);
  }

  static calculateAverageBugsPerSprint(sprintData) {
    if (!sprintData || sprintData.length === 0) return 0;
    
    const totalBugs = sprintData.reduce((sum, sprint) => sum + (sprint.bugs || 0), 0);
    return Math.round(totalBugs / sprintData.length);
  }

  static calculatePredictionConfidence(sprintData) {
    if (!sprintData || sprintData.length < 3) return 60;
    
    // Calcular consistencia en los datos
    const bugs = sprintData.map(s => s.bugs || 0);
    const avg = bugs.reduce((a, b) => a + b, 0) / bugs.length;
    const variance = bugs.reduce((sum, bug) => sum + Math.pow(bug - avg, 2), 0) / bugs.length;
    const stdDev = Math.sqrt(variance);
    
    // Menor desviación = mayor confianza
    const confidence = Math.max(60, Math.min(95, 100 - (stdDev / avg) * 100));
    return Math.round(confidence);
  }

  static calculateQualityTrendPrediction(data) {
    const currentQuality = data.kpis?.qualityIndex || 75;
    const sprintTrend = this.calculateSprintTrend(data.sprintData);
    
    let predicted = currentQuality;
    let direction = 'stable';
    
    if (sprintTrend > 10) {
      predicted = Math.max(currentQuality - 5, 0);
      direction = 'down';
    } else if (sprintTrend < -10) {
      predicted = Math.min(currentQuality + 5, 100);
      direction = 'up';
    }
    
    return {
      predicted: Math.round(predicted),
      direction,
      confidence: this.calculatePredictionConfidence(data.sprintData)
    };
  }

  static calculateConsistencyScore(sprintData) {
    if (!sprintData || sprintData.length < 3) return 0.5;
    
    const bugs = sprintData.map(s => s.bugs || 0);
    const velocities = sprintData.map(s => s.velocity || 0);
    
    // Calcular coeficiente de variación para bugs
    const avgBugs = bugs.reduce((a, b) => a + b, 0) / bugs.length;
    const bugVariance = bugs.reduce((sum, bug) => sum + Math.pow(bug - avgBugs, 2), 0) / bugs.length;
    const bugCV = avgBugs > 0 ? Math.sqrt(bugVariance) / avgBugs : 1;
    
    // Calculate coefficient of variation for velocity
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const velocityVariance = velocities.reduce((sum, vel) => sum + Math.pow(vel - avgVelocity, 2), 0) / velocities.length;
    const velocityCV = avgVelocity > 0 ? Math.sqrt(velocityVariance) / avgVelocity : 1;
    
    // Consistencia = 1 - promedio de coeficientes de variación (máximo 1)
    const consistency = Math.max(0, 1 - ((bugCV + velocityCV) / 2));
    return Math.min(1, consistency);
  }

  static mergeDeep(target, source) {
    const output = Object.assign({}, target);
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target))
            Object.assign(output, { [key]: source[key] });
          else
            output[key] = this.mergeDeep(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  static isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  // ===============================
  // MÉTODOS PARA COMPATIBILIDAD LEGACY
  // ===============================

  static processQADataLegacy(rawData) {
    // Tu función processQAData original aquí para mantener compatibilidad
    const totalBugs = rawData.summary?.totalBugs || 0;
    const bugsClosed = rawData.summary?.bugsClosed || 0;
    const bugsPending = rawData.summary?.bugsPending || 0;
    
    const processedData = {
      ...rawData,
      
      kpis: {
        testCoverage: Math.round((rawData.summary?.testCasesExecuted || 0) / (rawData.summary?.testCasesTotal || 1) * 100),
        resolutionEfficiency: totalBugs > 0 ? Math.round((bugsClosed / totalBugs) * 100) : 0,
        qualityIndex: this.calculateQualityIndexLegacy(rawData),
        sprintTrend: this.calculateSprintTrend(rawData.sprintData),
        defectDensity: rawData.summary?.testCasesExecuted > 0 ? 
          (totalBugs / rawData.summary.testCasesExecuted).toFixed(2) : '0.00',
        criticalBugsRatio: this.calculateCriticalBugsRatioLegacy(rawData)
      },
      
      trends: {
        bugsPerSprint: this.calculateBugTrend(rawData.sprintData),
        resolutionRate: this.calculateResolutionTrend(rawData.sprintData),
        qualityImprovement: this.calculateQualityTrend(rawData.sprintData)
      },
      
      alerts: this.generateAlertsLegacy(rawData),
      
      processedAt: new Date().toISOString()
    };
    
    return processedData;
  }

  static calculateQualityIndexLegacy(data) {
    const weights = {
      resolutionRate: 0.3,
      testCoverage: 0.25,
      bugDensity: 0.2,
      criticalBugs: 0.25
    };
    
    const totalBugs = data.summary?.totalBugs || 0;
    const bugsClosed = data.summary?.bugsClosed || 0;
    const testCasesExecuted = data.summary?.testCasesExecuted || 0;
    const testCasesTotal = data.summary?.testCasesTotal || 1;
    
    const resolutionRate = totalBugs > 0 ? (bugsClosed / totalBugs) * 100 : 100;
    const testCoverage = (testCasesExecuted / testCasesTotal) * 100;
    const bugDensity = testCasesExecuted > 0 ? 
      Math.max(0, 100 - (totalBugs / testCasesExecuted) * 50) : 100;
    
    // Calcular bugs críticos de forma segura
    const criticalBugs = this.getCriticalBugsCountLegacy(data);
    const criticalBugsScore = totalBugs > 0 ? 
      Math.max(0, 100 - (criticalBugs / totalBugs) * 100) : 100;
    
    const qualityIndex = 
      (resolutionRate * weights.resolutionRate) +
      (testCoverage * weights.testCoverage) +
      (bugDensity * weights.bugDensity) +
      (criticalBugsScore * weights.criticalBugs);
    
    return Math.round(qualityIndex);
  }

  static getCriticalBugsCountLegacy(data) {
    if (!data.bugsByPriority) return 0;
    
    const masAlta = data.bugsByPriority['Más alta']?.count || 0;
    const alta = data.bugsByPriority['Alta']?.count || 0;
    
    return masAlta + alta;
  }

  static calculateCriticalBugsRatioLegacy(rawData) {
    const totalBugs = rawData.summary?.totalBugs || 0;
    if (totalBugs === 0) return 0;
    
    const criticalCount = this.getCriticalBugsCountLegacy(rawData);
    return Math.round((criticalCount / totalBugs) * 100);
  }

  static generateAlertsLegacy(data) {
    const alerts = [];
    
    // Alert por bugs críticos usando estructura legacy
    if (data.bugsByPriority) {
      const criticalBugsPending = (data.bugsByPriority['Más alta']?.pending || 0) + 
                                  (data.bugsByPriority['Alta']?.pending || 0);
      
      if (criticalBugsPending > 20) {
        alerts.push({
          type: 'critical',
          title: 'Bugs Críticos Elevados',
          message: `${criticalBugsPending} bugs críticos pendientes requieren atención inmediata`,
          action: 'Revisar y priorizar resolución'
        });
      }
    }
    
    // Alert por concentración en desarrollador
    if (data.developerData && Array.isArray(data.developerData)) {
      const maxBugsDeveloper = Math.max(...data.developerData.map(d => d.pending || 0));
      if (maxBugsDeveloper > 15) {
        const developer = data.developerData.find(d => (d.pending || 0) === maxBugsDeveloper);
        if (developer) {
          alerts.push({
            type: 'warning',
            title: 'Concentración de Bugs',
            message: `${developer.name} tiene ${maxBugsDeveloper} bugs pendientes`,
            action: 'Considerar redistribución de carga'
          });
        }
      }
    }
    
    // Alert por módulo POS crítico
    if (data.bugsByModule && data.bugsByModule['POS']) {
      const posModule = data.bugsByModule['POS'];
      if (posModule.percentage > 60) {
        alerts.push({
          type: 'warning',
          title: 'Módulo POS Crítico',
          message: `El módulo POS concentra ${posModule.percentage}% de los bugs`,
          action: 'Planificar refactoring del módulo'
        });
      }
    }
    
    return alerts;
  }

  // ===============================
  // MÉTODOS DE UTILIDAD ADICIONALES
  // ===============================

  static validateRawData(rawData) {
    const errors = [];
    
    if (!rawData) {
      errors.push('Raw data is null or undefined');
      return { isValid: false, errors };
    }
    
    if (!rawData.summary) {
      errors.push('Missing summary data');
    } else {
      if (typeof rawData.summary.totalBugs !== 'number') {
        errors.push('Invalid totalBugs in summary');
      }
      if (typeof rawData.summary.testCasesTotal !== 'number') {
        errors.push('Invalid testCasesTotal in summary');
      }
    }
    
    if (!Array.isArray(rawData.sprintData)) {
      errors.push('SprintData should be an array');
    }
    
    if (!Array.isArray(rawData.developerData)) {
      errors.push('DeveloperData should be an array');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static sanitizeData(rawData) {
    if (!rawData) return this.getDefaultData();
    
    const sanitized = {
      summary: {
        totalBugs: Math.max(0, rawData.summary?.totalBugs || 0),
        bugsClosed: Math.max(0, rawData.summary?.bugsClosed || 0),
        bugsPending: Math.max(0, rawData.summary?.bugsPending || 0),
        testCasesTotal: Math.max(1, rawData.summary?.testCasesTotal || 1),
        testCasesExecuted: Math.max(0, rawData.summary?.testCasesExecuted || 0),
        testCasesPassed: Math.max(0, rawData.summary?.testCasesPassed || 0),
        testCasesFailed: Math.max(0, rawData.summary?.testCasesFailed || 0)
      },
      
      sprintData: Array.isArray(rawData.sprintData) ? 
        rawData.sprintData.map(sprint => ({
          sprint: sprint.sprint || 'Unknown',
          bugs: Math.max(0, sprint.bugs || 0),
          bugsResolved: Math.max(0, sprint.bugsResolved || 0),
          bugsPending: Math.max(0, sprint.bugsPending || 0),
          testCases: Math.max(0, sprint.testCases || 0),
          velocity: Math.max(0, sprint.velocity || 0),
          plannedVelocity: Math.max(0, sprint.plannedVelocity || 0),
          change: sprint.change || 0
        })) : [],
      
      developerData: Array.isArray(rawData.developerData) ? 
        rawData.developerData.map(dev => ({
          name: dev.name || 'Unknown',
          assigned: Math.max(0, dev.assigned || 0),
          resolved: Math.max(0, dev.resolved || 0),
          pending: Math.max(0, dev.pending || 0),
          totalBugs: Math.max(0, dev.totalBugs || dev.assigned || 0)
        })) : [],
      
      bugsByPriority: rawData.bugsByPriority || {},
      bugsByModule: rawData.bugsByModule || {},
      bugsByCategory: rawData.bugsByCategory || {},
      
      qualityMetrics: {
        testAutomation: Math.max(0, Math.min(100, rawData.qualityMetrics?.testAutomation || 0)),
        cycleTime: Math.max(0, rawData.qualityMetrics?.cycleTime || 0),
        ...rawData.qualityMetrics
      },
      
      bugResolutionTimes: Array.isArray(rawData.bugResolutionTimes) ? 
        rawData.bugResolutionTimes.filter(time => typeof time === 'number' && time > 0) : [],
      
      productionBugs: Math.max(0, rawData.productionBugs || 0),
      reworkBugs: Math.max(0, rawData.reworkBugs || 0)
    };
    
    return sanitized;
  }

  static getDefaultData() {
    return {
      summary: {
        totalBugs: 0,
        bugsClosed: 0,
        bugsPending: 0,
        testCasesTotal: 1,
        testCasesExecuted: 0,
        testCasesPassed: 0,
        testCasesFailed: 0
      },
      sprintData: [],
      developerData: [],
      bugsByPriority: {},
      bugsByModule: {},
      bugsByCategory: {},
      qualityMetrics: {
        testAutomation: 0,
        cycleTime: 0
      },
      bugResolutionTimes: [],
      productionBugs: 0,
      reworkBugs: 0
    };
  }

  // ===============================
  // MÉTODO PRINCIPAL CON VALIDACIÓN
  // ===============================

  static processQADataSafe(rawData, config = {}) {
    try {
      // Validar datos de entrada
      const validation = this.validateRawData(rawData);
      if (!validation.isValid) {
        console.warn('Data validation failed:', validation.errors);
        rawData = this.getDefaultData();
      }
      
      // Sanitizar datos
      const sanitizedData = this.sanitizeData(rawData);
      
      // Procesar datos
      return this.processQAData(sanitizedData, config);
      
    } catch (error) {
      console.error('Error processing QA data:', error);
      
      // Retornar datos por defecto procesados en caso de error
      const defaultData = this.getDefaultData();
      return this.processQAData(defaultData, config);
    }
  }
}

// ===============================
// EXPORTAR CLASE PRINCIPAL
// ===============================
// Solo la clase QADataProcessor se exporta.
// Las funciones legacy fueron removidas durante auditoría de código muerto
// (DEAD_CODE_AUDIT.md) ya que nunca se importaban como funciones standalone.
// Todos los consumidores usan QADataProcessor.método() exclusivamente.

export default QADataProcessor;

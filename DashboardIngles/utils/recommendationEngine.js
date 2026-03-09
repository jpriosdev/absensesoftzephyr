// utils/recommendationEngine.js

/**
 * Recommendation Engine that retrieves parametric recommendations from data
 * or uses default values if not available in Excel
 */

const DEFAULT_RECOMMENDATIONS = {
  testCases: [
    { condition: 'avg >= 200', text: 'Excellent coverage: Team maintains robust testing volume', priority: 'baja' },
    { condition: 'avg >= 150 && avg < 200', text: 'Acceptable coverage: Consider increasing cases for critical modules', priority: 'media' },
    { condition: 'avg < 150', text: 'Low coverage: Urgent need to increase test case volume', priority: 'alta' },
    { condition: 'default', text: 'Implement code coverage metrics to validate completeness', priority: 'media' },
    { condition: 'default', text: 'Automate repetitive cases to increase efficiency', priority: 'media' },
    { condition: 'default', text: 'Prioritize testing of critical business functionalities', priority: 'media' }
  ],
  resolutionEfficiency: [
    { condition: 'efficiency >= 80', text: 'Excellent efficiency: Highly productive team in resolution', priority: 'baja' },
    { condition: 'efficiency >= 70 && efficiency < 80', text: 'Good efficiency: Maintain current resolution pace', priority: 'baja' },
    { condition: 'efficiency < 70', text: 'Low efficiency: Analyze causes of unresolved bugs', priority: 'alta' },
    { condition: 'efficiency < 70', text: 'Review backlog: Prioritize closing old bugs', priority: 'alta' },
    { condition: 'default', text: 'Implement dailies to unblock impediments quickly', priority: 'media' },
    { condition: 'default', text: 'Establish SLAs by bug priority', priority: 'media' },
    { condition: 'default', text: 'Consider increasing team capacity if backlog grows', priority: 'baja' }
  ],
  criticalBugs: [
    { condition: 'total > 30', text: 'Critical level: Very high volume of critical bugs - requires immediate attention', priority: 'alta' },
    { condition: 'total > 20 && total <= 30', text: 'High pressure: Consider allocating additional resources', priority: 'alta' },
    { condition: 'total <= 20', text: 'Under control: Manageable volume of critical bugs', priority: 'baja' },
    { condition: 'default', text: 'Establish war room for bugs with "Highest" priority', priority: 'media' },
    { condition: 'default', text: 'Implement automated smoke tests for prevention', priority: 'media' },
    { condition: 'default', text: 'Review module architecture with high critical bug concentration', priority: 'media' },
    { condition: 'default', text: 'Increase code reviews for core functionalities', priority: 'media' }
  ],
  criticalBugsStatus: [
    { condition: 'pending > 15', text: 'Urgent: Excessive critical backlog - schedule focused daily', priority: 'alta' },
    { condition: 'pending > 15', text: 'Escalate resources: Reassign senior developers to critical bugs', priority: 'alta' },
    { condition: 'pending > 10 && pending <= 15', text: 'High priority: Accelerate closing of pending critical bugs', priority: 'alta' },
    { condition: 'pending <= 10 && pending > 0', text: 'Under control: Manageable volume, maintain closing velocity', priority: 'baja' },
    { condition: 'pending === 0', text: 'Excellent: All critical bugs are resolved!', priority: 'baja' },
    { condition: 'default', text: 'Establish 48h maximum SLA for "Highest" priority bugs', priority: 'media' },
    { condition: 'default', text: 'Implement daily triage of critical bugs', priority: 'media' },
    { condition: 'default', text: 'Automate notifications for critical bugs without update for 24h', priority: 'baja' }
  ],
  cycleTime: [
    { condition: 'avg > 10', text: 'High Cycle Time: Implement daily stand-ups to accelerate blocker resolution', priority: 'alta' },
    { condition: 'byPriority.critical > 5', text: 'Slow critical: Establish 48h SLA for critical bugs and assign dedicated resources', priority: 'alta' },
    { condition: 'avg <= 7', text: 'Excellent speed: Team maintains optimal resolution pace', priority: 'baja' },
    { condition: 'default', text: 'Consider test automation to detect bugs earlier', priority: 'media' },
    { condition: 'default', text: 'Review triage process to prioritize effectively', priority: 'media' }
  ],
  defectDensity: [
    { condition: 'avg > 2.0', text: 'Urgent: Implement mandatory code reviews before each commit', priority: 'alta' },
    { condition: 'avg > 2.0', text: 'Urgent: Increase unit test coverage to minimum 80%', priority: 'alta' },
    { condition: 'avg > 1.0 && avg <= 2.0', text: 'Establish Definition of Done with clear quality criteria', priority: 'media' },
    { condition: 'avg > 1.0 && avg <= 2.0', text: 'Implement pair programming for complex user stories', priority: 'media' },
    { condition: 'default', text: 'Analyze modules with high bug concentration for refactoring', priority: 'media' },
    { condition: 'default', text: 'Train team in TDD (Test-Driven Development)', priority: 'media' },
    { condition: 'critical > 0.3', text: 'Critical: High critical bug density indicates architecture or requirements problems', priority: 'alta' },
    { condition: 'avg <= 1.0', text: 'Maintain current quality practices - they are working well', priority: 'baja' }
  ]
};

export class RecommendationEngine {
  
  // Mapping of old names to new names
  static METRIC_NAME_MAP = {
    'testCases': 'mediaCasosEjecutados',
    'defectDensity': 'densidadDefectos',
    'cycleTime': 'tiempoPromedioResolucion',
    'criticalBugs': 'bugsCriticosDetectados',
    'criticalBugsStatus': 'estadoBugsCriticos',
    'resolutionEfficiency': 'eficienciaResolucion'
  };
  
  /**
   * Gets recommendations for a specific metric
   * @param {string} metricType - Metric type (testCases, resolutionEfficiency, etc.)
   * @param {object} data - Metric data to evaluate conditions
   * @param {object} excelRecommendations - Recommendations from Excel (optional)
   * @returns {array} List of applicable recommendations
   */
  static getRecommendations(metricType, data, excelRecommendations = null) {
    // Map old name to new if exists
    const newMetricName = this.METRIC_NAME_MAP[metricType] || metricType;
    
    // Try to get recommendations from Excel with new or old name
    const recommendations = 
      excelRecommendations?.[newMetricName] || 
      excelRecommendations?.[metricType] || 
      DEFAULT_RECOMMENDATIONS[metricType] || [];
    
    // Filter applicable recommendations based on conditions
    return recommendations
      .filter(rec => this.evaluateCondition(rec.condition, data))
      .map(rec => ({
        text: rec.text,
        priority: rec.priority || 'media',
        icon: this.getPriorityIcon(rec.priority),
        parametros: rec.parametros // Include range parameters if they exist
      }));
  }
  
  /**
   * Evaluates if a condition is met with the current data
   */
  static evaluateCondition(condition, data) {
    if (condition === 'default') return true;
    
    try {
      // Create function that evaluates the condition
      const conditionFn = new Function(...Object.keys(data), `return ${condition}`);
      return conditionFn(...Object.values(data));
    } catch (error) {
      console.warn('Error evaluating condition:', condition, error);
      return false;
    }
  }
  
  /**
   * Gets the icon corresponding to priority
   */
  static getPriorityIcon(priority) {
    switch (priority?.toLowerCase()) {
      case 'alta':
        return '🚨';
      case 'media':
        return '⚠️';
      case 'baja':
        return '✅';
      default:
        return '•';
    }
  }
  
  /**
   * Formats recommendations to display in the modal
   */
  static formatRecommendations(recommendations) {
    return recommendations.map(rec => {
      const icon = rec.icon || this.getPriorityIcon(rec.priority);
      const boldText = rec.text.includes(':') ? rec.text.split(':')[0] : '';
      
      if (boldText) {
        const restText = rec.text.substring(boldText.length + 1);
        return `${icon} <strong>${boldText}:</strong>${restText}`;
      }
      
      return `${icon} ${rec.text}`;
    });
  }
}

export default RecommendationEngine;

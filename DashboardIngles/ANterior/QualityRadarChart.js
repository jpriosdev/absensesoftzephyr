import React, { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ChevronDown, AlertCircle, TrendingUp, Shield, Zap, Eye, X, Filter } from 'lucide-react';

// Componente de Sección de Filtro
function FilterSection({ title, icon, color, options, selected, onChange }) {
  const [collapsed, setCollapsed] = useState(false);
  
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
  };

  const buttonClasses = {
    blue: 'bg-blue-500 hover:bg-blue-600',
    red: 'bg-red-500 hover:bg-red-600',
    green: 'bg-green-500 hover:bg-green-600',
    indigo: 'bg-indigo-500 hover:bg-indigo-600',
    orange: 'bg-orange-500 hover:bg-orange-600',
    cyan: 'bg-cyan-500 hover:bg-cyan-600',
    teal: 'bg-teal-500 hover:bg-teal-600',
    pink: 'bg-pink-500 hover:bg-pink-600',
    violet: 'bg-violet-500 hover:bg-violet-600',
  };

  return (
    <div className={`border rounded-lg p-3 ${colorClasses[color]}`}>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between mb-2"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <p className="text-xs font-bold uppercase">{title}</p>
          {selected.length > 0 && (
            <span className="ml-1 px-2 py-.5 bg-white bg-opacity-50 text-xs font-bold rounded">
              {selected.length}
            </span>
          )}
        </div>
        <ChevronDown size={14} className={`transition-transform ${collapsed ? '' : 'rotate-180'}`} />
      </button>

      {!collapsed && (
        <div className="flex flex-wrap gap-1.5">
          {options.slice(0, 6).map(option => (
            <button
              key={option}
              onClick={() => onChange(option)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all whitespace-nowrap ${
                selected.includes(option)
                  ? `${buttonClasses[color]} text-white shadow-md`
                  : 'bg-white bg-opacity-70 hover:bg-opacity-100'
              }`}
            >
              {option}
            </button>
          ))}
          {options.length > 6 && (
            <button
              onClick={() => setCollapsed(false)}
              className="px-2.5 py-1 text-xs font-semibold text-gray-600 bg-white bg-opacity-70 rounded-full hover:bg-opacity-100"
            >
              +{options.length - 6}
            </button>
          )}
        </div>
      )}

      {collapsed && (
        <div className="space-y-1">
          {options.map(option => (
            <label key={option} className="flex items-center gap-2 cursor-pointer hover:bg-white hover:bg-opacity-30 p-1.5 rounded transition-all">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => onChange(option)}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <span className="text-sm font-medium">{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

const MATURITY_LEVELS = {
  0: {
    name: 'No Maturity (Baseline)',
    maturityGap: 'Current state',
    executiveSummary: 'Manual and disorganized processes. Reactive testing detects defects in production. High risk and costs.',
    benefits: [
      'No initial investment in tools',
      'Maximum operational flexibility',
    ],
    riskMitigation: [
      '⚠ 60-80% defects escape to production',
      '⚠ Slow release cycles (1-2 months)',
      '⚠ Zero real-time quality visibility',
      '⚠ Zero shift-left: Testing starts in QA',
    ],
    processEfficiency: [
      '❌ Testing manual 100%',
      '❌ ~4 hours QA per feature',
      '❌ No metrics of coverage',
      '❌ Debugging manual of failures',
    ],
    observability: [
      '❌ No visibility in development',
      '❌ Manual logs without aggregation',
      '❌ Failures discovered by users',
      '❌ Root cause takes 2-3 days',
    ],
    shiftStrategy: [
      '📍 0% Shift-Left: Testing at the end',
      '📍 0% Shift-Right: No monitoring in production',
    ],
    attributes: {
      'Methodology': 5,
      'Functional': 5,
      'Performance': 2,
      'Security': 0,
      'Automation': 0,
      'Data': 0,
      'AI Adoption': 0,
      'Observability': 1,
    },
    impact: [
      '💰 Cost of defects in prod: $10K-50K per incident',
      '📉 Velocity of release: 6-8 weeks',
      '😞 Satisfaction of client: 60-70%',
      '⏰ MTTR (Mean Time To Resolve): 2-3 days',
    ],
  },
  1: {
    name: 'Initial',
    maturityGap: 'First organized steps',
    executiveSummary: 'Documented but still manual testing. QA integrated in sprints. First metrics. Detects 40-50% defects.',
    benefits: [
      'Documented and reproducible test cases',
      'Visible improvement in defects detected (vs Level 0)',
      'Initial traceability of tests',
      'QA participation in planning',
    ],
    riskMitigation: [
      '⚠ 40-50% defects still escape',
      '⚠ Release cycles reduced to 3-4 weeks',
      '⚠ Manual observability without automation',
      '⚠ 10% Shift-Left: Only in planning',
    ],
    processEfficiency: [
      '✓ Testing manual 95%, automation 5%',
      '✓ ~2.5 hours QA per feature',
      '✓ Basic metrics (pass/fail)',
      '✓ Manual tracking of defects',
    ],
    observability: [
      '⚠ Limited visibility to reports',
      '⚠ No automatic alerts',
      '⚠ Logs not aggregated centrally',
      '⚠ Root cause takes 1-2 days',
    ],
    shiftStrategy: [
      '📍 10% Shift-Left: QA in Daily Standups',
      '📍 5% Shift-Right: Manual feedback from users',
    ],
    attributes: {
      'Methodology': 40,
      'Functional': 40,
      'Performance': 10,
      'Security': 0,
      'Automation': 20,
      'Data': 10,
      'AI Adoption': 10,
      'Observability': 0,
    },
    impact: [
      '💰 Cost of defects in prod: $5K-25K per incident',
      '📈 Improvement: -40% defects vs Level 0',
      '📉 Velocity of release: 3-4 weeks',
      '😊 Satisfaction of client: 70-75%',
      '⏰ MTTR: 1-2 days',
    ],
  },
  2: {
    name: 'Repeatable',
    maturityGap: 'Automation begins',
    executiveSummary: 'First automated tests (10-30%). Basic CI. Functional risks controlled. Less surprises.',
    benefits: [
      'Automation of functional regression tests (10-30%)',
      'Basic CI Pipeline: fewer defects in stage',
      'Faster test execution',
      'Traceability of test cases',
    ],
    riskMitigation: [
      '✓ 20-30% defects escape (significant improvement)',
      '✓ Release cycles 2-3 weeks',
      '✓ Some functional risks prevented',
      '✓ 20% Shift-Left: Automation of regression',
    ],
    processEfficiency: [
      '✓ Testing manual 70%, automation 30%',
      '✓ ~1.5 hours QA per feature',
      '✓ Basic coverage metrics (line coverage)',
      '✓ Automatic execution of regression suites',
    ],
    observability: [
      '✓ CI/CD build reports',
      '✓ Test results in basic dashboards',
      '⚠ No observability in production yet',
      '⚠ Root cause takes ~24 hours',
    ],
    shiftStrategy: [
      '📍 20% Shift-Left: Automation of regression',
      '📍 10% Shift-Right: Basic alerts of failures',
    ],
    attributes: {
      'Methodology': 60,
      'Functional': 70,
      'Performance': 25,
      'Security': 15,
      'Automation': 40,
      'Data': 30,
      'AI Adoption': 25,
      'Observability': 40,
    },
    impact: [
      '💰 Cost of defects in prod: $2K-10K per incident',
      '📈 Improvement: -70% defects vs Level 0',
      '⚡ Velocity of release: 2-3 weeks',
      '😊 Satisfaction of client: 75-80%',
      '⏰ MTTR: 12-18 hours',
    ],
  },
  3: {
    name: 'Defined',
    maturityGap: 'Testing fully integrated in DevOps',
    executiveSummary: 'Proactive Shift-Left. Testing in each stage of the pipeline. Security and performance integrated. 5-10% defects escape.',
    benefits: [
      'Defects detected in development (Shift-Left)',
      'CI/CD with automated gates of quality',
      'Security and performance integrated tests',
      'Continuous improvement based on metrics',
    ],
    riskMitigation: [
      '✓ 5-10% defects escape (high control)',
      '✓ Release cycles 1-2 weeks',
      '✓ Functional and performance risks prevented',
      '✓ 40% Shift-Left: Testing from planning',
    ],
    processEfficiency: [
      '✓ Testing manual 40%, automation 60%',
      '✓ ~45 minutes QA per feature',
      '✓ Coverage >70%, risks mapped',
      '✓ Automatic execution in each commit',
    ],
    observability: [
      '✓ Dashboards of quality in real time',
      '✓ Automatic alerts of regressions',
      '✓ Centralized logs (ELK, Datadog)',
      '✓ Root cause identified in <2 hours',
    ],
    shiftStrategy: [
      '📍 40% Shift-Left: Security & performance from design',
      '📍 20% Shift-Right: Production monitoring + alerts',
    ],
    attributes: {
      'Methodology': 80,
      'Functional': 80,
      'Performance': 50,
      'Security': 40,
      'Automation': 60,
      'Data': 50,
      'AI Adoption': 40,
      'Observability': 50,
    },
    impact: [
      '💰 Cost of defects in prod: $500-2K per incident',
      '📈 Improvement: -95% defects vs Level 0',
      '⚡ Velocity of release: 1-2 weeks',
      '😍 Satisfaction of client: 85-90%',
      '⏰ MTTR: 2-4 hours',
    ],
  },
  4: {
    name: 'Managed',
    maturityGap: 'Intelligent testing with data-driven insights',
    executiveSummary: 'Complete automation of functional tests. ML for predictive analysis. Security continuous. <1% defects escape.',
    benefits: [
      'Complete automation of functional tests (70-85%)',
      'Predictive analysis of defects with ML',
      'Advanced security tests in each release',
      'Optimization of test suites',
    ],
    riskMitigation: [
      '✓ <1% defects escape (critical control)',
      '✓ Hotfix releases in hours',
      '✓ Security and compliance validated continuously',
      '✓ 60% Shift-Left: Analysis of code + tests automatically',
    ],
    processEfficiency: [
      '✓ Testing manual 15%, automation 85%',
      '✓ ~15 minutes QA per feature',
      '✓ Coverage >85%, analysis of risks automatically',
      '✓ Parallel execution in minutes',
    ],
    observability: [
      '✓ Observability IA-driven in prod',
      '✓ Prediction of failures before they occur',
      '✓ Distributed tracing complete',
      '✓ Root cause identified in <30 minutes',
    ],
    shiftStrategy: [
      '📍 60% Shift-Left: SAST, dynamic analysis, threat modeling',
      '📍 40% Shift-Right: IA monitoring, intelligent alerts, canary deployments',
    ],
    attributes: {
      'Methodology': 90,
      'Functional': 80,
      'Performance': 70,
      'Security': 60,
      'Automation': 80,
      'Data': 70,
      'AI Adoption': 60,
      'Observability': 60,
    },
    impact: [
      '💰 Cost of defects in prod: <$500 per incident',
      '📈 Improvement: -99% defects vs Level 0',
      '⚡ Velocity of release: On-demand (hours)',
      '😍 Satisfaction of client: 90-95%',
      '⏰ MTTR: 15-30 minutes',
    ],
  },
  5: {
    name: 'Optimized',
    maturityGap: 'Excellence in operations with AI/ML',
    executiveSummary: 'Testing almost invisible for developers. Automatic generation of test cases. Observability predictive. Continuous improvement autonomous.',
    benefits: [
      'Automatic generation of test cases (IA)',
      'Predictive testing before production',
      'Observability with IA predicts incidents',
      'Continuous improvement completely autonomous',
    ],
    riskMitigation: [
      '✓ Defects near to CERO',
      '✓ Preventive incidents (predicted before)',
      '✓ Security and compliance automatic',
      '✓ 80% Shift-Left: IA generates tests automatically',
    ],
    processEfficiency: [
      '✓ Testing manual 5%, automation 95%',
      '✓ Developers without testing overhead',
      '✓ Coverage >95%, adapted automatically',
      '✓ Test execution seconds',
    ],
    observability: [
      '✓ Observability total with IA/ML',
      '✓ Prediction of degradation 12-48h in advance',
      '✓ Causal analysis automatic',
      '✓ Root cause identified automatically',
    ],
    shiftStrategy: [
      '📍 80% Shift-Left: IA generates tests, SAST autonomous, fuzzing continuous',
      '📍 60% Shift-Right: Autonomous monitoring 24/7, intelligent alerts, self-healing tests',
    ],
    attributes: {
      'Methodology': 90,
      'Functional': 100,
      'Performance': 80,
      'Security': 70,
      'Automation': 90,
      'Data': 90,
      'AI Adoption': 80,
      'Observability': 80,
    },
    impact: [
      '💰 Cost of defects: $0 (prevented)',
      '📈 Improvement: -99.5% defects vs Level 0',
      '⚡ Velocity of release: Continuous deployment',
      '😍 Satisfaction of client: 95%+',
      '⏰ MTTR: <5 minutes (automatic)',
    ],
  },
  6: {
    name: 'Intelligent',
    maturityGap: 'Future: Invisible and autonomous testing',
    executiveSummary: 'IA generative creates and repairs tests. Zero manual intervention. Observability cognitive. Business in maximum tempo.',
    benefits: [
      'Self-repairable tests with IA',
      'IA generative creates new test cases automatically',
      'Zero-touch testing: developers write code',
      'Business iterates at maximum speed',
    ],
    riskMitigation: [
      '✓ Defects practically eliminated',
      '✓ Preventive incidents automatically',
      '✓ Compliance and security automatic 24/7',
      '✓ 100% Shift-Left: IA omnipresent in development',
    ],
    processEfficiency: [
      '✓ Testing manual 0%, IA 100%',
      '✓ Code to production: minutes',
      '✓ Dynamic and adaptable coverage',
      '✓ Zero QA overhead',
    ],
    observability: [
      '✓ Cognición total: IA understands the code intention',
      '✓ Anticipation: problems detected before they occur',
      '✓ Auto-remediation: IA repairs automatically',
      '✓ Root cause: cognitive explanation automatically',
    ],
    shiftStrategy: [
      '📍 100% Shift-Left: IA cognitive in IDE, auto-test generation',
      '📍 100% Shift-Right: Observability total, auto-remediation, predictive infrastructure',
    ],
    attributes: {
      'Methodology': 100,
      'Functional': 100,
      'Performance': 100,
      'Security': 100,
      'Automation': 100,
      'Data': 100,
      'AI Adoption': 100,
      'Observability': 100,
    },
    impact: [
      '💰 Cost of defects: $0',
      '📈 Improvement: -100% defects vs Level 0',
      '⚡ Time-to-market: Hours/minutes',
      '😍 Satisfaction of client: 99%+',
      '⏰ MTTR: Automatic',
    ],
  },
};

export default function QualityRadarChart({ data = {} }) {
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [expandedLevel, setExpandedLevel] = useState(null);

  const currentLevel = MATURITY_LEVELS[0];
  const targetLevel = MATURITY_LEVELS[selectedLevel];

  const radarData = Object.entries(targetLevel.attributes).map(([category, value]) => ({
    category,
    value,
    fullMark: 100,
  }));

  return (
    <div className="space-y-3">
      {/* Compact selector in header/modal */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Maturity Roadmap</h3>
        </div>
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
          className="px-3 py-1 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {Object.entries(MATURITY_LEVELS).map(([level, info]) => (
            <option key={level} value={level}>
              Level {level}: {info.name}
            </option>
          ))}
        </select>
      </div>

      {/* Radar Chart - Main */}
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <div className="w-full" style={{ height: '500px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 40, right: 120, left: 120, bottom: 40 }}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="category" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name={`Level ${selectedLevel}`} dataKey="value" stroke="#8b5cf6" fill="#a78bfa" fillOpacity={.6} />
              <Tooltip formatter={(value) => `${Math.round(value)}%`} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Side-by-side comparison - compact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Current Level (Baseline) */}
        <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-xs">0</div>
              <div>
                <p className="text-xs text-gray-600 uppercase font-semibold">Current</p>
                <p className="text-sm font-bold text-gray-900">{currentLevel.name}</p>
              </div>
          </div>
          <p className="text-xs text-gray-700 leading-tight italic">{currentLevel.executiveSummary}</p>
        </div>

        {/* Target Level */}
        <div className="border border-purple-500 rounded-lg p-3 bg-purple-50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-xs">{selectedLevel}</div>
            <div>
              <p className="text-xs text-gray-600 uppercase font-semibold">Target</p>
              <p className="text-sm font-bold text-purple-900">{targetLevel.name}</p>
            </div>
          </div>
          <p className="text-xs text-gray-700 leading-tight italic">{targetLevel.executiveSummary}</p>
        </div>
      </div>

      {/* Benefits, Risks and Efficiency - improved readability */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-lg shadow-sm border border-green-300 border-l-4 border-l-green-500">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-green-600" />
            <h4 className="text-sm font-bold text-gray-900">Benefits</h4>
          </div>
          <ul className="space-y-2">
            {targetLevel.benefits.map((benefit, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 leading-snug">
                <span className="text-green-600 font-bold text-lg flex-shrink-0 mt-.5">✓</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-white p-4 rounded-lg shadow-sm border border-red-300 border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} className="text-red-600" />
            <h4 className="text-sm font-bold text-gray-900">Risks</h4>
          </div>
          <ul className="space-y-2">
            {targetLevel.riskMitigation.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 leading-snug">
                <span className="flex-shrink-0 font-bold text-red-600">{risk.split(' ')[0]}</span>
                <span>{risk.substring(2)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg shadow-sm border border-blue-300 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={18} className="text-blue-600" />
            <h4 className="text-sm font-bold text-gray-900">Efficiency</h4>
          </div>
          <ul className="space-y-2">
            {targetLevel.processEfficiency.map((eff, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 leading-snug">
                <span className="flex-shrink-0 font-bold text-blue-600">{eff.split(' ')[0]}</span>
                <span>{eff.substring(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Observability and Shift Strategy - improved readability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-yellow-50 to-white p-4 rounded-lg shadow-sm border border-yellow-300 border-l-4 border-l-yellow-500">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={18} className="text-yellow-600" />
            <h4 className="text-sm font-bold text-gray-900">Observability</h4>
          </div>
          <ul className="space-y-2">
            {targetLevel.observability.map((obs, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 leading-snug">
                <span className="flex-shrink-0 font-bold text-yellow-600">{obs.split(' ')[0]}</span>
                <span>{obs.substring(2)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-lg shadow-sm border border-indigo-300 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={18} className="text-indigo-600" />
            <h4 className="text-sm font-bold text-gray-900">Shift-Left/Right</h4>
          </div>
          <ul className="space-y-2">
            {targetLevel.shiftStrategy.map((shift, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 leading-snug">
                <span className="flex-shrink-0 font-bold text-indigo-600">{shift.split(' ')[0]}</span>
                <span>{shift.substring(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Business Impact - compact */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
        <h4 className="text-xs font-bold text-gray-900 mb-2">Impact - Level {selectedLevel}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {targetLevel.impact.map((item, idx) => (
            <div key={idx} className="flex items-start gap-1 p-1 bg-white rounded">
              <span className="text-sm flex-shrink-0">{item.split(' ')[0]}</span>
              <p className="text-xs text-gray-900">{item.substring(2)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Attribute Comparison - compact */}
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <h4 className="text-xs font-bold text-gray-900 mb-2">Attributes</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.keys(MATURITY_LEVELS[0].attributes).map((attr) => (
            <div key={attr} className="p-2 bg-gradient-to-br from-gray-50 to-white rounded border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">{attr}</p>
              <div className="flex items-center justify-between mb-1 text-xs">
                <div className="text-center">
                  <p className="font-bold text-gray-400">{currentLevel.attributes[attr]}%</p>
                </div>
                <div>→</div>
                <div className="text-center">
                  <p className="font-bold text-purple-600">{targetLevel.attributes[attr]}%</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div className="bg-purple-600 h-1 rounded-full" style={{ width: `${targetLevel.attributes[attr]}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estimated ROI by maturity level */}
      {(() => {
        const roiMultipliers = {0:0.05,1:0.1,2:0.25,3:0.45,4:0.7,5:0.9,6:0.98};
        const baseAnnualCost = 300000; // base de referencia (costos por defectos/uops)
        const estimatedSavings = Math.round(baseAnnualCost * (roiMultipliers[selectedLevel] || 0));
        const ttmImprovements = ['0%','5%','10%','20%','35%','50%','65%'];
        const mttrImprovements = ['0%','10%','15%','30%','45%','60%','80%'];

        return (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="text-lg font-bold text-gray-900">Estimated ROI by Maturity</h4>
            <p className="text-sm text-gray-600">Simplified estimate of annual savings from defect reduction and operational improvements for the selected target level.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-xs text-gray-600">Estimated annual savings</div>
                  <div className="text-2xl font-bold text-green-700">${estimatedSavings.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Based on ${baseAnnualCost.toLocaleString()}</div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-xs text-gray-600">Time-to-market improvement</div>
                <div className="text-2xl font-bold text-blue-700">{ttmImprovements[selectedLevel] || 'N/A'}</div>
                <div className="text-xs text-gray-500">Estimated % acceleration</div>
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="text-xs text-gray-600">MTTR reduction</div>
                <div className="text-2xl font-bold text-yellow-700">{mttrImprovements[selectedLevel] || 'N/A'}</div>
                <div className="text-xs text-gray-500">Estimated % reduction</div>
              </div>
            </div>
          </div>
        );
      })()}


    </div>
  );
}



// pages/api/config.js
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const configPath = path.join(process.cwd(), 'config/qa-config.json');

  if (req.method === 'GET') {
    try {
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        res.status(200).json(JSON.parse(configData));
      } else {
        // Default configuration
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
            maxBugTrendIncrease: 20
          },
          priorities: {
            critical: ["Más alta", "Alta"],
            high: ["Media"],
            low: ["Baja", "Más baja"]
          }
        };
        res.status(200).json(defaultConfig);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      res.status(500).json({ error: 'Error loading configuration' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

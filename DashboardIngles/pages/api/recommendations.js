// pages/api/recommendations.js
import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'recommendations.json');
    
    // Verificar si existe el archivo
    if (!fs.existsSync(filePath)) {
      // Return default recommendations if file doesn't exist
      return res.status(200).json({});
    }
    
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const recommendations = JSON.parse(fileContents);
    
    res.status(200).json(recommendations);
  } catch (error) {
    console.error('Error reading recommendations:', error);
    res.status(500).json({ error: 'Error loading recommendations' });
  }
}

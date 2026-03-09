import sqlite3
import json
from collections import Counter, defaultdict

# Conexión a la base de datos
conn = sqlite3.connect('qa-dashboard.db')
cursor = conn.cursor()

# 1. Leer todos los datos de la tabla datamock
cursor.execute("SELECT Sector, SubSector, Categoria, Tipo, Entidad, Ingresos, Empleados, SitioWeb, UbicacionPrincipal FROM datamock")
rows = cursor.fetchall()

# 2. Generar agregados y agrupaciones
entities = []
category_counter = Counter()
sector_counter = Counter()
employees_total = 0
for row in rows:
    entity = {
        "Sector": row[0],
        "SubSector": row[1],
        "Categoria": row[2],
        "Tipo": row[3],
        "Entidad": row[4],
        "Ingresos": row[5],
        "Empleados": row[6],
        "SitioWeb": row[7],
        "UbicacionPrincipal": row[8]
    }
    entities.append(entity)
    category_counter[row[2]] += 1
    sector_counter[row[0]] += 1
    try:
        employees_total += int(str(row[6]).replace(",", "").replace("\"", ""))
    except:
        pass

# 3. Construir el JSON en formato dashboard
qa_data = {
    "metadata": {
        "lastUpdated": "2025-12-01",
        "source": "sqlite-datamock",
        "version": "2.0",
        "totalEntities": len(entities)
    },
    "summary": {
        "totalEntities": len(entities),
        "totalEmployees": employees_total,
        "categories": dict(category_counter),
        "sectors": dict(sector_counter)
    },
    "entities": entities
}

with open('DashboardDemo/data/qa-data.json', 'w', encoding='utf-8') as f:
    json.dump(qa_data, f, ensure_ascii=False, indent=2)

conn.close()
print('Exportación a qa-data.json completada y ajustada a la nueva estructura.')

import sqlite3
import json

# Conexión a la base de datos
conn = sqlite3.connect('qa-dashboard.db')
cursor = conn.cursor()

# Consulta todos los registros de la tabla datamock
cursor.execute("SELECT Sector, SubSector, Categoria, Tipo, Entidad, Ingresos, Empleados, SitioWeb, UbicacionPrincipal FROM datamock")
rows = cursor.fetchall()

# Convierte los resultados a una lista de diccionarios
data = [
    {
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
    for row in rows
]

# Guarda el resultado en un archivo JSON
with open('DashboardDemo/data/qa-data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

conn.close()
print('Exportación a qa-data.json completada.')

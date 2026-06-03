# VAM API Reference

## Descripción General

El módulo VAM (Velocidad Aeróbica Máxima) permite a los coaches registrar resultados de tests de campo y calcular automáticamente:
- 8 zonas de entrenamiento con velocidades y ritmos
- Tiempos estimados de sprint para 11 distancias
- Histórico de progresión de VAM

---

## Endpoints

### 1. Crear Test VAM
```
POST /vam-tests
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Request Body:
{
  "athlete_id": 5,
  "date": "2024-05-24",
  "test_type": "vam_2000m",      // vam_2000m | vam_5min | test_30_15_ift | yoyo_ri1
  "value1": 2000,                // distancia (m) o velocidad (km/h) según test_type
  "value2": 7,                   // tiempo (min) o nivel según test_type [OPCIONAL]
  "notes": "Notas del test"       // [OPCIONAL]
}

Response (201 Created):
{
  "id": 1,
  "athlete_id": 5,
  "date": "2024-05-24",
  "test_type": "vam_2000m",
  "vam_mpm": 285.71,
  "vam_kmh": 17.14,
  "vam_ms": 4.76,
  "notes": "Notas del test",
  "zonas": [
    {
      "zona": "Zona 1",
      "intensidad": "Recuperación",
      "pct_min": 0.55,
      "pct_max": 0.65,
      "velocidad_ms": 3.25,
      "velocidad_kmh": 11.7,
      "ritmo_min_seg": 323.1,      // segundos por km (mínimo ritmo)
      "ritmo_max_seg": 381.8       // segundos por km (máximo ritmo)
    },
    // ... 7 zonas más (Zona 2 a Zona 8)
  ],
  "tiempos_sprint": [
    {
      "distancia": 10,
      "tiempo_segundos": 2.10
    },
    {
      "distancia": 20,
      "tiempo_segundos": 4.20
    },
    // ... hasta 1000m
  ]
}
```

#### Valores de `test_type` y parámetros:

| test_type | value1 | value2 | Descripción |
|-----------|--------|--------|-------------|
| `vam_2000m` | distancia (m) | tiempo (min) | Test de distancia fija |
| `vam_5min` | tiempo (min) | distancia (m) | Test de tiempo fijo |
| `test_30_15_ift` | velocidad (km/h) | - | 30-15 IFT alcanzada |
| `yoyo_ri1` | nivel | velocidad (km/h) | Yo-Yo RI1 completado |

---

### 2. Listar Tests VAM del Atleta
```
GET /athletes/{athlete_id}/vam-tests
Authorization: Bearer <JWT_TOKEN>

Response (200 OK):
[
  {
    "id": 1,
    "athlete_id": 5,
    "date": "2024-05-20",
    "test_type": "vam_2000m",
    "vam_kmh": 16.8
  },
  {
    "id": 2,
    "athlete_id": 5,
    "date": "2024-05-24",
    "test_type": "vam_2000m",
    "vam_kmh": 17.14
  }
]
```

---

### 3. Obtener Test VAM Específico
```
GET /vam-tests/{test_id}
Authorization: Bearer <JWT_TOKEN>

Response (200 OK):
{
  "id": 1,
  "athlete_id": 5,
  "date": "2024-05-24",
  "test_type": "vam_2000m",
  "vam_mpm": 285.71,
  "vam_kmh": 17.14,
  "vam_ms": 4.76,
  "notes": null,
  "zonas": [
    // 8 zonas con todas las métricas
  ],
  "tiempos_sprint": [
    // 11 distancias con tiempos
  ]
}
```

---

### 4. Obtener Histórico de Progresión VAM
```
GET /athletes/{athlete_id}/vam-progress
Authorization: Bearer <JWT_TOKEN>

Response (200 OK):
{
  "athlete_id": 5,
  "history": [
    {
      "date": "2024-05-15",
      "vam_kmh": 16.5,
      "test_type": "vam_2000m"
    },
    {
      "date": "2024-05-20",
      "vam_kmh": 16.8,
      "test_type": "test_30_15_ift"
    },
    {
      "date": "2024-05-24",
      "vam_kmh": 17.14,
      "test_type": "vam_2000m"
    }
  ]
}
```

---

## Códigos de Error

| Código | Descripción |
|--------|-------------|
| `400` | Parámetros inválidos (ej: valor negativo, test_type desconocido) |
| `401` | Token JWT inválido o expirado |
| `403` | Acceso denegado (el coach no es propietario del atleta) |
| `404` | Recurso no encontrado (ej: test_id inexistente) |

---

## Ejemplo de Flujo Completo (Frontend)

```javascript
// 1. Registrar un test de 2000m
const response = await fetch('/vam-tests', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    athlete_id: 5,
    date: '2024-05-24',
    test_type: 'vam_2000m',
    value1: 2000,  // 2000 metros
    value2: 7,     // 7 minutos
    notes: 'Buena ejecución'
  })
});

const testResult = await response.json();

// 2. Mostrar las 8 zonas
testResult.zonas.forEach(zona => {
  console.log(`${zona.zona}: ${zona.intensidad}`);
  console.log(`  Velocidad: ${zona.velocidad_kmh} km/h`);
  console.log(`  Ritmo: ${zona.ritmo_min_seg} - ${zona.ritmo_max_seg} seg/km`);
});

// 3. Mostrar tiempos de sprint
testResult.tiempos_sprint.forEach(sprint => {
  console.log(`${sprint.distancia}m: ${sprint.tiempo_segundos}s`);
});

// 4. Obtener histórico para gráfico
const progress = await fetch(`/athletes/5/vam-progress`, {
  headers: { 'Authorization': 'Bearer ' + token }
}).then(r => r.json());

// Usar progress.history para graficar VAM en el tiempo
```

---

## Datos Técnicos

### Cálculo de Ritmo
```
ritmo_seg_por_km = (1000 / velocidad_en_mpm) * 60
```

Ejemplo:
- VAM = 300 m/min
- Zona 1 (65% = 195 m/min): ritmo = (1000/195)*60 = 307.7 seg/km ≈ 5:07/km

### Conversión de Unidades
```
m/min a km/h:  (m/min * 60) / 1000
m/min a m/s:   m/min / 60
km/h a m/s:    km/h / 3.6
```

---

## Restricciones de Validación

- `athlete_id`: debe existir y pertenecer al coach autenticado
- `date`: formato ISO (YYYY-MM-DD)
- `test_type`: solo uno de los 4 valores permitidos
- `value1`, `value2`: deben ser números positivos válidos
- Campos opcionales: `value2`, `notes` pueden ser null

---

**Última actualización:** 24 May 2026

const fs = require('node:fs');
const path = require('node:path');

const {
  evaluateDeviationThresholds,
} = require('../.evaluation-build/features/location/deviationCalibration.js');

const outputDirectory = path.resolve(
  __dirname,
  '../../docs/evaluation/artifacts',
);

function csvValue(value) {
  if (value === null) {
    return '';
  }
  const text = String(value);
  return /[",\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(filename, rows) {
  if (rows.length === 0) {
    throw new Error('La evaluación no puede generar un archivo vacío.');
  }
  const columns = Object.keys(rows[0]);
  const lines = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(',')),
  ];
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(outputDirectory, filename),
    `${lines.join('\n')}\n`,
    'utf8',
  );
}

const result = evaluateDeviationThresholds();
writeCsv('rerouting-umbrales-predicciones.csv', result.predictions);
writeCsv('rerouting-umbrales-resumen.csv', result.summaries);

console.log(
  `Umbral seleccionado: ${result.selectedThresholdM} m. ` +
    `${result.cases.length} casos y ${result.predictions.length} predicciones guardadas.`,
);

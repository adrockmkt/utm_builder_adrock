export function toCsv(rows, columns) {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(',');
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(row[column.key])).join(',')
  );

  return [header, ...body].join('\n');
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const text = escapeSpreadsheetFormula(String(value));
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function escapeSpreadsheetFormula(value) {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

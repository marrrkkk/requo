export type CsvColumn<TRecord> = {
  header: string;
  render: (record: TRecord) => string | number | null | undefined;
};

function escapeCsvValue(value: string | number | null | undefined) {
  const normalizedValue = value == null ? "" : String(value);

  if (!/[",\r\n]/.test(normalizedValue)) {
    return normalizedValue;
  }

  return `"${normalizedValue.replace(/"/g, "\"\"")}"`;
}

export function buildCsv<TRecord>(
  columns: readonly CsvColumn<TRecord>[],
  records: readonly TRecord[],
) {
  const lines = [
    columns.map((column) => escapeCsvValue(column.header)).join(","),
    ...records.map((record) =>
      columns
        .map((column) => escapeCsvValue(column.render(record)))
        .join(","),
    ),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}

export function formatDateForExportFileName(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function formatCentsForExport(amountInCents: number) {
  return (amountInCents / 100).toFixed(2);
}

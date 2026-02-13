/**
 * CSV Export Utilities
 * Handles exporting data to CSV format
 */

export type CSVColumn<T> = {
  header: string;
  accessor: (row: T) => string | number;
};

export function generateCSV<T>(
  data: T[],
  columns: CSVColumn<T>[]
): string {
  // Generate headers
  const headers = columns.map((col) => col.header).join(",");

  // Generate rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = col.accessor(row);
        // Escape quotes and wrap in quotes if contains comma or quotes
        const stringValue = String(value);
        if (stringValue.includes(",") || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(",")
  );

  return [headers, ...rows].join("\n");
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

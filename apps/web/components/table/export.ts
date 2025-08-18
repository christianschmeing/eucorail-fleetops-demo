'use client';

export function exportToCsv(filename: string, header: string[], rows: string[][]) {
  const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportToXlsx(
  filename: string,
  header: string[],
  rows: (string | number | null | undefined)[][]
) {
  try {
    const XLSX = await import('xlsx');
    const data = [header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.warn('XLSX export failed or library missing, fallback to CSV', e);
    exportToCsv(
      filename.replace(/\.xlsx?$/, '') + '.csv',
      header,
      rows.map((r) => r.map((v) => String(v ?? '')))
    );
  }
}

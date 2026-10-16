import '@tanstack/react-table';

declare module '@tanstack/react-table' {
  // Per-column classes for the <th>/<td> (e.g. a sticky actions column).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string;
    cellClassName?: string;
  }
}

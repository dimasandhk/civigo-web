import type { ReactNode } from "react";

/** Shared padding + type scale for every header and body cell. */
const CELL = "px-2.5 py-[15px] font-display text-[18px] font-medium leading-6";

export type DataTableColumn<T> = {
  /** Header label. Also used as the React key for the column. */
  header: string;
  /** Width applied to the matching <col>, e.g. "18.5%". */
  width: string;
  cell: (row: T) => ReactNode;
  /** Optional extra classes for this column's body cells. */
  className?: string;
};

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  className?: string;
};

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  className = "",
}: DataTableProps<T>) {
  return (
    <div
      className={`rounded-[10px] border border-line bg-white px-5 pt-[5px] pb-5 ${className}`}
    >
      <div className="max-h-[calc(100vh-280px)] overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[650px] table-fixed border-separate border-spacing-0">
          <colgroup>
            {columns.map((column) => (
              <col key={column.header} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={`${CELL} sticky top-0 z-10 border-b border-line bg-white text-left text-muted`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const border =
                index < rows.length - 1 ? "border-b border-line" : "";

              return (
                <tr key={rowKey(row)}>
                  {columns.map((column) => (
                    <td
                      key={column.header}
                      className={`${CELL} ${border} text-ink ${column.className ?? ""}`}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

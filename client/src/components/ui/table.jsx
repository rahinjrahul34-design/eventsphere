import { cn } from '../../lib/utils';
import { Inbox } from 'lucide-react';

/** Bordered, horizontally scrollable table surface */
export function TableWrap({ className, children, ...props }) {
  return (
    <div className={cn('w-full overflow-x-auto rounded-xl border bg-card shadow-soft', className)} {...props}>
      {children}
    </div>
  );
}

export function Table({ className, children, ...props }) {
  return (
    <table className={cn('w-full min-w-[540px] caption-bottom text-sm', className)} {...props}>
      {children}
    </table>
  );
}

export function THead({ className, ...props }) {
  return <thead className={cn('border-b bg-muted/40', className)} {...props} />;
}

export function Th({ className, ...props }) {
  return (
    <th
      className={cn(
        'whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

export function TBody({ className, ...props }) {
  return <tbody className={cn('divide-y', className)} {...props} />;
}

export function Tr({ className, ...props }) {
  return <tr className={cn('transition-colors duration-100 hover:bg-muted/40', className)} {...props} />;
}

export function Td({ className, ...props }) {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />;
}

export function TableEmpty({ icon: Icon = Inbox, title = 'Nothing here yet', description, action, colSpan = 5, className }) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn('px-4 py-12', className)}>
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <div className="mb-1 grid size-11 place-items-center rounded-lg border bg-muted/50 text-muted-foreground">
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold">{title}</p>
          {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
          {action && <div className="mt-2">{action}</div>}
        </div>
      </td>
    </tr>
  );
}

/**
 * DataTable — declarative table for dashboards.
 * columns: { key, header, className?, render?(row) }
 */
export function DataTable({ columns, data, empty, rowKey = (r, i) => r?._id || i, onRowClick, className }) {
  return (
    <TableWrap className={className}>
      <Table>
        <THead>
          <tr>
            {columns.map((c) => (
              <Th key={c.key} className={c.className}>
                {c.header}
              </Th>
            ))}
          </tr>
        </THead>
        <TBody>
          {!data?.length ? (
            <TableEmpty colSpan={columns.length} {...(typeof empty === 'string' ? { title: empty } : empty)} />
          ) : (
            data.map((row, i) => (
              <Tr key={rowKey(row, i)} onClick={onRowClick ? () => onRowClick(row) : undefined} className={onRowClick && 'cursor-pointer'}>
                {columns.map((c) => (
                  <Td key={c.key} className={c.className}>
                    {c.render ? c.render(row, i) : row[c.key]}
                  </Td>
                ))}
              </Tr>
            ))
          )}
        </TBody>
      </Table>
    </TableWrap>
  );
}

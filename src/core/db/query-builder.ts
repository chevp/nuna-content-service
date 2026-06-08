/**
 * Minimal, dependency-free SQL query builder.
 *
 * Just enough to keep repositories readable and parameterised. Not an ORM —
 * the world/entity model is small and flat by design.
 */

export interface BuiltQuery {
  sql: string;
  params: unknown[];
}

export class QueryBuilder {
  private wheres: string[] = [];
  private readonly params: unknown[] = [];
  private limitN?: number;
  private orderBy?: string;

  constructor(private readonly table: string) {}

  static table(name: string): QueryBuilder {
    return new QueryBuilder(name);
  }

  where(column: string, value: unknown): this {
    this.wheres.push(`${column} = ?`);
    this.params.push(value);
    return this;
  }

  whereIn(column: string, values: unknown[]): this {
    if (values.length === 0) {
      this.wheres.push('1 = 0');
      return this;
    }
    this.wheres.push(`${column} IN (${values.map(() => '?').join(', ')})`);
    this.params.push(...values);
    return this;
  }

  order(expr: string): this {
    this.orderBy = expr;
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  private whereClause(): string {
    return this.wheres.length ? ` WHERE ${this.wheres.join(' AND ')}` : '';
  }

  select(columns = '*'): BuiltQuery {
    let sql = `SELECT ${columns} FROM ${this.table}${this.whereClause()}`;
    if (this.orderBy) sql += ` ORDER BY ${this.orderBy}`;
    if (this.limitN !== undefined) sql += ` LIMIT ${this.limitN}`;
    return { sql, params: this.params };
  }

  insert(row: Record<string, unknown>): BuiltQuery {
    const cols = Object.keys(row);
    const sql = `INSERT INTO ${this.table} (${cols.join(', ')}) VALUES (${cols
      .map(() => '?')
      .join(', ')})`;
    return { sql, params: cols.map((c) => row[c]) };
  }

  update(row: Record<string, unknown>): BuiltQuery {
    const cols = Object.keys(row);
    const sql = `UPDATE ${this.table} SET ${cols
      .map((c) => `${c} = ?`)
      .join(', ')}${this.whereClause()}`;
    return { sql, params: [...cols.map((c) => row[c]), ...this.params] };
  }

  delete(): BuiltQuery {
    return { sql: `DELETE FROM ${this.table}${this.whereClause()}`, params: this.params };
  }
}

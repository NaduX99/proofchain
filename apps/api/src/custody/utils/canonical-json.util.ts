export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  }

  if (typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (typeof value === 'bigint') {
    return JSON.stringify(value.toString());
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => stableStringify(item));

    return `[${items.join(',')}]`;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;

    const keys = Object.keys(record).sort();

    const properties = keys.map((key) => {
      const serializedKey = JSON.stringify(key);

      const serializedValue = stableStringify(record[key]);

      return `${serializedKey}:${serializedValue}`;
    });

    return `{${properties.join(',')}}`;
  }

  throw new TypeError(`Unsupported value type: ${typeof value}`);
}

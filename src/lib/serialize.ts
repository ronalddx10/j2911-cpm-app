export function serializeBigInt<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString() as unknown as T;
  }

  if (obj instanceof Date) {
    return obj as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeBigInt(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const newObj: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = serializeBigInt((obj as Record<string, any>)[key]);
      }
    }
    return newObj as unknown as T;
  }

  return obj;
}

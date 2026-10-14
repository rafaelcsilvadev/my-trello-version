import type { DataSource } from 'typeorm';

export type DatabaseStatus = 'up' | 'down';

export async function checkDatabase(
  dataSource: DataSource,
  timeoutMs = 3000,
): Promise<DatabaseStatus> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });

  try {
    await Promise.race([dataSource.query('SELECT 1'), timeout]);
    return 'up';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

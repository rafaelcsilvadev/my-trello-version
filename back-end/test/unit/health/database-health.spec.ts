import type { DataSource } from 'typeorm';
import { checkDatabase } from '../../../src/health/database-health';

function fakeDataSource(query: () => Promise<unknown>): DataSource {
  return { query } as unknown as DataSource;
}

describe('checkDatabase', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns 'up' when the database answers", async () => {
    const dataSource = fakeDataSource(() =>
      Promise.resolve([{ '?column?': 1 }]),
    );

    await expect(checkDatabase(dataSource)).resolves.toBe('up');
  });

  it("returns 'down' when the query fails", async () => {
    const dataSource = fakeDataSource(() =>
      Promise.reject(new Error('connection refused')),
    );

    await expect(checkDatabase(dataSource)).resolves.toBe('down');
  });

  it("returns 'down' when the database does not answer within 3 seconds", async () => {
    jest.useFakeTimers();
    const dataSource = fakeDataSource(() => new Promise(() => {}));
    let result: string | undefined;

    void checkDatabase(dataSource).then((status) => (result = status));

    await jest.advanceTimersByTimeAsync(2999);
    expect(result).toBeUndefined();

    await jest.advanceTimersByTimeAsync(1);
    expect(result).toBe('down');
  });
});

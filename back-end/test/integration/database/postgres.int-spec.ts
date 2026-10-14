import { Client } from 'pg';

describe('PostgreSQL test container', () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  beforeAll(() => client.connect());

  afterAll(() => client.end());

  it('answers SELECT 1', async () => {
    const result = await client.query<{ one: number }>('SELECT 1 AS one');

    expect(result.rows).toEqual([{ one: 1 }]);
  });
});

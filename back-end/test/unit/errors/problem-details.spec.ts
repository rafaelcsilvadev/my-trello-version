import { buildProblem } from '../../../src/errors/problem-details';

const base = {
  status: 404,
  detail: 'Cannot GET /api/v1/missing',
  instance: '/api/v1/missing',
  requestId: 'req-1',
};

describe('buildProblem', () => {
  it('returns every required field with type defaulting to about:blank', () => {
    expect(buildProblem(base)).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'Cannot GET /api/v1/missing',
      instance: '/api/v1/missing',
      requestId: 'req-1',
    });
  });

  it('keeps a given type', () => {
    const problem = buildProblem({ ...base, type: 'https://example.com/x' });

    expect(problem.type).toBe('https://example.com/x');
  });

  it.each([
    [400, 'Bad Request'],
    [404, 'Not Found'],
    [500, 'Internal Server Error'],
    [503, 'Service Unavailable'],
  ])('uses the reason phrase of %i as title', (status, title) => {
    expect(buildProblem({ ...base, status }).title).toBe(title);
  });

  it('includes errors when given', () => {
    const errors = [{ field: 'name', message: 'name should not be empty' }];

    expect(buildProblem({ ...base, status: 400, errors }).errors).toEqual(
      errors,
    );
  });

  it('omits errors when not given', () => {
    expect(buildProblem(base)).not.toHaveProperty('errors');
  });
});

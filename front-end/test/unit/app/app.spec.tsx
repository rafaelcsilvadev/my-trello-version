import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '@/app/app';

describe('App', () => {
  it('renders without throwing', () => {
    expect(() => render(<App />)).not.toThrow();
  });
});

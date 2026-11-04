import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PreferencePanel } from '@/features/settings/components/preference-panel';

const options = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
];

describe('PreferencePanel', () => {
  afterEach(cleanup);

  it('shows the title as a heading and names the tab list after it', () => {
    render(
      <PreferencePanel
        title="Pick one"
        options={options}
        selected="a"
        onChange={() => {}}
      />,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Pick one' }),
    ).not.toBeNull();
    expect(screen.getByRole('tablist', { name: 'Pick one' })).not.toBeNull();
  });

  it('marks only the selected option and reports a click on another', () => {
    const onChange = vi.fn<(id: string) => void>();
    render(
      <PreferencePanel
        title="Pick one"
        options={options}
        selected="a"
        onChange={onChange}
      />,
    );

    expect(
      screen.getByRole('tab', { name: 'Alpha' }).getAttribute('aria-selected'),
    ).toBe('true');
    expect(
      screen.getByRole('tab', { name: 'Beta' }).getAttribute('aria-selected'),
    ).toBe('false');

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Beta' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Beta' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('shows the subtitle only when given', () => {
    const { rerender } = render(
      <PreferencePanel
        title="Pick one"
        subtitle="Some hint."
        options={options}
        selected="a"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('Some hint.')).not.toBeNull();

    rerender(
      <PreferencePanel
        title="Pick one"
        options={options}
        selected="a"
        onChange={() => {}}
      />,
    );
    expect(screen.queryByText('Some hint.')).toBeNull();
  });
});

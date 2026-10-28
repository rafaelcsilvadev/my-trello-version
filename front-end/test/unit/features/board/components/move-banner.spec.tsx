import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MoveBanner } from '@/features/board/components/move-banner';

afterEach(cleanup);

const cardBanner =
  'Movendo “Login”: Fazendo, posição 2 de 3. Setas movem, Espaço solta, Esc cancela.';

describe('MoveBanner', () => {
  it('renders the given banner text', () => {
    const { container } = render(<MoveBanner text={cardBanner} />);

    expect(container.textContent).toBe(cardBanner);
  });

  it('shows the move icon hidden from assistive tech', () => {
    const { container } = render(<MoveBanner text={cardBanner} />);

    const icon = container.querySelector('svg.lucide-move');
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});

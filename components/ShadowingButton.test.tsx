import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShadowingButton } from '@/components/ShadowingButton';

describe('ShadowingButton', () => {
  it('renders the target phrase prompt', () => {
    render(<ShadowingButton targetPhrase="唔該嚟一籠蝦餃" onResult={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveTextContent('唔該嚟一籠蝦餃');
  });
});

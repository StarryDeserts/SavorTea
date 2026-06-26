import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VoiceOrderButton } from '@/components/VoiceOrderButton';

describe('VoiceOrderButton', () => {
  it('renders an idle voice-order button', () => {
    render(<VoiceOrderButton onTranscript={vi.fn()} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('voice-order-button');
    expect(btn).toHaveAttribute('data-recording', 'false');
  });

  it('is disabled when the disabled prop is set', () => {
    render(<VoiceOrderButton onTranscript={vi.fn()} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

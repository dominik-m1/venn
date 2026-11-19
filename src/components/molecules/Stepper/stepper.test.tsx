import { render, screen } from '@testing-library/react';
import { Stepper } from '.';

const steps = [
  { id: 'first', label: 'First' },
  { id: 'second', label: 'Second' },
];

it('derives the accessible progress and label from the configured steps', () => {
  const view = render(<Stepper steps={steps} currentStepId="first" />);
  expect(screen.getByRole('progressbar')).toHaveTextContent('Step 1 of 2');
  view.rerender(<Stepper steps={steps} currentStepId="second" />);
  const progress = screen.getByRole('progressbar');
  expect(progress).toHaveTextContent('Step 2 of 2');
  expect(progress).toHaveAttribute('aria-valuenow', '2');
  expect(progress).toHaveAttribute('aria-valuemax', '2');
  expect(progress).toHaveAttribute('aria-valuetext', 'Step 2 of 2: Second');
});

it('falls back to the first step for an unknown ID', () => {
  render(<Stepper steps={steps} currentStepId="removed-step" />);
  expect(screen.getByRole('progressbar')).toHaveTextContent('Step 1 of 2');
});

it('supports a single step and an empty configuration', () => {
  const view = render(
    <Stepper steps={steps.slice(0, 1)} currentStepId="first" />,
  );
  expect(screen.getByRole('progressbar')).toHaveTextContent('Step 1 of 1');
  view.rerender(<Stepper steps={[]} currentStepId="first" />);
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});

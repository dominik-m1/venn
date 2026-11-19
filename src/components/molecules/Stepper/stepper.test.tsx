import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Stepper } from '.';

const steps = [
  { id: 'first', label: 'First' },
  { id: 'second', label: 'Second' },
];
const navigation = { onBack: jest.fn(), onNext: jest.fn() };
const previous = () => screen.getByRole('button', { name: 'Previous step' });
const next = () => screen.getByRole('button', { name: 'Next step' });

it('derives the accessible progress and label from the configured steps', () => {
  const view = render(
    <Stepper steps={steps} currentStepId="first" {...navigation} />,
  );
  expect(screen.getByRole('progressbar')).toHaveTextContent('Step 1 of 2');
  expect(previous()).toBeDisabled();
  expect(next()).toBeEnabled();
  view.rerender(
    <Stepper steps={steps} currentStepId="second" {...navigation} />,
  );
  const progress = screen.getByRole('progressbar');
  expect(progress).toHaveTextContent('Step 2 of 2');
  expect(progress).toHaveAttribute('aria-valuenow', '2');
  expect(progress).toHaveAttribute('aria-valuemax', '2');
  expect(progress).toHaveAttribute('aria-valuetext', 'Step 2 of 2: Second');
  expect(previous()).toBeEnabled();
  expect(next()).toBeDisabled();
});

it('falls back to the first step for an unknown ID', () => {
  render(
    <Stepper steps={steps} currentStepId="removed-step" {...navigation} />,
  );
  expect(screen.getByRole('progressbar')).toHaveTextContent('Step 1 of 2');
  expect(previous()).toBeDisabled();
  expect(next()).toBeEnabled();
});

it('supports a single step and an empty configuration', () => {
  const view = render(
    <Stepper steps={steps.slice(0, 1)} currentStepId="first" {...navigation} />,
  );
  expect(screen.getByRole('progressbar')).toHaveTextContent('Step 1 of 1');
  expect(previous()).toBeDisabled();
  expect(next()).toBeDisabled();
  view.rerender(<Stepper steps={[]} currentStepId="first" {...navigation} />);
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('supports mouse and keyboard navigation without submitting a surrounding form', async () => {
  const user = userEvent.setup();
  const onSubmit = jest.fn((event) => event.preventDefault());
  render(
    <form onSubmit={onSubmit}>
      <Stepper
        steps={[...steps, { id: 'third', label: 'Third' }]}
        currentStepId="second"
        {...navigation}
      />
    </form>,
  );
  await user.tab();
  expect(previous()).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(navigation.onBack).toHaveBeenCalledTimes(1);
  await user.tab();
  expect(next()).toHaveFocus();
  await user.keyboard(' ');
  expect(navigation.onNext).toHaveBeenCalledTimes(1);
  await user.click(previous());
  await user.click(next());
  expect(navigation.onBack).toHaveBeenCalledTimes(2);
  expect(navigation.onNext).toHaveBeenCalledTimes(2);
  expect(onSubmit).not.toHaveBeenCalled();
  expect(screen.getByRole('progressbar')).not.toContainElement(previous());
  expect(screen.getByRole('progressbar')).not.toContainElement(next());
});

it('does not invoke navigation while disabled or at the boundaries', async () => {
  const user = userEvent.setup();
  const view = render(
    <Stepper steps={steps} currentStepId="first" {...navigation} disabled />,
  );
  expect(previous()).toBeDisabled();
  expect(next()).toBeDisabled();
  await user.click(previous());
  await user.click(next());
  view.rerender(
    <Stepper steps={steps} currentStepId="first" {...navigation} />,
  );
  await user.click(previous());
  view.rerender(
    <Stepper steps={steps} currentStepId="second" {...navigation} />,
  );
  await user.click(next());
  expect(navigation.onBack).not.toHaveBeenCalled();
  expect(navigation.onNext).not.toHaveBeenCalled();
});

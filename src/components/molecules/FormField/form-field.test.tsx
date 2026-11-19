import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { FormField } from '.';

it('connects label, error, description and input ref', () => {
  const ref = createRef<HTMLInputElement>();
  render(
    <>
      <p id="hint">Personal details</p>
      <FormField
        ref={ref}
        id="first"
        label="First Name"
        error="First name is required."
        aria-describedby="hint"
        required
      />
    </>,
  );
  const input = screen.getByLabelText('First Name');
  expect(ref.current).toBe(input);
  expect(input).toBeRequired();
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription(
    'Personal details First name is required.',
  );
  ref.current?.focus();
  expect(input).toHaveFocus();
});

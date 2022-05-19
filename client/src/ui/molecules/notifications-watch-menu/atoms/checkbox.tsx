// @ts-expect-error ts-migrate(1259) FIXME: Module '"/Users/claas/github/mdn/yari/node_modules... Remove this comment to see the full error message
import React from "react";

type CheckboxProps = {
  checked?: boolean;
  indeterminate?: boolean;
  id?: string;
  name?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

export function Checkbox({
  checked,
  indeterminate,
  children,
  id,
  name,
  onChange,
}: React.PropsWithChildren<CheckboxProps>) {
  return (
    <>
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        aria-checked={checked}
        ref={(el) => el && (el.indeterminate = !!indeterminate)}
        onChange={onChange}
      />
      {children && <label htmlFor={id}>{children}</label>}
    </>
  );
}

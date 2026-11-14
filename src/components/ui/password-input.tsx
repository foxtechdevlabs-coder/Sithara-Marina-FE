"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { cx } from "@/lib/cx";

export interface PasswordInputProps extends Omit<ComponentProps<"input">, "type"> {
  /** Spacing and width for the field (e.g. its top margin); the input keeps `className`. */
  wrapperClassName?: string;
}

/**
 * A password field with a show/hide toggle inside it, on the right. The input stays
 * uncontrolled unless the caller passes `value`, so toggling never touches what was
 * typed. Styling, validation attributes and `disabled` pass straight to the input.
 */
export function PasswordInput({ wrapperClassName, className, disabled, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <div className={cx("relative", wrapperClassName)}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={cx(className, "pr-12")}
      />
      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        disabled={disabled}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#0d1b2a]/70 transition-colors hover:text-[#0d1b2a] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#0d1b2a] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Icon aria-hidden="true" strokeWidth={1.5} className="size-[18px]" />
      </button>
    </div>
  );
}

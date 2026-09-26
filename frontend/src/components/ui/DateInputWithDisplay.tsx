"use client";

import type { InputHTMLAttributes } from "react";
import { formatDisplayDate } from "@/lib/date";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const defaultInputClass =
  "border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition w-full";

export function DateInputWithDisplay({
  id,
  label,
  value,
  onChange,
  className,
  ...rest
}: Props) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-slate-500 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className ?? defaultInputClass}
        {...rest}
      />
      {value.trim() ? (
        <p className="text-xs text-slate-500 mt-1">
          Fecha seleccionada:{" "}
          <span className="font-medium text-slate-700">{formatDisplayDate(value)}</span>
        </p>
      ) : null}
    </div>
  );
}

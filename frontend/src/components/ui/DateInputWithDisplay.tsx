"use client";

import { useEffect, useState, type InputHTMLAttributes } from "react";
import {
  isoToDisplayDate,
  maskDateDisplayInput,
  parseDisplayDateToIso,
} from "@/lib/date";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Texto bajo el input; desactivar en formularios en fila (fuerza, etc.). */
  showFormatHint?: boolean;
  wrapperClassName?: string;
};

const defaultInputClass =
  "border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition w-full";

export const DATE_FORMAT_HINT_TEXT = "Día / mes / año";

/** Misma altura que el hint de fecha; invisible para alinear formularios en fila. */
export function DateFormatHintLine({ visible = true }: { visible?: boolean }) {
  return (
    <p
      className={`text-xs text-slate-400 mt-1 ${visible ? "" : "invisible"}`}
      aria-hidden={!visible}
    >
      {DATE_FORMAT_HINT_TEXT}
    </p>
  );
}

export function DateInputWithDisplay({
  id,
  label,
  value,
  onChange,
  className,
  showFormatHint = true,
  wrapperClassName,
  ...rest
}: Props) {
  const [display, setDisplay] = useState(() => isoToDisplayDate(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDisplay(isoToDisplayDate(value));
    setInvalid(false);
  }, [value]);

  const handleChange = (raw: string) => {
    const masked = maskDateDisplayInput(raw);
    setDisplay(masked);
    if (!masked.trim()) {
      setInvalid(false);
      onChange("");
      return;
    }
    if (masked.length < 10) {
      setInvalid(false);
      return;
    }
    const iso = parseDisplayDateToIso(masked);
    if (iso === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onChange(iso);
  };

  return (
    <div className={wrapperClassName}>
      <label htmlFor={id} className="block text-xs text-slate-500 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        placeholder="DD/MM/AAAA"
        value={display}
        onChange={(e) => handleChange(e.target.value)}
        className={className ?? defaultInputClass}
        aria-invalid={invalid}
        {...rest}
      />
      {showFormatHint ? <DateFormatHintLine /> : null}
      {invalid ? (
        <p className="text-xs text-red-600 mt-1">Fecha inválida. Revisá día, mes y año.</p>
      ) : null}
    </div>
  );
}

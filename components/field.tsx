import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { formatCOPInput, toNumber } from "@/components/calculator-utils";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Field({ label, ...props }: FieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#403840]">{label}</span>
      <input
        {...props}
        className="mt-2 w-full rounded-lg border border-[#d1d5db] bg-white px-4 py-3 text-[#1f2937] shadow-sm transition placeholder:text-[#9ca3af] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#ddd6fe]"
      />
    </label>
  );
}

type InstagramFieldProps = Omit<FieldProps, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function InstagramField({
  label,
  value,
  onValueChange,
  ...props
}: InstagramFieldProps) {
  const displayValue = value.startsWith("@") ? value.slice(1) : value;

  return (
    <label className="block">
      <span className="text-sm font-bold text-[#403840]">{label}</span>
      <div className="mt-2 flex w-full items-center rounded-lg border border-[#d1d5db] bg-white shadow-sm focus-within:border-[#7c3aed] focus-within:ring-2 focus-within:ring-[#ddd6fe]">
        <span className="select-none pl-4 text-[#6b7280]">@</span>
        <input
          {...props}
          value={displayValue}
          onChange={(event) => {
            const nextValue = event.target.value.trim().replace(/^@+/, "");
            onValueChange(nextValue ? `@${nextValue}` : "");
          }}
          className="w-full rounded-lg border-0 bg-transparent px-1 py-3 pr-4 text-[#1f2937] placeholder:text-[#9ca3af] focus:outline-none"
        />
      </div>
    </label>
  );
}

type MoneyFieldProps = Omit<FieldProps, "type" | "inputMode" | "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function MoneyField({ label, value, onValueChange, ...props }: MoneyFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#403840]">{label}</span>
      <input
        {...props}
        inputMode="numeric"
        value={formatCOPInput(value)}
        onChange={(event) => onValueChange(String(toNumber(event.target.value)))}
        className="mt-2 w-full rounded-lg border border-[#d1d5db] bg-white px-4 py-3 text-[#1f2937] shadow-sm transition placeholder:text-[#9ca3af] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#ddd6fe]"
      />
    </label>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: string[];
};

export function SelectField({ label, options, ...props }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#403840]">{label}</span>
      <select
        {...props}
        className="mt-2 w-full rounded-lg border border-[#d1d5db] bg-white px-4 py-3 text-[#1f2937] shadow-sm focus:border-[#7c3aed] focus:ring-2 focus:ring-[#ddd6fe]"
      >
        <option value="">Selecciona una opción</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export function TextAreaField({ label, ...props }: TextAreaFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-[#403840]">{label}</span>
      <textarea
        {...props}
        className="mt-2 min-h-28 w-full rounded-lg border border-[#d1d5db] bg-white px-4 py-3 text-[#1f2937] shadow-sm focus:border-[#7c3aed] focus:ring-2 focus:ring-[#ddd6fe]"
      />
    </label>
  );
}

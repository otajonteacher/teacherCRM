"use client";

import { useState } from "react";

type PageSizeOption = {
  value: number;
  label: string;
};

type StudentPageSizeSelectProps = {
  value: number;
  label: string;
  options: ReadonlyArray<PageSizeOption>;
};

export function StudentPageSizeSelect({
  value,
  label,
  options,
}: StudentPageSizeSelectProps) {
  const [selectedValue, setSelectedValue] = useState(String(value));

  function handleChange(nextValue: string) {
    setSelectedValue(nextValue);

    const url = new URL(window.location.href);
    url.searchParams.set("pageSize", nextValue);
    url.searchParams.set("page", "1");
    window.location.assign(url.toString());
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={selectedValue}
        onChange={(event) => handleChange(event.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

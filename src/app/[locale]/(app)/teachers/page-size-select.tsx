"use client";

type PageSizeOption = {
  value: number;
  label: string;
};

type TeacherPageSizeSelectProps = {
  value: number;
  label: string;
  options: ReadonlyArray<PageSizeOption>;
};

export function TeacherPageSizeSelect({
  value,
  label,
  options,
}: TeacherPageSizeSelectProps) {
  function handleChange(nextValue: string) {
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
        defaultValue={String(value)}
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

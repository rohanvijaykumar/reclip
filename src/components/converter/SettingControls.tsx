import { cn } from "@/lib/cn";

interface LabeledSelectProps {
  label: string;
  value: string;
  options: readonly { id: string; label: string }[];
  onChange: (val: string) => void;
  disabled?: boolean;
}

export function LabeledSelect({ label, value, options, onChange, disabled }: LabeledSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-tertiary uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="glass-card rounded-lg px-3 py-2 text-[13px] text-primary focus:outline-none focus:ring-1 focus:ring-accent appearance-none disabled:opacity-40"
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
  disabled?: boolean;
}

export function LabeledSlider({ label, value, min, max, step = 1, unit = "", onChange, disabled }: SliderProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <label className="text-[11px] font-medium text-tertiary uppercase tracking-wider">{label}</label>
        <span className="text-[12px] font-mono text-secondary">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-1.5 bg-progress-track rounded-full appearance-none cursor-pointer accent-accent disabled:opacity-40"
      />
    </div>
  );
}

interface TimeInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function TimeInput({ label, value, onChange, placeholder = "00:00:00" }: TimeInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-tertiary uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="glass-card rounded-lg px-3 py-2 text-[13px] text-primary font-mono focus:outline-none focus:ring-1 focus:ring-accent w-full"
      />
    </div>
  );
}

interface TextInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function LabeledInput({ label, value, onChange, placeholder }: TextInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-tertiary uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="glass-card rounded-lg px-3 py-2 text-[13px] text-primary focus:outline-none focus:ring-1 focus:ring-accent w-full"
      />
    </div>
  );
}

interface ChipGroupProps {
  label: string;
  value: string;
  options: readonly { id: string; label: string }[];
  onChange: (val: string) => void;
}

export function ChipGroup({ label, value, options, onChange }: ChipGroupProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-tertiary uppercase tracking-wider">{label}</label>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all",
              opt.id === value
                ? "bg-accent text-accent-text"
                : "glass-card text-secondary hover:text-primary"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

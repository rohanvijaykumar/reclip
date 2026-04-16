import { cn } from "@/lib/cn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

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
      <Select value={value} onValueChange={(val) => { if (val) onChange(val); }} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {options.find(opt => opt.id === value)?.label ?? value}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(vals) => onChange(Array.isArray(vals) ? vals[0] : (vals as unknown as number))}
        disabled={disabled}
        className="w-full mt-1.5"
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
        className="w-full bg-raised/40 backdrop-blur-md rounded-xl px-3.5 py-2.5 text-[13px] text-primary font-mono ring-1 ring-subtle focus:outline-none focus:ring-accent/50 focus:bg-raised/70 transition-all placeholder:text-tertiary/40"
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
        {options.map((opt: { id: string; label: string }) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "h-9 px-4 text-[12px] font-bold rounded-xl transition-all border shrink-0",
              opt.id === value
                ? "bg-accent/20 border-accent/40 text-accent shadow-[0_0_15px_-5px_var(--theme-accent)] scale-[1.02]"
                : "glass-card border-transparent text-secondary hover:text-primary hover:bg-hover hover:border-subtle"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LabeledInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-tertiary uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-raised/40 backdrop-blur-md rounded-xl px-3.5 py-2.5 text-[13px] text-primary ring-1 ring-subtle focus:outline-none focus:ring-accent/50 focus:bg-raised/70 transition-all placeholder:text-tertiary/40"
      />
    </div>
  );
}

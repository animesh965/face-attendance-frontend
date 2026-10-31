import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LeaveRules } from "@/api/leave";

export const DEFAULT_RULES: LeaveRules = {
  annual_entitlement: 0, accrual_frequency: "yearly", carry_forward: false, max_carry_forward: 0, carry_forward_expiry_months: 0,
  allow_half_day: true, min_days: 0.5, max_days: 0, allow_during_probation: true, min_service_days: 0,
  allow_negative_balance: false, negative_balance_limit: 0, exclude_weekly_offs: true, exclude_holidays: true,
  advance_notice_days: 0, allow_past_dates: true, max_past_days: 30,
};

export function pickRules(source: Partial<LeaveRules>): LeaveRules {
  return Object.fromEntries(Object.keys(DEFAULT_RULES).map((k) => [k, source[k as keyof LeaveRules] ?? DEFAULT_RULES[k as keyof LeaveRules]])) as unknown as LeaveRules;
}

export function NumberField({ label, value, onChange, step = 1, min = 0, max, hint, disabled }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; hint?: string; disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={Number.isFinite(value) ? value : 0} step={step} min={min} max={max} disabled={disabled}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SwitchField({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-md border p-2.5">
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function RulesFields({ value, onChange }: { value: LeaveRules; onChange: (v: LeaveRules) => void }) {
  const set = <K extends keyof LeaveRules>(k: K, v: LeaveRules[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-semibold">Entitlement</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="Annual entitlement (days)" value={value.annual_entitlement} step={0.5} onChange={(v) => set("annual_entitlement", v)} />
          <div className="space-y-1">
            <Label className="text-xs">Accrual</Label>
            <Select value={value.accrual_frequency} onValueChange={(v) => set("accrual_frequency", v as LeaveRules["accrual_frequency"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yearly">Yearly (credited at year start)</SelectItem>
                <SelectItem value="monthly">Monthly (1/12 each month)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <NumberField label="Min service before use (days)" value={value.min_service_days} onChange={(v) => set("min_service_days", v)} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Carry forward</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <SwitchField label="Allow carry forward" checked={value.carry_forward} onChange={(v) => set("carry_forward", v)} />
          <NumberField label="Max carry forward (days)" value={value.max_carry_forward} step={0.5} disabled={!value.carry_forward} hint="0 = no limit" onChange={(v) => set("max_carry_forward", v)} />
          <NumberField label="Carried days expire after (months)" value={value.carry_forward_expiry_months} max={24} disabled={!value.carry_forward} hint="0 = never expire" onChange={(v) => set("carry_forward_expiry_months", v)} />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Application rules</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField label="Minimum per application" value={value.min_days} step={0.5} min={0.5} onChange={(v) => set("min_days", v)} />
          <NumberField label="Maximum per application" value={value.max_days} step={0.5} hint="0 = no maximum" onChange={(v) => set("max_days", v)} />
          <NumberField label="Advance notice (days)" value={value.advance_notice_days} onChange={(v) => set("advance_notice_days", v)} />
          <SwitchField label="Half-day allowed" checked={value.allow_half_day} onChange={(v) => set("allow_half_day", v)} />
          <SwitchField label="Allowed during probation" checked={value.allow_during_probation} onChange={(v) => set("allow_during_probation", v)} />
          <SwitchField label="Allow past dates" checked={value.allow_past_dates} onChange={(v) => set("allow_past_dates", v)} />
          <NumberField label="Past dates up to (days back)" value={value.max_past_days} disabled={!value.allow_past_dates} onChange={(v) => set("max_past_days", v)} />
          <SwitchField label="Exclude weekly offs" checked={value.exclude_weekly_offs} onChange={(v) => set("exclude_weekly_offs", v)} hint="Weekends inside the range are not counted" />
          <SwitchField label="Exclude holidays" checked={value.exclude_holidays} onChange={(v) => set("exclude_holidays", v)} hint="Applicable holidays are not counted" />
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Negative balance</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <SwitchField label="Allow negative balance" checked={value.allow_negative_balance} onChange={(v) => set("allow_negative_balance", v)} />
          <NumberField label="Negative limit (days)" value={value.negative_balance_limit} step={0.5} disabled={!value.allow_negative_balance} onChange={(v) => set("negative_balance_limit", v)} />
        </div>
      </div>
    </div>
  );
}

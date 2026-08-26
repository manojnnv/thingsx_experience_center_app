import * as React from "react";
import { DateRangePicker } from "rsuite";
import "rsuite/DateRangePicker/styles/index.css";
import AppButton from "../app-button/AppButton";
import "./datePicker.css";

type DateRangeValue = Date[] | null;

/** Local midnight through now — the default heatmap / picker window. */
export function getTodayRange(): [Date, Date] {
  const endTime = new Date();
  const startTime = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate());
  return [startTime, endTime];
}

function DateTimePicker({
  className,
  onchange,
  onsubmit,
  value,
}: {
  className?: string;
  onchange?: (value: DateRangeValue) => void;
  onsubmit?: () => void;
  value?: DateRangeValue;
}) {
  const defaultDateRange: [Date, Date] = React.useMemo(() => getTodayRange(), []);
  const isControlled = Array.isArray(value) && value.length >= 2;
  const selected = isControlled ? (value as [Date, Date]) : defaultDateRange;

  return (
    <div className={`w-full flex items-center gap-2 relative ${className}`}>
      <DateRangePicker
        placement="bottomEnd"
        preventOverflow
        container={() => document.body}
        menuStyle={{ zIndex: 1400 }}
        placeholder={"Start date - End date"}
        value={isControlled ? selected : undefined}
        defaultValue={isControlled ? undefined : defaultDateRange}
        onChange={(next: DateRangeValue) => {
          if (onchange) {
            onchange(next ?? null);
          }
        }}
        format="MM/dd/yyyy HH:mm"
      />
      <AppButton variant="default" label="Submit" onClick={onsubmit} />
    </div>
  );
}

export default DateTimePicker;

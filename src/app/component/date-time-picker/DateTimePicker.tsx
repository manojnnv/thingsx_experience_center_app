import * as React from "react";
import { DateRangePicker } from "rsuite";
import AppButton from "../app-button/AppButton";
import "./datePicker.css";

type DateRangeValue = Date[] | null;

function DateTimePicker({
  className,
  onchange,
  onsubmit,
}: {
  className?: string;
  onchange?: (value: DateRangeValue) => void;
  onsubmit?: () => void;
}) {
  // Set default value to today starting at 00:00 until now as a tuple [Date, Date]
  const defaultDateRange: [Date, Date] = React.useMemo(() => {
    const endTime = new Date();
    const startTime = new Date(endTime);
    startTime.setHours(0, 0, 0, 0);
    return [startTime, endTime];
  }, []);

  return (
    <div className={`w-full flex items-center gap-2 ${className} z-50`}>
      <DateRangePicker
        placement="auto"
        placeholder={"Start date - End date"}
        defaultValue={defaultDateRange} // Set default value as tuple
        onChange={(value: DateRangeValue) => {
          if (onchange) {
            onchange(value ?? null);
          }
        }}
        format="MM/dd/yyyy HH:mm"
      />
      <AppButton variant="default" label="Submit" onClick={onsubmit} />
    </div>
  );
}

export default DateTimePicker;

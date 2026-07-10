import { Input } from '@/Components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import {
    DATE_RANGE_PRESETS,
    type DateRangePreset,
} from '@/lib/dateRange';

type DateRangeFilterProps = {
    preset: DateRangePreset;
    customFrom: string;
    customTo: string;
    onPresetChange: (preset: DateRangePreset) => void;
    onCustomFromChange: (value: string) => void;
    onCustomToChange: (value: string) => void;
};

export default function DateRangeFilter({
    preset,
    customFrom,
    customTo,
    onPresetChange,
    onCustomFromChange,
    onCustomToChange,
}: DateRangeFilterProps) {
    return (
        <>
            <Select
                value={preset}
                onValueChange={(value) =>
                    onPresetChange(value as DateRangePreset)
                }
            >
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                    {DATE_RANGE_PRESETS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {preset === 'custom' ? (
                <>
                    <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground">
                            From
                        </label>
                        <Input
                            type="date"
                            value={customFrom}
                            onChange={(event) =>
                                onCustomFromChange(event.target.value)
                            }
                            className="w-36"
                        />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <label className="text-xs text-muted-foreground">
                            To
                        </label>
                        <Input
                            type="date"
                            value={customTo}
                            onChange={(event) =>
                                onCustomToChange(event.target.value)
                            }
                            className="w-36"
                        />
                    </div>
                </>
            ) : null}
        </>
    );
}

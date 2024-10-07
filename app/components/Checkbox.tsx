import { FunctionComponent, useState } from "react";


let CheckBox: FunctionComponent<{ defaultValue?: boolean, value?: boolean, name: string, onChange?: (x: boolean) => boolean | undefined }> = (p) => {
    const [value, setValue] = useState<boolean>(!!p.defaultValue);
    if (p.value !== undefined && value != p.value) {
        setValue(p.value!);
        return <></>
    }

    return (
        <div className={`clickable checkbox icon-small ${value ? "active" : "inactive"}`}
            onClick={() => {
                let oldValue = value;
                let a : boolean | undefined;
                if (p.onChange) a = p.onChange(!value);
                if (a !== false && p.value === undefined) setValue(!oldValue);
            }}>
            <div className="checkmark" />
            <input type="hidden" value={value ? 1 : 0} name={p.name} />
        </div>);
};

export default CheckBox;
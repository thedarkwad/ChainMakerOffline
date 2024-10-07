import { FunctionComponent, MouseEventHandler, useEffect, useRef, useState } from "react"
import { Id } from "~/jumpchain/Types";

export interface SelectOption {
    name: string,
    numeric?: boolean,
    increment?: number,
    suffix?: string,
}

type OptionValue = number | boolean;

interface MultiselectProps {
    single?: boolean,
    name: string,
    options: Record<number, SelectOption>,
    value: Record<number, OptionValue>,
    default?: number
    placeholder?: string,
    overflow?: string,
    title?: string,
    hidePlaceholderTitle?: boolean,
    separator?: string,
    inline?: boolean,
    onChange?: (x: Record<string, OptionValue>) => void
    className?: string,
    large?: boolean,
    roomy?: boolean,
    width?: string,
    hideName?: boolean
}

function getLeadingText(p: MultiselectProps, values: Record<string, OptionValue>, active: Record<string, boolean>) {
    let titleElement = (<span className={`bold ${p.title ? "margin-right" : ""}`}>{p.title ? p.title + ":" : ""}</span>);
    let selectedOptions = Object.entries(values).filter(([id,]) => active[id]);
    let selectionText: string[];
    if (p.overflow && selectedOptions.length > 2) {
        selectionText = [p.overflow];
    } else {
        selectionText = selectedOptions.map(([key, value]) => {
            if (p.options[Number(key)].numeric)
                return (!p.hideName ? p.options[Number(key)].name + ": " : "") + String(value)
                    + (p.options[Number(key)].suffix ? " " + p.options[Number(key)].suffix : "");
            else
                return p.options[Number(key)].name;
        });
    }
    if (selectionText.length == 0 && p.default !== undefined) selectionText = [p.options[p.default].name];
    if (selectionText.length == 0) {
        selectionText = [p.placeholder || "None"];
        if (p.hidePlaceholderTitle)
            titleElement = <></>;
    }

    return (<span>
        {p.title ? titleElement : []}
        {selectionText.map((string, index) => <span style={{ display: "inline-block" }} key={string + index}>{string}{
            index != selectionText.length - 1 ? <>{p.separator || ","}&nbsp;</> : ""
        }</span>)}
    </span>);

}

const Option: FunctionComponent<{ option: SelectOption, value: OptionValue, setValue: (v: OptionValue, valueUpdate: boolean) => void, single?: boolean, active: boolean }> = (p) => {
    const [numericValue, setNumericValue] = useState(Number(p.value || 0));
    const entryRef = useRef<HTMLInputElement>(null);

    let toggleCheckbox = (e: React.MouseEvent) => {
        if (p.active && (e.target as Element)?.tagName.toUpperCase() == "INPUT") return;
        if (!p.option.numeric) { p.setValue(!p.value, false); }
        else { p.setValue(numericValue, false); }
    }

    if (p.option.numeric) {
        useEffect(() => { if (p.active) entryRef.current!.focus() }, [p.active]);
    }

    let checkBox = <div className={`checkbox icon-small ${p.active ? "active" : "inactive"}`}> <div className="checkmark" /></div>

    let text = p.option?.name + (p.option?.numeric ? ":" : "");

    let entry = <input
        type="number"
        step={p.option?.increment || 50}
        pattern="[0-9]*"
        defaultValue={numericValue}
        ref={entryRef}
        disabled={!p.active}
        onChange={() => {
            let v = Number(entryRef.current!.value);
            setNumericValue(v);
            p.setValue(v, true);
        }}
    />;

    return (
        <div onClick={toggleCheckbox} className="clickable vcentered row">
            {checkBox}
            {text}
            {p.option?.numeric ? entry : <div></div>}
        </div>
    );

}

let getDefaultActive: (p: MultiselectProps, active?: Record<string, boolean>, forcedActive?: string, forcedInactive?: string) => Record<string, boolean> = (p, active?, forcedActive?, forcedInactive?) => {
    if (p.single && Object.values(p.value).every(v => !v) && !forcedActive) {
        return Object.fromEntries(Object.keys(p.value).map((key) => [key, Number(key) == p!.default]));
    }
    return Object.fromEntries(Object.entries(p.value).map(([key, value]) => [key, (((!p.single && active) ? active[key] : !!value) || (forcedActive == key)) && forcedInactive !== key]))
}

let stringifyValues: (values: Record<string, OptionValue>, active: Record<string, boolean>, single?: boolean, def?: number) => string = (values, active, single, def) => {
    if (single && Object.values(active).every(v => !v))
        return JSON.stringify(Object.fromEntries(Object.keys(values).map((key) => [key, Number(key) == def])));
    let sanitizedValues = Object.fromEntries(Object.entries(values).map(([id, value]) => [id, value && (!active[id] ? 0 : value)]));
    return JSON.stringify(sanitizedValues);
}

const Multiselect: FunctionComponent<MultiselectProps> = (p) => {
    const [isOpen, setOpen] = useState(false);
    const [values, setValues] = useState<Record<string, OptionValue>>(p.value);
    const [active, setActive] = useState<Record<string, boolean>>(getDefaultActive(p));
    const containerRef = useRef<HTMLInputElement>(null);
    const hiddenRef = useRef<HTMLInputElement>(null);


    for (let key in values) {
        if (!(Number(key) in p.value) || !(Number(key) in p.options)) {
            setValues(p.value);
            setActive(Object.fromEntries(Object.entries(p.value).map((([id, x]) => [id, !!x]))));
            return <></>;
        }
    }

    for (let key in p.value) {
        if (!(String(key) in values)) {
            setValues(p.value);
            return <></>;
        }
    }

    function open() {
        setOpen(true);
    }

    function close() {
        hiddenRef.current!.value = stringifyValues(values, active, p.single, p.default);
        setOpen(false);
    }

    function toggle() {
        if (isOpen) close();
        else open();
    }

    useEffect(() => {
        let tryToClose = (e: MouseEvent) => {
            if (e.target instanceof Node && !containerRef.current?.contains(e.target)) close();
        }
        document.addEventListener("click", tryToClose);
        return (() => document.removeEventListener("click", tryToClose))
    });

    let optionComponents = Object.entries(values).map((([key, value]) =>
        <Option key={key}
            option={p.options[Number(key)]}
            single={p.single}
            value={value}
            active={active[key]}
            setValue={(value, valueUpdate) => {
                setValues((prevValues) => {
                    let newValues: Record<string, OptionValue>;
                    if (!p.single)
                        newValues = {
                            ...prevValues,
                            [key]: value
                        };
                    else if (!value && !p.options[Number(key)].numeric)
                        newValues = prevValues;
                    else
                        newValues = Object.fromEntries(Object.keys(prevValues).map((key2) => [key2, key == key2 && value]));
                    let newActive = getDefaultActive({ ...p, value: newValues },
                        active,
                        (p.single || !active[key]) ? key : undefined,
                        !p.single && !valueUpdate && active[key] ? key : undefined);
                    hiddenRef.current!.value = stringifyValues(newValues, newActive, p.single, p.default);
                    if (p.onChange !== undefined) p.onChange(newValues);
                    setActive(newActive);
                    return newValues;
                });
            }} />
    ));

    let head = (
        <span
            onClick={toggle}
            className={`${isOpen ? "upper" : "subtle"}-rounded ${p.large ? "large-text" : ""} ${isOpen ? "medium-outline-upper dropdown-highlight" : "mild-outline-b neutral-highlight-transparent"} `
                + `spanning ${p.roomy ? "roomy" : "compact"}-cell clickable vcentered`}
        >
            {getLeadingText(p, values, active)}
            <img className="icon-small margin-left right-align-self" style={{ filter: "var(--strong-text-filter)" }} src={`/icons/single-arrow-${isOpen ? "down" : "right"}.svg`} />
        </span>
    );
    let body = (
        <div
            className={`spanning medium-outline-lower roomy-cell overlay dropdown-highlight ${isOpen ? " out-of-flow" : "hidden"}`}
        >
            <div
                className={`three-column`}
            >
                {optionComponents}
            </div>
        </div >
    );
    let hiddenBody = (
        <div
            className={`spanning roomy-cell placeholder`}
        >
            <div
                className={`three-column`}
            >
                {optionComponents}
            </div>
        </div >
    );

    let hidden = <input type="hidden" defaultValue={stringifyValues(values, active, p.single, p.default)} ref={hiddenRef} name={p.name} />;
    return (
        <div ref={containerRef} className={`input ${p.className || ""}`}
            style={{ display: p.inline ? "inline-block" : "block", width: p.width || (p.single ? "max-content" : "") }}>
            {head}
            {hiddenBody}
            {body}
            {hidden}
        </div>
    )
}

export default Multiselect;
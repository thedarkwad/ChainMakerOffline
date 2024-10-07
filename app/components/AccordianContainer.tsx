// @ts-nocheck

import { FunctionComponent, useEffect, useState } from "react";
import { GID, Id, LID, PersistentList } from "~/jumpchain/Types";
import Collapsable from "./Collapsable";
import Jump, { Currency } from "~/jumpchain/Jump";
import Multiselect, { SelectOption } from "./Multiselect";
import CheckBox from "./Checkbox";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "./FloatingButton";
import React from "react";

export enum FieldType {
    String,
    Number,
    Boolean,
    Currency,
    Choose,
    Excluded
}

interface FieldData {
    type: FieldType,
    name: string,
    nonEssentialOnly?: boolean
    choices?: { name: string, value: any }[]
}

interface AccordianContainerProps<T> {
    fieldList: Record<keyof T, FieldData>;
    currencyList?: PersistentList<LID.Currency, Currency>;
    getter: () => { [x: number]: T };
    setter: (index: number, data: T) => void;
    newEntry: () => number;
    deleteEntry: (id: number) => void;
    title: string;
    stuck?: boolean;
}

let FieldInput: FunctionComponent<{
    defaultValue: number | string | boolean,
    field: FieldData,
    currencyList?: PersistentList<LID.Currency, Currency>,
    setter: (x: any) => void,
}> = (p) => {
    switch (p.field.type) {
        case FieldType.Number:
            return <input type="number"
                step={50}
                name={p.field.name}
                className="compact-cell"
                style={{ width: "9rem" }}
                defaultValue={Number(p.defaultValue)}
                autoComplete="off"
                onChange={(e) => p.setter(e.target.valueAsNumber || 0)} />
        case FieldType.String:
            return <input type="text"
                name={p.field.name}
                className="compact-cell"
                style={{ width: "9rem" }}
                autoComplete="off"
                defaultValue={String(p.defaultValue)}
                onChange={(e) => p.setter(e.target.value)} />
        case FieldType.Boolean:
            return <CheckBox name={p.field.name} value={!!p.defaultValue} onChange={(e) => {p.setter(e); return undefined;}} />
        case FieldType.Choose:
            let ops: Record<number, SelectOption> = {};
            for (let id in p.field.choices!) {
                ops[Number(id)] = { name: p.field.choices![id].name };
            }
            return <Multiselect
                single
                name={p.field.name}
                options={ops}
                value={Object.fromEntries(p.field.choices!.map((choice, id) => [id, choice.value == p.defaultValue]))}
                onChange={(record) => p.setter(p.field.choices![Number(Object.keys(record).findIndex((id) => record[id]))].value)}
            />
        case FieldType.Currency:
            return <Multiselect
                single
                name={p.field.name}
                options={Object.fromEntries(Object.keys(p.currencyList!).map((cId) => [Number(cId), { name: p.currencyList![Number(cId)].abbrev }]))}
                value={Object.fromEntries(Object.keys(p.currencyList!).map((cId) => [cId, cId == p.defaultValue]))}
                onChange={(record) => p.setter(Object.keys(record).findIndex((id) => record[id]))}
            />
        default:
            return <></>;

    }
}

function AccordianItem<T extends Object>(p: React.PropsWithChildren<{
    data: T,
    id: number,
    currencyList?: PersistentList<LID.Currency, Currency>,
    fieldList: { [P in keyof T]: FieldData },
    setter: (index: number, data: T) => void,
    deleteEntry: (id: number) => void
}>) {

    let rows = Object.entries(p.fieldList).filter(
        ([_, field]) => field.type != FieldType.Excluded && (!field.nonEssentialOnly || !("essential" in p.data && p.data.essential))
    ).map(([id, field]) =>
        <React.Fragment key={`Row${id}`}>
            <span className="bold">{field.name}:</span>
            <span>
                <FieldInput
                    defaultValue={(p.data as { [s: string]: any })[id]}
                    field={field}
                    currencyList={p.currencyList}
                    setter={(x: any) => {
                        let newData = { ...p.data };
                        (newData as { [s: string]: any })[id] = x;
                        p.setter(p.id, newData);
                    }}
                />
            </span>
        </React.Fragment>);

    return <div className="right-weighted-column extra-roomy-cell faint-highlight subtle-rounded vspaced-half-big mild-outline spacious-grid">
        {rows}
        {
            (!("essential" in p.data) || !p.data.essential) ? (
                <div className="row spanning roomy-cell vspaced-half-big">
                    <FloatingButtonRow
                        buttons={[{ onClick: () => p.deleteEntry(p.id), icon: "trash" }]}
                        color={IconColor.Light}
                        size={IconSize.Small}
                        position={Direction.Right}
                    />
                </div>
            ) : []

        }
    </div>
}

function AccordianContainer<T extends Object>(p: React.PropsWithChildren<AccordianContainerProps<T>>) {

    const [activeId, setActiveId] = useState(-1);

    const head = <div className="spanning bold center-text-align medium-highlight compact-cell subtle-rounded">
        {p.title}
    </div>;

    let entries = p.getter();

    let currentList = Object.keys(entries).map((id) => Number(id));

    const body = <div className="spanning roomy-cell vcentered center-text-align hcenter-down">
        <div className="vcentered center-text-align">
            {currentList.map((id) => (
                <div
                    className={`clickable roomy-cell margins ${id == activeId ? "ui-highlight" : "faint-highlight mild-outline bright-highlight-h"} subtle-rounded`}
                    onClick={() => { if (activeId == id) setActiveId(-1); else setActiveId(id); }}
                    key={`entry${id}`}>


                    {"name" in entries[id] ? (entries[id].name as String) : `#${id}`}
                </div>
            ))}
            <div
                className={`icon-light clickable icon-medium margins`}
                onClick={() => setActiveId(p.newEntry())}>
                <img src="/icons/plus.svg" className="icon-medium" />
            </div>

        </div>
        {
            currentList.includes(activeId) ? <AccordianItem
                key={activeId}
                data={entries[activeId]}
                id={activeId}
                currencyList={p.currencyList}
                fieldList={p.fieldList}
                setter={p.setter}
                deleteEntry={(id) => { p.deleteEntry(Number(id)); setActiveId(-1); }}
            /> : []
        }

    </div>;

    return <Collapsable
        class="light-shade mild-outline subtle-rounded hcenter-down vspaced"
        head={head}
        body={body}
        key={`${p.title}${activeId}`}
        default
        clickable={!p.stuck}
    />;
}

export default AccordianContainer;
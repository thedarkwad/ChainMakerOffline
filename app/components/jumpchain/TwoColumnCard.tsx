import { FunctionComponent } from "react"
import Collapsable from "../Collapsable";
import FloatingButton, { Direction, IconColor, IconSize } from "../FloatingButton";
import TextareaAutosize from 'react-textarea-autosize';
import FloatingButtonRow from "../FloatingButton";
import React from "react";



export type Row = { _title: string, _summary: string, [y: string]: string | number };

interface TwoColumnProps {
    data: Row[],
    title?: string,
    class?: string,
    setActive?: (a: boolean) => void
    submit?: () => void
    curr: string
}

const RowDisplay: FunctionComponent<{ row: Row, curr: string}> = ({ row, curr}) => {
    let { _title, _summary, _cost, ...rest } = row;
    let head = (<>
        <span className="bold right-text-align"> {_title}: </span>
        <span className="tall">
            {_summary}
            {(_cost !== undefined) ? (
                <span className="faint-text italics">
                    {" ("}Cost: {_cost} {curr}{")"}
                </span>
            ) : []}
        </span>
    </>);
    if (Object.keys(rest).length == 0) return head;
    return <Collapsable clickable={false} default={true} class="container" head={head} body={
        Object.entries(rest).map(([fieldName, fieldContent]: [string, string | number]) => (
            fieldContent ? (
                <React.Fragment key={fieldName}>
                    <span className="bold right-text-align faint-text small-text" key={"${fieldName} name"}> {fieldName}: </span>
                    <span className="faint-text user-whitespace" key={"${fieldName} content"}>{fieldContent}</span>
                </React.Fragment>)
                : []
        ))
    } />;
}

const RowEdit: FunctionComponent<{ row: Row, prefix: string, autofocus: boolean, curr: string}> = ({ row, prefix = "", autofocus = false, curr}) => {
    let { _title, _summary, _cost, ...rest } = row;
    let head = (<>
        <span className="bold right-text-align"> {_title}: </span>
        <span className="tall">
            <input type="text" defaultValue={_summary} name={`${prefix}__summary`} autoFocus={autofocus} autoComplete="off" />
            {(_cost !== undefined) ? (
                <span className="faint-text italics">
                    {" ("}Cost: <input type="number" defaultValue={_cost} name={`${prefix}__cost`} step="50" /> {curr}{")"}
                </span>
            ) : []}
        </span>
    </>);
    if (Object.keys(rest).length == 0) return head;
    return <Collapsable clickable={false} default={true} class="container" head={head} body={
        Object.entries(rest).map(([fieldName, fieldContent]: [string, string | number]) => (
            <React.Fragment key={fieldName}>
                <span className="bold right-text-align faint-text small-text"> {fieldName}: </span>
                <TextareaAutosize className="" defaultValue={fieldContent} name={`${prefix}_${fieldName}`} />
            </React.Fragment>
        ))
    } />;
}


const TwoColumn: FunctionComponent<TwoColumnProps & { mode: "display" | "edit"}> = (props) => {
    let head = (
        props.title ? (
            <span className=
                {`spanning bold center-text-align ${props.mode == "display" ? "medium" : "splash"}-highlight compact-cell subtle-rounded`}>
                {props.title}:
            </span >
        )
            : <></>
    );

    let displayButtons = [{ onClick: () => props.setActive!(true), icon: "pencil" }]
    let editButtons = [
        { onClick: () => props.setActive!(false), icon: "arrow-back" },
        { onClick: props.submit!, icon: "floppy-disk" },
    ]

    let rows = (
        <div className="right-weighted-column roomy-cell spanning">
            <FloatingButtonRow
                color={IconColor.Light}
                size={IconSize.Small}
                position={Direction.TopRight}
                buttons={props.mode == "display" ? displayButtons : editButtons}
            />
            {props.data.map((row, id) => (props.mode == "display") ?
                <RowDisplay row={row} key={id} curr={props.curr}/> :
                <RowEdit row={row} prefix={String(id)} autofocus={id == 0} key={id} curr={props.curr} />)
            }
        </div>);

    return (<Collapsable
        clickable={true}
        default={true}
        class={`faint-highlight mild-outline subtle-rounded ${props.class || ""} hcenter-down`}
        head={head}
        body={rows}
    />);
}

const TwoColumnEdit: FunctionComponent<TwoColumnProps> = (props: TwoColumnProps) => <TwoColumn {...props} mode="edit" />
const TwoColumnDisplay: FunctionComponent<TwoColumnProps> = (props: TwoColumnProps) => <TwoColumn {...props} mode="display" />


export { TwoColumn, TwoColumnEdit, TwoColumnDisplay };
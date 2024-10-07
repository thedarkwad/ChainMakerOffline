import { ClientRect, useDraggable, useDroppable } from "@dnd-kit/core";
import { FunctionComponent, RefObject } from "react";
import { Scrollbars } from "react-custom-scrollbars-2";
import EditableContainer, { EditableComponentProps } from "~/components/EditableContainer";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import Chain from "~/jumpchain/Chain";
import { Action } from "~/jumpchain/DataManager";

interface Note {
    title: string,
    body: string,
    id: number
}

const NoteCardView: FunctionComponent<EditableComponentProps<Note> & { chain: Chain, rerender: () => void, refs?: React.MutableRefObject<Record<number, HTMLDivElement | null>> }> =
    ({ data, chain, setActive, rerender, refs }) => {

        if (data == undefined)
            return <></>;

        return (
            <div className="squareContainer hover-container" ref={(e) => { if (refs) { refs.current[data.id] = e; } }}>
                <div className="squareContents mild-outline neutral-highlight roomy-cell subtle-rounded hcenter-down">
                    <div className="bold vspaced-half-compact clickable" >
                        {data.title || "[untitled note]"}
                    </div>
                    <FloatingButtonRow
                        buttons={[
                            {
                                onClick: (e: React.MouseEvent<HTMLElement>) => {
                                    if (window.confirm("Are you sure you want to delete? This cannot be undone.")) {
                                        delete chain.notes[data.id];
                                        chain.notesList = chain.notesList.filter((id) => id != data.id);

                                        chain.pushUpdate({
                                            dataField: ["notes", data.id],
                                            action: Action.Delete
                                        });
                                        chain.pushUpdate({
                                            dataField: ["notesList"],
                                            action: Action.Update
                                        });
                                        rerender();
                                    } else {
                                        e.stopPropagation();
                                    }
                                }, icon: "trash"
                            },
                            { onClick: () => { setActive!(true); }, icon: "pencil" }
                        ]}
                        color={IconColor.Light}
                        size={IconSize.Small}
                        position={Direction.TopRight}
                        hover
                    />
                    <Scrollbars universal
                        className=""
                        autoHeight
                        autoHeightMax={"100%"}
                        width={"100%"}
                        renderThumbVertical={props => <div {...props} className="suboverlay" style={{ ...props.style, borderRadius: "3px", backgroundColor: "rgba(125, 125, 175, 0.3)" }} />}
                    >
                        <div style={{ paddingRight: "1rem", paddingLeft: "1rem", wordBreak: "break-word" }} className="faint-text user-whitespace">
                            {data.body}
                        </div>
                    </Scrollbars>
                    <div className="compact-cell" />
                </div>
            </div>);

    }

const NoteCardEdit: FunctionComponent<EditableComponentProps<Note> & {
    submit: () => void, chain: Chain, rerender: () => void, refs?: React.MutableRefObject<Record<number, HTMLDivElement | null>>
}> =
    ({ data, setActive, submit, chain, rerender, refs }) => {

        return (
            <div className="squareContainer hover-container" ref={(e) => { if (refs) { refs.current[data.id] = e; } }}>
                <div className="squareContents mild-outline light-shade roomy-cell subtle-rounded left-align-down">
                    <div className="vspaced-half-compact spanning clickable">
                        <input name="title" className="roomy-cell" defaultValue={data.title} style={{ maxWidth: "calc(100% - 4rem)" }} autoFocus autoComplete="off" />
                    </div>
                    <FloatingButtonRow
                        buttons={[
                            {
                                onClick: (e: React.MouseEvent<HTMLElement>) => {
                                    if (window.confirm("Are you sure you want to delete? This cannot be undone.")) {
                                        delete chain.notes[data.id];
                                        chain.notesList = chain.notesList.filter((id) => id != data.id);

                                        chain.pushUpdate({
                                            dataField: ["notes", data.id],
                                            action: Action.Delete
                                        });
                                        chain.pushUpdate({
                                            dataField: ["notesList"],
                                            action: Action.Update
                                        });
                                        rerender();
                                    } else {
                                        e.stopPropagation();
                                    }
                                }, icon: "trash"
                            },
                            { onClick: () => setActive!(false), icon: "arrow-back" },
                            { onClick: submit, icon: "floppy-disk" },
                        ]}
                        color={IconColor.Light}
                        size={IconSize.Small}
                        position={Direction.TopRight}
                    />
                    <textarea defaultValue={data.body} className="roomy-cell spanning" style={{ justifySelf: "stretch", flexGrow: 1, overflowY: "auto" }} name="body" />
                </div>
            </div>);

    }
const NoteCard: FunctionComponent<{
    chain: Chain, noteId: number, active?: boolean, rerender: () => void, overlay?: boolean, rect?: DOMRect,
    refs: React.MutableRefObject<Record<number, HTMLDivElement | null>>

}>
    = ({ chain, noteId, active, rerender, overlay, rect, refs }) => {

        const droppable = useDroppable({
            id: String(noteId)
        });

        const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
            id: String(noteId)
        });

        const get = () => {
            return chain.notes[noteId];
        }

        const set = (formData: { [x: string]: any }) => {
            chain.notes[noteId].body = formData.body;
            chain.notes[noteId].title = formData.title;
            chain.pushUpdate({
                dataField: ["notes", noteId],
                action: Action.Update
            });
        }
        return <div
            className={`${droppable.isOver ? "grid-overline" : ""}`}
            style={!overlay ? { display: "contents" } : {}}
        >
            <div
                className={`${overlay ? "dragging" : ""}`}
                ref={(e) => { setNodeRef(e); droppable.setNodeRef(e); }}
                style={isDragging && !overlay ? { visibility: "hidden", position: "fixed", left: rect!.left, top: rect!.top, height: rect!.height, width: rect!.width } : {}}
                {...attributes}
                {...listeners}
            >
                <EditableContainer<Note,
                    {
                        chain: Chain, rerender: () => void, refs?: React.MutableRefObject<Record<number, HTMLDivElement | null>>
                    },
                    {
                        chain: Chain, rerender: () => void, refs?: React.MutableRefObject<Record<number, HTMLDivElement | null>>
                    }>
                    get={get}
                    set={set}
                    display={NoteCardView}
                    edit={NoteCardEdit}
                    active={!!active}
                    extraDisplayProps={{
                        rerender: rerender,
                        chain: chain,
                        refs: overlay? undefined : refs
                    }}
                    extraEditProps={{
                        rerender: rerender,
                        chain: chain,
                        refs: overlay? undefined : refs
                    }} />
            </div>
        </div>
    }

export default NoteCard;

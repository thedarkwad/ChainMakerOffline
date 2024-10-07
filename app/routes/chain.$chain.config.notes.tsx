import { useOutletContext } from "@remix-run/react";
import Chain from "~/jumpchain/Chain";
import NoteCard from "./$charId.config/NoteCard";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import { persistentAdd } from "~/jumpchain/Types";
import { useEffect, useRef, useState } from "react";
import { ClientRect, CollisionDetection, DndContext, DragEndEvent, DragOverlay, DragStartEvent, pointerWithin, rectIntersection, useSensor, useSensors } from "@dnd-kit/core";
import { MouseSensor, TouchSensor } from "./$charId.jump/Sensors";
import { Action } from "~/jumpchain/DataManager";
import { snapCenterToCursor } from "@dnd-kit/modifiers";

let customCollisionDetectionAlgorithm: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);

    if (pointerCollisions.length > 0) {
        return pointerCollisions;
    }

    return rectIntersection(args);
};


export default function Index() {

    const chain = useOutletContext<Chain>();
    let [activeNote, setActiveNote] = useState<number | undefined>(undefined);

    const itemsRef = useRef<Record<number, HTMLDivElement | null>>({});
    const [rect, setRect] = useState<DOMRect | undefined>(undefined);
    
    let [, setCounter] = useState(0);
    let rerender = () => { setCounter((x) => x + 1) };

    const mouseSensor = useSensor(MouseSensor, {
        activationConstraint: {
            distance: 20
        },
    });

    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: {
            delay: 250,
            tolerance: 5,
        },
    });

    const sensors = useSensors(
        mouseSensor,
        touchSensor,
    );

    let reorderJumps: (e: DragEndEvent) => void = (e) => {
        if (!e.over) return;
        let dIndex = chain.notesList.findIndex((id) => Number(e.over!.id) == id);
        let oIndex = chain.notesList.findIndex((id) => Number(e.active!.id) == id);

        chain.notesList.splice((dIndex <= oIndex) ? dIndex : dIndex - 1, 0, ...chain.notesList.splice(oIndex, 1));

        chain.pushUpdate({
            dataField: ["notesList"],
            action: Action.Update
        });

        setActiveNote(undefined);
    }

    let startDrag: (e: DragStartEvent) => void = (e) => {
        if (e.active) {
            setActiveNote(Number(e.active.id));
            setRect(itemsRef.current[Number(e.active.id)]!.getBoundingClientRect());
        }
    }

    let gridSquares = chain.notesList.map((id) =>
        <NoteCard chain={chain} noteId={id} key={`note_${id}`} rerender={rerender} active={id == activeNote} refs={itemsRef} rect={rect}/>
    );

    return <DndContext
        sensors={sensors}
        onDragEnd={reorderJumps}
        onDragStart={startDrag}
        collisionDetection={customCollisionDetectionAlgorithm}
    >
        <div className="responsive-grid spanning vspaced">
            {gridSquares}
            <DragOverlay>
                {activeNote !== undefined &&
                    <NoteCard chain={chain} noteId={activeNote} active={false} rerender={() => { }} overlay refs={itemsRef} rect={rect}/>
                }
            </DragOverlay>
            <div className="roomy-cell">
                <FloatingButtonRow
                    buttons={[{
                        onClick: () => {
                            let id = persistentAdd<{ title: string, body: string }>({ title: "", body: "" }, chain.notes);
                            chain.notes[id].id = id;
                            chain.notesList.push(id);
                            setActiveNote(id);
                            chain.pushUpdate({
                                dataField: ["notes", id],
                                action: Action.New
                            });
                            chain.pushUpdate({
                                dataField: ["notesList"],
                                action: Action.Update
                            });
                            rerender();
                        }, icon: "plus"
                    }]}
                    position={Direction.TopLeft}
                    color={IconColor.Light}
                    size={IconSize.Medium} />

            </div>
        </div>
    </DndContext>;

}
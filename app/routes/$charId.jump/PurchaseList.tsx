import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { FunctionComponent, useContext, useEffect, useState } from "react";
import Collapsable from "~/components/Collapsable";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import { PurchaseCard } from "~/components/jumpchain/PurchaseCard";
import Chain from "~/jumpchain/Chain";
import Purchase, { DefaultSubtype, PurchaseType } from "~/jumpchain/Purchase";
import { GID, Id } from "~/jumpchain/Types";
import { MouseSensor, TouchSensor } from "./Sensors";
import { Action, DataField } from "~/jumpchain/DataManager";
import { purchaseClipboardContext } from "../chain.$chain";
import { PurchaseSummary } from "~/components/jumpchain/PurchaseSummary";

export interface PurchaseListProps {
    chain: Chain,
    title: string,
    placeholder: string,
    source: Id<GID.Purchase>[],
    collapsable?: boolean,
    createNew?: () => Id<GID.Purchase>,
    rerender: () => void,
    filter?: (p: Purchase) => boolean,
    sourceDataField: DataField,
    copyKey?: string,
    summary?: boolean
}

const DraggablePurchaseCard: FunctionComponent<{
    chain: Chain, purchaseId: Id<GID.Purchase>, updateBudgets: () => void,
    active?: boolean, overlay?: boolean, copyKey?: string, summary?: boolean
}> = (p) => {

    const droppable = useDroppable({
        id: String(p.purchaseId)
    });

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: String(p.purchaseId)
    });

    return (
        <div
            className={``}
            style={isDragging ? { visibility: "hidden", height: "0" } : {}}
            ref={droppable.setNodeRef}
        >
            <div
                className={`${p.overlay ? "dragging mild-outline subtle-rounded faint-highlight" : ""} ${droppable.isOver ? "overline" : ""} row`}
                ref={setNodeRef}
                {...attributes}
                {...listeners}
            >
                {
                    !p.summary ? <PurchaseCard chain={p.chain} purchaseId={p.purchaseId} key={p.purchaseId} active={p.active} updateBudgets={p.updateBudgets}
                        copyKey={p.copyKey} /> :
                        <PurchaseSummary chain={p.chain} purchaseId={p.purchaseId} key={p.purchaseId} />

                }

            </div>
        </div>
    );
}

const PurchaseList: FunctionComponent<PurchaseListProps> = (p) => {

    let [newPurchase, registerNewPurchase] = useState({ counter: 0, id: -1 });
    const [activeGroup, setActiveGroup] = useState<undefined | Id<GID.Purchase>>(undefined);

    const clipboard = useContext(purchaseClipboardContext);

    useEffect(() => {
        registerNewPurchase({ counter: 0, id: -1 });
    }, [p.source]);

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

    let listHead = (
        <div className=
            {`bold center-text-align ${p.collapsable ? "medium-highlight" : ""} compact-cell subtle-rounded`}>
            {p.title}:
        </div>
    );

    let createNewPurchase = () => {
        if (!p.createNew) return;
        registerNewPurchase({ counter: newPurchase.counter + 1, id: p.createNew() });
    }

    let importPurchasesFromClipboard = () => {
        if (!clipboard.current) return;
        if (!p.createNew) return;
        for (let clipboardItem of clipboard.current) {
            if (clipboardItem.key != p.copyKey)
                continue;
            let pId = p.createNew();
            let newPurchase = p.chain.requestPurchase(pId);
            newPurchase.deserialize(clipboardItem.purchase, p.chain);
            newPurchase._id = pId;
            if (newPurchase.importData)
                newPurchase.importData = { ...newPurchase.importData };
            if (newPurchase.jumpId == +clipboardItem.originalJump) return;
            newPurchase.currency = 0;
            if (newPurchase.subtype)
                newPurchase.subtype = DefaultSubtype[newPurchase.type];
        }
    }

    let reorderPurchases: (e: DragEndEvent) => void = (e) => {
        if (!e.over) return;
        let dIndex = p.source.findIndex((id) => Number(e.over!.id) == id);
        let oIndex = p.source.findIndex((id) => Number(e.active!.id) == id);

        p.source.splice((dIndex <= oIndex) ? dIndex : dIndex - 1, 0, ...p.source.splice(oIndex, 1));

        p.chain.pushUpdate({
            dataField: p.sourceDataField,
            action: Action.Update
        });

        setActiveGroup(undefined);
    }

    let startDrag: (e: DragStartEvent) => void = (e) => {
        if (e.active) setActiveGroup(Number(e.active.id));
    }

    let ids = p.filter ? p.source.filter((id) => p.filter!(p.chain.requestPurchase(id))) : p.source;

    let listBody = <div className="compact-cell">
        <DndContext
            sensors={sensors}
            onDragEnd={reorderPurchases}
            onDragStart={startDrag}
        >
            {
                ids.map((pId) =>
                    <DraggablePurchaseCard chain={p.chain} purchaseId={pId} key={pId} active={pId == newPurchase.id} summary={p.summary} updateBudgets={p.rerender} copyKey={p.copyKey} />
                )
            }
            <DragOverlay>
                {activeGroup !== undefined &&
                    <DraggablePurchaseCard chain={p.chain} purchaseId={activeGroup} active={false} updateBudgets={() => { }} summary={p.summary} overlay />
                }
            </DragOverlay>

        </DndContext>
        <div className="spanning roomy-cell vspaced">
            {ids.length > 0 ? [] : (<div className="faint-text center-text-align big-margin-right">{p.placeholder}</div>)}
            {p.createNew ?
                <FloatingButtonRow
                    buttons={[
                        ...(clipboard.current && clipboard.current.some(item => item.key == p.copyKey) ? [{
                            onClick: () => {
                                importPurchasesFromClipboard();
                                registerNewPurchase({ counter: newPurchase.counter + 1, id: newPurchase.id });
                                p.rerender();
                            }, icon: "paste"
                        }] : []),
                        { onClick: createNewPurchase, icon: "plus-square" }
                    ]}
                    position={Direction.Right}
                    color={IconColor.Light}
                    size={IconSize.Small} />
                : []}
        </div>
    </div>;

    return p.collapsable ? <Collapsable head={listHead} body={listBody} default={true} clickable
        class="vspaced subtle-rounded" /> : <>{listHead}{listBody}</>

}

export default PurchaseList;
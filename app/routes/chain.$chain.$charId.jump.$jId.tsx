import { Link, NavLink, Outlet, redirect, useLocation, useNavigate, useNavigation, useOutletContext, useParams, useSearchParams } from "@remix-run/react";
import JumpNavigationBar from "./$charId.jump/JumpNavigationBar";
import Chain from "~/jumpchain/Chain";
import Jump, { DrawbackOverride, JumpSummary } from "~/jumpchain/Jump";
import { GID, Id } from "~/jumpchain/Types";
import { FunctionComponent, useEffect, useRef, useState } from "react";
import ExternalLink from "~/components/ExternalLink";
import { CollisionDetection, DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities"
import { snapCenterToCursor } from "@dnd-kit/modifiers";

import { pointerWithin, rectIntersection } from '@dnd-kit/core';
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import { Scrollbars } from "react-custom-scrollbars-2";

import { Action } from "~/jumpchain/DataManager";
import { toast } from "react-toastify";
import Purchase, { PurchaseType } from "~/jumpchain/Purchase";


let customCollisionDetectionAlgorithm: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);

    if (pointerCollisions.length > 0) {
        return pointerCollisions;
    }

    return rectIntersection(args);
};


let JumpNavGroup: FunctionComponent<{ chain: Chain, jIds: Id<GID.Jump>[], overlay?: boolean, charId: Id<GID.Character> }> = ({ chain, jIds, overlay, charId }) => {
    const params = useParams();
    const [query,] = useSearchParams();

    const droppable = useDroppable({
        id: jIds[0]
    });

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: JSON.stringify(jIds)
    });

    return (
        <div
            className={`row`}
            style={isDragging ? { visibility: "hidden", height: "0", padding: "0", margin: "0" } : {}}
            ref={droppable.setNodeRef}
        >
            <div
                className={`${overlay ? "dragging mild-outline subtle-rounded not-clickable" : ""} row light-shade ${droppable.isOver ? "overline" : ""}`}
                ref={setNodeRef}
                {...attributes}
                {...listeners}
            >
                {jIds.map((jId) => <JumpNavItem chain={chain} jId={jId} key={jId} charId={charId}
                    scroll={jId == Number(params.jId) && query.has("pId")} />)}
            </div>
        </div>
    );

}

let JumpNavItem: FunctionComponent<{ chain: Chain, jId: Id<GID.Jump>, charId: Id<GID.Character>, scroll: boolean }> = ({ chain, jId, charId, scroll }) => {
    const location = useLocation();
    let componentRef = useRef<HTMLAnchorElement>(null);
    let jSummary: JumpSummary = chain.jumps[jId];
    let dur = jSummary.duration;
    let to = location.pathname.replace(/\/jump\/\d+/, `/jump/${jId}`);

    useEffect(() => {
        if (scroll) {
            componentRef.current!.scrollIntoView({ behavior: "instant" });
        }
    }, [scroll]);

    return (<NavLink
        ref={componentRef}
        className={({ isActive }) => `row compact-cell ${isActive ? "medium-highlight" : "faint-text text-highlight-h"} ${chain.jumps[jId].characters.has(charId) ? "" : "very-faint"}`}
        to={to}
        title={`${dur.years} ${dur.years == 1 ? "Year" : "Years"}${dur.months ? ` and ${dur.months} ${dur.months == 1 ? "Month" : "Months"}` : ""}`}
    >
        <span className="bold">{jSummary.parentJump === undefined ? chain.getJumpNumber(jId) + 1 : ""}</span>
        <span className={jSummary.parentJump === undefined ? "" : "indented"}>
            {jSummary.name || "[untitled jump]"}
        </span>
    </NavLink>);


}

function groupJumps(chain: Chain): Id<GID.Jump>[][] {
    let ret: Id<GID.Jump>[][] = [];
    let accumulator: Id<GID.Jump>[] = [];
    for (let jumpId of chain.jumpList) {
        if (chain.jumps[jumpId].parentJump === undefined || chain.jumps[jumpId].parentJump < 0) {
            if (accumulator.length > 0) ret.push([...accumulator]);
            accumulator = [];
        }
        accumulator.push(jumpId);
    }
    ret.push([...accumulator]);
    return ret;
}

function recalculateBuyoff(drawback: Purchase, chain: Chain) {
    let jumpIndex = drawback.type == PurchaseType.ChainDrawback ? 0 : chain.jumpList.findIndex((id) => id == drawback.jumpId);
    for (let jId of chain.jumpList.slice(jumpIndex)) {
        for (let charId of Object.keys(chain.requestJump(jId).drawbackOverrides).map(Number)) {
            if (chain.requestJump(jId).drawbackOverrides[charId][jId]?.override == DrawbackOverride.BoughtOffPermanent
            ) {
                if (drawback.buyoff?.jumpId != jId) {
                    drawback.buyoff = { characterId: charId, jumpId: jId };
                    chain.pushUpdate({
                        action: Action.Update,
                        dataField: ["purchases", drawback.id, "buyoff"]
                    });
                }
                return;
            }
        }
    }
    if (drawback.buyoff) {
        delete drawback.buyoff;
        chain.pushUpdate({
            action: Action.Delete,
            dataField: ["purchases", drawback.id, "buyoff"]
        });
    }
}



export default function Index() {

    const params = useParams();
    const chain = useOutletContext<Chain>();
    const [, setCounter] = useState(0);
    const [activeGroup, setActiveGroup] = useState<undefined | Id<GID.Jump>[]>(undefined);

    const navigate = useNavigate();


    const mouseSensor = useSensor(MouseSensor, {
        activationConstraint: {
            delay: 250,
            tolerance: 150,
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


    let jId = Number(params.jId);
    let charId = Number(params.charId);
    let chainId = params.chain!;
    let jump = chain.requestJump(jId);
    if (!jump)
        return <></>;
    jump.recalculateBudgets();

    let rerender = () => { setCounter((a) => a + 1) };

    let budgetDisplays = jump.characters.has(charId) ? jump.listCurrencies().flatMap(
        (currId) => [
            <span className="roomy-cell subtle-rounded faint-highlight vcentered margin-left margin-right" key={`budget${currId}`}>
                <span className="bold">{jump.currency(currId).abbrev}:&nbsp;</span>{jump.budgets[charId][currId]}
            </span>,
            ...Object.entries(jump.stipends[charId][currId]).filter(([, x]) => x != 0).map(([stId, stipend]) =>
            (
                <span className="roomy-cell subtle-rounded faint-highlight vcentered margin-left margin-right" key={`stipend${currId}${stId}`}>
                    <span className="bold">{jump.purchaseSubtype(Number(stId)).name} Stipend:&nbsp;</span>{stipend}&nbsp;{jump.currency(currId).abbrev}
                </span>
            )

            )
        ]
    ) : [];

    let reorderJumps: (e: DragEndEvent) => void = (e) => {
        if (!e.over) return;
        let dIndex = chain.jumpList.findIndex((id) => e.over!.id == id);
        let oIndex = chain.jumpList.findIndex((id) => JSON.parse(e.active!.id as string)[0] == id);

        let oBlockSize = 1;
        for (let i = oIndex + 1;
            i < chain.jumpList.length && chain.jumps[chain.jumpList[i]].parentJump == JSON.parse(e.active!.id as string)[0];
            i++)
            oBlockSize++;

        chain.jumpList.splice((dIndex <= oIndex) ? dIndex : dIndex - oBlockSize, 0, ...chain.jumpList.splice(oIndex, oBlockSize));

        chain.pushUpdate({
            action: Action.Update,
            dataField: ["jumpList"]
        });

        jump.retainedDrawbacks[charId].forEach((dId) => recalculateBuyoff(chain.requestPurchase(dId), chain));
        chain.chainDrawbacks.forEach((dId) => recalculateBuyoff(chain.requestPurchase(dId), chain));
        Object.entries(jump.drawbackOverrides[charId]
        ).filter(([, { override }]) => override == DrawbackOverride.BoughtOffPermanent
        ).map(([id,]) => Number(id)).forEach((dId) => recalculateBuyoff(chain.requestPurchase(dId), chain));

        setActiveGroup(undefined);
    }

    let startDrag: (e: DragStartEvent) => void = (e) => {
        if (e.active) setActiveGroup(JSON.parse(e.active.id as string));
    }

    return <>
        <div className="wrapper">
            <nav className="narrow-column light-shade mobile-center">
                <div className="row extra-roomy-cell">
                    <div className="heading-text bold center-text-align vspaced">
                        Jumps Made:
                    </div>
                    <form className="roomy-cell rounded-rect neutral-highlight bright-outline center-text-align margins">
                        <span className="bold right-text-align">Character: </span>
                        <select value={charId} onChange={(e) => {
                            navigate(location.pathname.replace(/\/\d+\/jump/, `/${e.currentTarget.value}/jump`))
                        }}>
                            {chain.characterList.map((id) =>
                                <option key={`char${id}`} value={id}>{chain.characters[id].name}</option>
                            )}
                        </select>
                    </form>
                </div>
                <Scrollbars universal
                    autoHeight
                    autoHeightMax={"100%"}
                    className="mobile-tall"
                    renderView={props => <div {...props} className="right-weighted-column big-margin-left extra-roomy-cell mobile-tall" />}
                    renderThumbVertical={props => <div {...props} className="suboverlay" style={{ ...props.style, borderRadius: "3px", backgroundColor: "rgba(125, 125, 175, 0.3)" }} />}
                >
                    <DndContext
                        sensors={sensors}
                        onDragEnd={reorderJumps}
                        onDragStart={startDrag}
                        collisionDetection={customCollisionDetectionAlgorithm}
                    >
                        {groupJumps(chain).map((jIds) => <JumpNavGroup chain={chain} jIds={jIds} charId={charId} key={JSON.stringify(jIds)} />)}
                        <DragOverlay modifiers={[snapCenterToCursor]}
                        >
                            {activeGroup &&
                                <div className="narrow-column extra-roomy-cell">
                                    <div className="right-weighted-column big-margin-left">
                                        <JumpNavGroup chain={chain} charId={charId} jIds={activeGroup} overlay />
                                    </div>
                                </div>}
                        </DragOverlay>
                    </DndContext>
                </Scrollbars>
                <div className="roomy-cell spanning vspaced-big">
                    <FloatingButtonRow
                        buttons={[{
                            onClick: () => {
                                if (!confirm(`Are you sure you want to delete the jump "${jump.name || "[untitled jump]"}"? This cannot be undone.`))
                                    return;
                                if (chain.jumpList.length == 1) {
                                    toast.error('Cannot Delete Only Jump!', {
                                        position: "top-center",
                                        autoClose: false,
                                        hideProgressBar: true,
                                    });
                                    return;
                                }
                                let jumpIndex = chain.jumpList.findIndex((jId2) => jId2 == jId);
                                chain.deregisterJump(jId);
                                navigate(`/chain/${chainId}/${charId}/jump/${chain.jumpList[Math.min(jumpIndex, chain.jumpList.length - 1)]}`);
                            },
                            icon: "trash"

                        }, {
                            onClick: () => {
                                let id = (new Jump(chain)).id;
                                navigate(`/chain/${chainId}/${charId}/jump/${id}/config`);
                            },
                            icon: "plus-square"
                        }
                        ]}
                        position={Direction.Right}
                        color={IconColor.Light}
                        size={IconSize.Medium}
                    />
                </div>

            </nav >
            <div className="greedy-flex-item scrolling" >
                <div className="wrapper-2 extra-roomy-cell vspaced" >
                    <JumpNavigationBar chain={chain} jumpId={jId} jumperId={charId} />
                    <div className="roomy-cell bright-highlight subtle-rounded vspaced vcentered" style={{ rowGap: "0.5rem" }}>
                        <span className="heading-text margin-left left-align-self">
                            {jump.name || "[untitled jump]"} {jump.url ? <ExternalLink href={jump.url.match(/^https?:\/\/.*/) ? jump.url : "https://" + jump.url} color="white" /> : []}
                        </span>
                        {budgetDisplays}
                    </div>
                    {jump.characters.has(charId) ? <Outlet context={[chain, rerender]} /> :
                        <div className="roomy-cell center-text-align bold vspaced error-highlight">
                            Character Not Imported Into This Jump!
                        </div>
                    }

                </div>
            </div>
        </div >
    </>

}
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext, useParams } from "@remix-run/react";
import Chain from "~/jumpchain/Chain";
import { FunctionComponent, useState } from "react";
import SummaryNavigationBar from "./$charId.summary/SummaryNavigationBar";
import { Scrollbars } from "react-custom-scrollbars-2";
import { GID, Id } from "~/jumpchain/Types";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import Character from "~/jumpchain/Character";
import { toast } from "react-toastify";
import { CollisionDetection, DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, pointerWithin, rectIntersection, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { Action } from "~/jumpchain/DataManager";

let customCollisionDetectionAlgorithm: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);

    if (pointerCollisions.length > 0) {
        return pointerCollisions;
    }

    return rectIntersection(args);
};


let CharacterNavItem: FunctionComponent<{ cId: Id<GID.Character>, active: boolean, chain: Chain, navigate: (s: string) => void, overlay?: boolean }> = (p) => {
    let location = useLocation();
    let char = p.chain.requestCharacter(p.cId);
    let params = useParams();
    let chainId = params.chain!;


    const droppable = useDroppable({
        id: String(p.cId)
    });

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: String(p.cId)
    });


    let printAge = (age: number) => {
        if (age < 1000)
            return `${age} Years`;
        if (age < 30000)
            return `${Math.round(age / 100)} Centuries`;
        return `${Math.round(age / 1000)} Millenia`
    }

    return (
        <div
            className={` ${p.active ? "vspaced" : ""} right-align hcenter-down ${p.overlay ? `dragging not-clickable` : ""}  ${droppable.isOver ? "overline" : ""}`}
            style={isDragging ? { visibility: "hidden", height: "0", padding: "0", margin: "0", display: "flex" } : { display: "flex" }}
            ref={droppable.setNodeRef}>
            <NavLink to={location.pathname.replace(/\/\d+\/summary/, `/${p.cId}/summary`)}
                className={({ isActive }) =>
                    `${isActive || p.overlay ? "bright-highlight center-text-align" : "medium-highlight-h faint-highlight"}
                        ${isActive ? "bright-outline" : ""}
                        ${isActive && !p.overlay ? "large-text" : ""}
                        spanning bold compact-cell`}
                ref={setNodeRef}
                {...attributes}
                {...listeners}
            >
                {p.chain.characters[p.cId].name}
            </NavLink>
            {p.active ?
                <div className="extra-roomy-cell lower-rounded bright-outline faint-highlight spanning right-weighted-column">
                    <span className="bold right-align-self">True Age:</span>
                    <span className="">{printAge(char.trueAge)}</span>
                    <span className="bold right-align-self">Jumps Made:</span>
                    <span className="">{char.jumpsMade}</span>
                    {!char.primary ?
                        <>
                            <span className="bold right-align-self">First Jump:</span>
                            <span className="">{char.firstJump > 0 ?
                                <Link className="underline" to={`/chain/${chainId}/${p.cId}/jump/${char.firstJump}`}> {p.chain.jumps[char.firstJump].name}</Link>
                                : "None"
                            }</span>
                        </>
                        : <></>
                    }
                    <span className="bold right-align-self">Perks Aquired:</span>
                    <span className="">{char.perkCount}</span>
                    <span className="bold right-align-self">Items Hoarded:</span>
                    <span className="">{char.itemCount}</span>
                    <FloatingButtonRow
                        buttons={[{
                            onClick: () => {
                                if (!confirm(`Are you sure you want to delete ${p.chain.characters[p.cId].name}? This cannot be undone, and will remove all of their perks, items, and other purchases, as well as the purchases of any companions that they imported.`)) return;
                                let primaryJumpers = p.chain.characterList.filter(id => p.chain.characters[id].primary);
                                if (primaryJumpers.length == 1 && p.chain.characters[p.cId].primary) {
                                    toast.error('Cannot Delete Only Primary Jumper!', {
                                        position: "top-center",
                                        autoClose: false,
                                        hideProgressBar: true,
                                    });
                                    return;
                                }
                                let newCharNum = Math.max(0, p.chain.characterList.findIndex(id => id == p.cId) - 1);
                                p.chain.deregisterCharacter(p.cId);
                                p.navigate(location.pathname.replace(/\/\d+\/summary/, `/${p.chain.characterList[newCharNum]}/summary`))
                            },
                            icon: "trash"
                        }]}
                        position={Direction.TopRight}
                        color={IconColor.Light}
                        size={IconSize.Small} />

                </div>
                : []
            }

        </div>
    );
}

export default function Index() {

    const params = useParams();
    const chain = useOutletContext<Chain>();
    const [, setCounter] = useState(0);
    const [draggedCharacter, setDraggedCharacter] = useState<undefined | Id<GID.Character>>(undefined);
    let navigate = useNavigate();

    let startDrag: (e: DragStartEvent) => void = (e) => {
        if (e.active) setDraggedCharacter(Number(e.active.id));
    }

    let reorderCharacters: (e: DragEndEvent) => void = (e) => {
        if (!e.over) return;
        if (draggedCharacter === undefined) return;

        let dIndex = chain.characterList.findIndex((id) => e.over!.id == id);
        let oIndex = chain.characterList.findIndex((id) => draggedCharacter == id);

        if (chain.characters[Number(e.over!.id)].primary != chain.characters[draggedCharacter!].primary)
            return;

        chain.characterList.splice((dIndex <= oIndex) ? dIndex : dIndex - 1, 0, ...chain.characterList.splice(oIndex, 1));

        chain.pushUpdate({
            action: Action.Update,
            dataField: ["characterList"]
        });

        setDraggedCharacter(undefined);
    }


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


    let charId = Number(params.charId);
    let chainId = params.chain!;


    let rerender = () => { setCounter((a) => a + 1) };

    if (!chain.characterList.includes(charId)) {
        return <></>;
    }

    let primaryJumpers = chain.characterList.filter(id => chain.characters[id].primary);
    let primarJumperInd = primaryJumpers.findIndex(id => id == charId);
    let prevPrimaryJumpers = primarJumperInd >= 0 ? primaryJumpers.slice(0, primarJumperInd) : [];
    let futurePrimaryJumpers = primarJumperInd >= 0 ? primaryJumpers.slice(primarJumperInd + 1) : primaryJumpers;

    let companionJumpers = chain.characterList.filter(id => !chain.characters[id].primary);
    let currentCompanionJumperInd = companionJumpers.findIndex(id => id == charId);
    let prevCompanionJumpers = currentCompanionJumperInd >= 0 ? companionJumpers.slice(0, currentCompanionJumperInd) : [];
    let futureCompanionJumpers = currentCompanionJumperInd >= 0 ? companionJumpers.slice(currentCompanionJumperInd + 1) : companionJumpers;

    return <>
        <div className="wrapper">
            <nav className="narrow-column light-shade mobile-center">
                <Scrollbars universal
                    className="mobile-tall"
                    renderView={props => <div {...props} className="extra-roomy-cell mobile-tall" />}
                    renderThumbVertical={props => <div {...props} className="suboverlay" style={{ ...props.style, borderRadius: "3px", backgroundColor: "rgba(125, 125, 175, 0.3)" }} />}
                >
                    <div className="heading-text bold center-text-align vspaced">
                        Primary Jumper{primaryJumpers.length > 1 ? "s" : ""}:
                    </div>
                    <DndContext
                        sensors={sensors}
                        onDragEnd={reorderCharacters}
                        onDragStart={startDrag}
                        collisionDetection={customCollisionDetectionAlgorithm}
                    >
                        {prevPrimaryJumpers.length > 0 ?
                            <div className="mild-outline spanning">{
                                prevPrimaryJumpers.map(
                                    (id) =>
                                        <CharacterNavItem cId={id} active={id == charId} chain={chain} key={`${id}-char-nav`} navigate={navigate} />)
                            }
                            </div>
                            : []}

                        {primarJumperInd >= 0 ? <CharacterNavItem cId={charId} active={true} chain={chain} key={`${charId}-char-nav`} navigate={navigate} /> : []}

                        {futurePrimaryJumpers.length > 0 ?
                            <div className="mild-outline spanning">{
                                futurePrimaryJumpers.map(
                                    (id) =>
                                        <CharacterNavItem cId={id} active={id == charId} chain={chain} key={`${id}-char-nav`} navigate={navigate} />)
                            }
                            </div>
                            : []}
                        <DragOverlay modifiers={[snapCenterToCursor]}>
                            {draggedCharacter !== undefined && chain.characters[draggedCharacter].primary &&
                                <CharacterNavItem chain={chain} cId={draggedCharacter} active={false} navigate={() => { }} overlay />
                            }
                        </DragOverlay>
                    </DndContext>
                    <div className="vspaced right-text-align extra-roomy-cell">
                        <FloatingButtonRow
                            buttons={[{
                                onClick: () => {
                                    let newChar = new Character(chain);
                                    newChar.primary = true;
                                    newChar.name = "[new jumper]";
                                    chain.characterList.sort((id1, id2) => +(chain.characters[id2].primary) - +(chain.characters[id1].primary));
                                    navigate(`/chain/${chainId}/${newChar.id}/summary`);

                                },
                                icon: "plus-square"
                            }]}
                            position={Direction.Right}
                            color={IconColor.Light}
                            size={IconSize.Small} />
                    </div>
                    <div className="heading-text bold center-text-align vspaced">
                        Companions:
                    </div>
                    <DndContext
                        sensors={sensors}
                        onDragEnd={reorderCharacters}
                        onDragStart={startDrag}
                        collisionDetection={customCollisionDetectionAlgorithm}
                    >
                        {prevCompanionJumpers.length > 0 ?
                            <div className="mild-outline spanning">{
                                prevCompanionJumpers.map(
                                    (id) =>
                                        <CharacterNavItem cId={id} active={id == charId} chain={chain} key={`${id}-char-nav`} navigate={navigate} />)
                            }
                            </div>
                            : []}

                        {currentCompanionJumperInd >= 0 ? <CharacterNavItem cId={charId} active={true} chain={chain} key={`${charId}-char-nav`} navigate={navigate} /> : []}

                        {futureCompanionJumpers.length > 0 ?
                            <div className="mild-outline spanning">{
                                futureCompanionJumpers.map(
                                    (id) =>
                                        <CharacterNavItem cId={id} active={id == charId} chain={chain} key={`${id}-char-nav`} navigate={navigate} />)
                            }
                            </div>
                            : []}
                        <DragOverlay modifiers={[snapCenterToCursor]}>
                            {draggedCharacter !== undefined && !chain.characters[draggedCharacter].primary &&
                                <CharacterNavItem chain={chain} cId={draggedCharacter} active={false} navigate={() => { }} overlay />
                            }
                        </DragOverlay>
                    </DndContext>
                    <div className="vspaced vcentered center-text-align extra-roomy-cell">
                        {companionJumpers.length ? [] : "No Companions!"}
                        <FloatingButtonRow
                            buttons={[{
                                onClick: () => {
                                    let newChar = new Character(chain);
                                    newChar.primary = false;
                                    newChar.name = "[new companion]";
                                    navigate(`/chain/${chainId}/${newChar.id}/summary`);

                                },
                                icon: "plus-square"
                            }]}
                            position={Direction.Right}
                            color={IconColor.Light}
                            size={IconSize.Small} />
                    </div>
                </Scrollbars>
            </nav >
            <div className="greedy-flex-item scrolling" >
                <div className="wrapper-2 extra-roomy-cell vspaced" >
                    <SummaryNavigationBar chain={chain} jumperId={charId} />
                    <Outlet context={[chain, rerender]} />
                </div>
            </div>
        </div >
    </>

}
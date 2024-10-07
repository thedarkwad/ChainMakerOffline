import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext, useParams } from "@remix-run/react";
import Chain from "~/jumpchain/Chain";
import { FunctionComponent, useState } from "react";
import { Scrollbars } from "react-custom-scrollbars-2";
import { GID, Id } from "~/jumpchain/Types";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import Character from "~/jumpchain/Character";
import { toast } from "react-toastify";
import { CollisionDetection, DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, pointerWithin, rectIntersection, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { Action } from "~/jumpchain/DataManager";
import ItemNavigationBar from "./$charId.items/ItemNavigationBar";

export default function Index() {

    const chain = useOutletContext<Chain>();
    let params = useParams();
    let chainId = params.chain!;

    const NavItem: FunctionComponent<{ text: string, address: string }> = ({ text, address }) => {
        let sharedClasses = "roomy-cell subtle-rounded hspaced clickable";
        let activeClasses = "active-navlink medium-highlight mild-outline";
        let inactiveClasses = "inactive-navlink text-highlight-h mild-outline-h faint-highlight-h";
        return (<NavLink end className={({ isActive }) => `${sharedClasses} ${isActive ? activeClasses : inactiveClasses}`}
            to={address}>
            <span className="def out-of-flow center-text-align" style={{ left: 0, right: 0 }}>{text}</span>
            <span className="alternate bold">{text}</span>
        </NavLink>);
    }


    return <>
        <div className="wrapper">
            <div className="greedy-flex-item scrolling" >
                <div className="wrapper-2 extra-roomy-cell vspaced" style={{marginRight: "auto", marginLeft: "auto"}}>
                    <nav className="flex-left faint-text">
                        <NavItem text="Settings" address={`/chain/${chainId}/config`} />
                        <NavItem text="Chain Supplements" address={`/chain/${chainId}/config/supp`} />
                        <NavItem text="Chain Drawbacks" address={`/chain/${chainId}/config/drawbacks`} />
                        <NavItem text="Notes & Houserules" address={`/chain/${chainId}/config/notes`} />
                    </nav>
                    <Outlet context={chain} />
                </div>
            </div>
        </div >
    </>

}
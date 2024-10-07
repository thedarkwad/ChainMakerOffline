import { FunctionComponent, ReactElement, ReactNode, useState } from "react";

interface CollapsableProps {
    head: ReactNode;
    body: ReactNode;
    class?: string;
    openClass?: string;
    closedClass?: string;
    default?: boolean;
    clickable?: boolean
}

function dealWithNull(s: string | undefined) {
    if (s) return s;
    else return "";
}

function click (e : React.MouseEvent, toggleOpen: () => void) {
    if ((e.target as Element)?.closest("input, .input")) return;
    toggleOpen();
}

const Collapsable: FunctionComponent<CollapsableProps> = (p: CollapsableProps) => {
    const [open, setOpen] = useState(p.default);
    return (
        <div className={dealWithNull(open ? p.openClass : p.closedClass) + " " + dealWithNull(p.class)} style={{height: "min-content"}}>
            {
                (p.clickable) ?
                    <div onClick={(e) => click(e,  () => {setOpen(!open);})} className="container clickable">{p.head}</div> :
                    p.head
            }
            <div className={open ? "container" : "hidden"}>
            {p.body}
            </div>
        </div>
    );
};

export default Collapsable;

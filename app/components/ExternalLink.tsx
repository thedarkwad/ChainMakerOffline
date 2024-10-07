import { FunctionComponent } from "react";

interface ButtonRowProps {
    href: string,
    big?: boolean,
    color: "white" | "black" | "faint",
}

const filters = {
    white: "invert(100%) sepia(100%) saturate(0%) hue-rotate(333deg) brightness(101%) contrast(102%)",
    black: "none",
    faint: "invert(55%) sepia(1%) saturate(3727%) hue-rotate(202deg) brightness(106%) contrast(87%)"
}

const ExternalLink: FunctionComponent<ButtonRowProps> = (p) => {
    return (
        <a href={p.href} target="_blank">
            <img src="/icons/new-window.svg" style={{
                color: "transparent",
                display: "inline-block",
                height: (p.big ? "2em" : "1em"),
                width: (p.big ? "2em" : "1em"),
                filter: filters[p.color]
            }} />
        </a>
    );
}

export default ExternalLink;
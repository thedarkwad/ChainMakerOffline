import { FunctionComponent } from "react";

export enum Direction {
    Top,
    TopRight,
    OffTopRight,
    Right,
    BottomRight,
    Bottom,
    BottomLeft,
    Left,
    TopLeft
}

export enum IconColor {
    Light,
    Dark
}

export enum IconSize {
    Small,
    Medium
}

const PositionClasses: Record<Direction, string> = {
    [Direction.Top]: "float-top",
    [Direction.TopRight]: "float-top-right",
    [Direction.OffTopRight]: "float-off-top-right",
    [Direction.Right]: "float-right",
    [Direction.BottomRight]: "float-bottom-right",
    [Direction.Bottom]: "float-bottom",
    [Direction.BottomLeft]: "float-bottom-left",
    [Direction.Left]: "float-left",
    [Direction.TopLeft]: "top-left"
};

interface ButtonRowProps {
    buttons: { onClick: React.MouseEventHandler<HTMLImageElement>; icon: string }[]
    position: Direction,
    color: IconColor,
    size: IconSize,
    hover?: boolean,
    hoverAlt?: boolean
    unclickable?:boolean
}

const FloatingButtonRow: FunctionComponent<ButtonRowProps> = (p) => {
    return (
        <div className={`${PositionClasses[p.position]} ${p.hover ? "hover" : ""} ${p.hoverAlt ? "hover-alt" : ""} ${p.unclickable ? "not-clickable" : ""}`}>
            {
                p.buttons.map(({ onClick, icon }, key) => (
                    <img
                        onClick={onClick}
                        key={key}
                        src={`/icons/${icon}.svg`}
                        className=
                        {`clickable icon-${p.color == IconColor.Light ? "light" : "dark"} icon-${p.size == IconSize.Small ? "small" : "medium"}`}
                    />)
                )
            }
        </div>
    )
}

export default FloatingButtonRow;
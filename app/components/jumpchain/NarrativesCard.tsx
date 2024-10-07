import { FunctionComponent, useState } from "react";
import { NarrativeBlurb } from "~/jumpchain/Jump";
import EditableContainer, { EditableComponentProps } from "../EditableContainer";
import Collapsable from "../Collapsable";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "../FloatingButton";
import TextareaAutosize from 'react-textarea-autosize';
import { GID, Id } from "~/jumpchain/Types";
import Multiselect from "../Multiselect";
import Chain from "~/jumpchain/Chain";
import { Action } from "~/jumpchain/DataManager";

const NarrativeCardView: FunctionComponent<EditableComponentProps<NarrativeBlurb> & { characterName: string, jumpName?: string, defaultOpen?: boolean, horizontal?: boolean }> =
    ({ data, setActive, characterName, jumpName, defaultOpen, horizontal }) => {
        const placeholders = {
            goals: `What does ${characterName} hope to achieve here? What experiences are they looking for? What are their desires and needs?`,
            challenges: `Who gets in ${characterName}'s way? What do they they have to overcome to get what they want? What surprises do they encounter?`,
            accomplishments: `What will ${characterName} have accomplished when it's all said and done? What good and what evil will they have done to this world?`
        }
        let head = (
            <div className="spanning row">
                <span className=
                    {`bold center-text-align medium-highlight compact-cell ${horizontal ? "subtle" : "upper"}-rounded ${horizontal ? "spanning" : ""}`}>
                    {jumpName || "Narrative Summary"}:
                </span >
            </div>
        );

        let body = (
            <div className="row compact-cell">
                <FloatingButtonRow
                    buttons={[{ onClick: () => setActive!(true), icon: "pencil" }]}
                    color={IconColor.Light}
                    size={IconSize.Small}
                    position={Direction.TopRight}
                    />
                <div className="vspaced">
                    <span className="bold strong-text">Goals: </span>
                    <div className="spanning user-whitespace">
                        {data.goals || <span className="very-faint-text">{placeholders.goals}</span>}
                    </div>
                </div>
                <div className="vspaced">
                    <span className="bold strong-text">Obstacles: </span>
                    <div className="spanning user-whitespace">
                        {data.challenges || <span className="very-faint-text">{placeholders.challenges}</span>}
                    </div>
                </div>
                <div className="vspaced">
                    <span className="bold strong-text">Accomplishments: </span>
                    <div className="spanning user-whitespace">
                        {data.accomplishments || <span className="very-faint-text">{placeholders.accomplishments}</span>}
                    </div>
                </div>
            </div>
        );

        return <Collapsable
            clickable={true}
            default={!!defaultOpen}
            class={`subtle-rounded ${horizontal ? "three-column-even vspaced" : "light-shade medium-outline"}`}
            head={head}
            body={body}
        />
    }

const NarrativeCardEdit: FunctionComponent<EditableComponentProps<NarrativeBlurb> & {
    submit: () => void, jumpName?: string,
    setOpen: () => void, horizontal?: boolean
}> =
    ({ data, setActive, submit, jumpName, setOpen, horizontal }) => {

        setOpen();

        let head = (
            <span className=
                {`spanning bold center-text-align splash-highlight compact-cell subtle-rounded`}>
                {jumpName || "Narrative Summary"}:
            </span >
        );

        let body = (
            <div className="roomy-cell spanning">
                <FloatingButtonRow
                    buttons={[
                        { onClick: () => setActive!(false), icon: "arrow-back" },
                        { onClick: submit, icon: "floppy-disk" },
                    ]}
                    color={IconColor.Light}
                    size={IconSize.Small}
                    position={Direction.TopRight} />
                <div className="vspaced">
                    <span className="bold strong-text">Goals:</span>
                    <TextareaAutosize className="user-whitespace spanning" defaultValue={data.goals} name="goals" autoFocus />
                </div>
                <div className="vspaced">
                    <span className="bold strong-text">Obstacles:</span>
                    <TextareaAutosize className="user-whitespace spanning" defaultValue={data.challenges} name="challenges" />
                </div>
                <div className="vspaced">
                    <span className="bold strong-text">Accomplishments:</span>
                    <TextareaAutosize className="user-whitespace spanning" defaultValue={data.accomplishments} name="accomplishments" />
                </div>
            </div>
        );

        return <Collapsable
            clickable={true}
            default={true}
            class={`faint-highlight mild-outline subtle-rounded hcenter-down ${horizontal ? "three-column-even vspaced" : ""}`}
            head={head}
            body={body}
        />
    }

const NarrativeCard: FunctionComponent<{
    chain: Chain, jumperId: Id<GID.Character>, jumpId: Id<GID.Jump>,
    summary?: boolean, defaultOpen?: boolean, horizontal?: boolean
}>
    = ({ chain, jumperId, jumpId, summary, defaultOpen, horizontal }) => {

        const [open, setOpen] = useState<boolean>(!!defaultOpen);

        const get = () => {
            return chain.requestJump(jumpId).narratives[jumperId];
        }
        const set = (formData: { [x: string]: any }) => {
            chain.requestJump(jumpId).narratives[jumperId] = formData as NarrativeBlurb;
            chain.pushUpdate({
                dataField: ["jumps", jumpId, "narratives", jumperId],
                action: Action.Update
            });
        }

        return <EditableContainer<NarrativeBlurb,
            { characterName: string, jumpName?: string, defaultOpen?: boolean, horizontal?: boolean },
            { jumpName?: string, setOpen: () => void, horizontal?: boolean }>
            get={get}
            set={set}
            display={NarrativeCardView}
            edit={NarrativeCardEdit}
            extraDisplayProps={{
                characterName: chain.characters[jumperId].name,
                jumpName: summary ? chain.jumps[jumpId].name : undefined,
                defaultOpen: open,
                horizontal: horizontal
            }}
            extraEditProps={{
                jumpName: summary ? chain.jumps[jumpId].name : undefined,
                setOpen: () => { setOpen(true); },
                horizontal: horizontal
            }} />
    }


export { NarrativeCardView };

export default NarrativeCard;
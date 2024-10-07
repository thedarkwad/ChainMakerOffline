import { FunctionComponent, useState } from "react";
import { NarrativeBlurb } from "~/jumpchain/Jump";
import TextareaAutosize from 'react-textarea-autosize';
import { GID, Id } from "~/jumpchain/Types";
import Chain from "~/jumpchain/Chain";
import { Action } from "~/jumpchain/DataManager";
import EditableContainer, { EditableComponentProps } from "~/components/EditableContainer";
import { Personality } from "~/jumpchain/Character";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import Collapsable from "~/components/Collapsable";

const PersonalityCardView: FunctionComponent<EditableComponentProps<Personality> & { characterName: string, defaultOpen?: boolean }> =
    ({ data, setActive, characterName, defaultOpen }) => {
        const placeholders = {
            personality: `What type of person is ${characterName}? What are they like to be around?`,
            motivation: `Why does ${characterName} jump? What purpose do they find for the many abilities they shall accumulate?`,
            likes: `What is at least one thing that ${characterName} enjoys?`,
            dislikes: `What is at least one thing that ${characterName} doesn't enjoy?`,
            quirks: `What is at least one thing that makes ${characterName} weird or unique?`

        }
        let head = (
            <div className="spanning row">
                <span className=
                    {`bold center-text-align medium-highlight compact-cell upper-rounded`}>
                    Personal Identity:
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
                    <span className="bold">Personality: </span>
                    <div className="spanning user-whitespace">
                        {data.personality || <span className="very-faint-text">{placeholders.personality}</span>}
                    </div>
                </div>
                <div className="vspaced">
                    <span className="bold">Motivation: </span>
                    <div className="spanning user-whitespace">
                        {data.motivation || <span className="very-faint-text">{placeholders.motivation}</span>}
                    </div>
                </div>
                <div className="vspaced three-column-even">
                    <div>
                        <span className="bold">Likes: </span>
                        <div className="user-whitespace">
                            {data.likes || <span className="very-faint-text">{placeholders.likes}</span>}
                        </div>
                    </div>
                    <div>
                        <span className="bold">Dislikes: </span>
                        <div className="user-whitespace">
                            {data.dislikes || <span className="very-faint-text">{placeholders.dislikes}</span>}
                        </div>
                    </div>
                    <div>
                        <span className="bold">Quirks: </span>
                        <div className="user-whitespace">
                            {data.quirks || <span className="very-faint-text">{placeholders.quirks}</span>}
                        </div>
                    </div>
                </div>
            </div>
        );

        return <Collapsable
            clickable={true}
            default={!!defaultOpen}
            class={`subtle-rounded light-shade medium-outline`}
            head={head}
            body={body}
        />
    }

const PersonalityCardEdit: FunctionComponent<EditableComponentProps<Personality> & {
    submit: () => void
    setOpen: () => void
}> =
    ({ data, setActive, submit, setOpen }) => {

        setOpen();

        let head = (
            <span className=
                {`spanning bold center-text-align splash-highlight compact-cell subtle-rounded`}>
                Personal Identity:
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
                    <span className="bold">Personality:</span>
                    <TextareaAutosize className="user-whitespace spanning" defaultValue={data.personality} name="personality" autoFocus />
                </div>
                <div className="vspaced">
                    <span className="bold">Motivation:</span>
                    <TextareaAutosize className="user-whitespace spanning" defaultValue={data.motivation} name="motivation" />
                </div>
                <div className="vspaced three-column-even">
                    <span className="bold">Likes: </span>
                    <TextareaAutosize className="user-whitespace spanning" defaultValue={data.likes} name="likes" />
                    <span className="bold">Dislikes: </span>
                    <TextareaAutosize className="user-whitespace spanning" defaultValue={data.dislikes} name="dislikes" />
                    <span className="bold">Quirks: </span>
                    <TextareaAutosize className="user-whitespace spanning" defaultValue={data.quirks} name="quirks" />
                </div>
            </div>
        );

        return <Collapsable
            clickable={true}
            default={true}
            class={`faint-highlight mild-outline subtle-rounded hcenter-down`}
            head={head}
            body={body}
        />
    }

const PersonalityCard: FunctionComponent<{
    chain: Chain, jumperId: Id<GID.Character>
}>
    = ({ chain, jumperId }) => {

        const [open, setOpen] = useState<boolean>(true);

        const get = () => {
            return chain.requestCharacter(jumperId).personality;
        }
        const set = (formData: { [x: string]: any }) => {
            chain.requestCharacter(jumperId).personality = formData as Personality;
            chain.pushUpdate({
                dataField: ["characters", jumperId, "personality"],
                action: Action.Update
            });
        }

        return <EditableContainer<Personality,
            { characterName: string, defaultOpen?: boolean },
            { setOpen: () => void }>
            get={get}
            set={set}
            display={PersonalityCardView}
            edit={PersonalityCardEdit}
            extraDisplayProps={{
                characterName: chain.characters[jumperId].name,
                defaultOpen: open
            }}
            extraEditProps={{
                setOpen: () => { setOpen(true); }
            }} />
    }


export default PersonalityCard;
import { useOutletContext, useParams } from "@remix-run/react";
import { AltFormCard, AltFormCardView } from "~/components/jumpchain/AltFormCard";
import Chain from "~/jumpchain/Chain";
import OriginalBackgroundCard from "./$charId.summary/OriginalBackgroundCard";
import PersonalityCard from "./$charId.summary/PersonalityCard";
import TextareaAutosize from 'react-textarea-autosize';
import { FunctionComponent, useState } from "react";
import EditableContainer, { EditableComponentProps } from "~/components/EditableContainer";
import { Personality } from "~/jumpchain/Character";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import Collapsable from "~/components/Collapsable";
import { GID, Id } from "~/jumpchain/Types";
import { Action } from "~/jumpchain/DataManager";

const BiographyView: FunctionComponent<EditableComponentProps<string> & { defaultOpen?: boolean }> =
    ({ data, setActive, defaultOpen }) => {
        let head = (
            <div className="spanning row">
                <span className=
                    {`bold center-text-align medium-highlight compact-cell upper-rounded`}>
                    Biography / Notes:
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
                    <div className="spanning user-whitespace">
                        {data || <span className="very-faint-text">Feel free to add additional context and description here!</span>}
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

const BiographyEdit: FunctionComponent<EditableComponentProps<string> & {
    submit: () => void
    setOpen: () => void
}> =
    ({ data, setActive, submit, setOpen }) => {

        setOpen();

        let head = (
            <span className=
                {`spanning bold center-text-align splash-highlight compact-cell subtle-rounded`}>
                Biography / Notes:
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
                <div className="vspaced big-margin-left" style={{ marginRight: "4rem" }}>
                    <TextareaAutosize minRows={4} className="user-whitespace spanning" defaultValue={data} name="bio" autoFocus />
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

const BiographyCard: FunctionComponent<{
    chain: Chain, jumperId: Id<GID.Character>
}>
    = ({ chain, jumperId }) => {

        const [open, setOpen] = useState<boolean>(!!chain.requestCharacter(jumperId).notes.length);

        const get = () => {
            return chain.requestCharacter(jumperId).notes;
        }

        const set = (formData: { [x: string]: any }) => {
            chain.requestCharacter(jumperId).notes = formData.bio;
            chain.pushUpdate({
                dataField: ["characters", jumperId, "notes"],
                action: Action.Update
            });
        }

        return <EditableContainer<string,
            { defaultOpen?: boolean },
            { setOpen: () => void }>
            get={get}
            set={set}
            display={BiographyView}
            edit={BiographyEdit}
            extraDisplayProps={{
                defaultOpen: open
            }}
            extraEditProps={{
                setOpen: () => { setOpen(true); }
            }} />
    }


export default function Index() {
    const params = useParams();
    let charId = Number(params.charId);
    let [chain, updateBudgets] = useOutletContext<[Chain, () => void]>();

    return (<>
        <div className="space-evenly vspaced">
            <div className="hcenter-down" style={{ alignItems: "stretch", rowGap: "0.5rem"}}>
                <OriginalBackgroundCard chain={chain} jumperId={charId} rerender={updateBudgets} key={`background-${charId}`}/>
                <BiographyCard chain={chain} jumperId={charId} key={`bio-${charId}`}/>
            </div>
            <PersonalityCard chain={chain} jumperId={charId} key={`personality-${charId}`}/>
        </div>
        <div className=
            {`spanning bold center-text-align subtle-rounded extra-roomy-cell`}>
            {"Original Body:"}
        </div >
        <AltFormCard chain={chain} key={`originalform-${charId}`} altFormId={chain.requestCharacter(charId).originalForm} rerender={() => { }} essential />
    </>);

}


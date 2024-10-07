import { useNavigate, useOutletContext, useParams } from "@remix-run/react";
import { FunctionComponent, MouseEvent, useContext, useEffect, useState } from "react";
import Collapsable from "~/components/Collapsable";
import TextareaAutosize from 'react-textarea-autosize';
import EditableContainer, { EditableComponentProps } from "~/components/EditableContainer";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import { AltFormCard, AltFormCardView } from "~/components/jumpchain/AltFormCard";
import BackgroundCard from "~/components/jumpchain/BackgroundCard";
import NarrativeCard from "~/components/jumpchain/NarrativesCard";
import AltForm from "~/jumpchain/AltForm";
import Chain from "~/jumpchain/Chain";
import { Action } from "~/jumpchain/DataManager";
import LayoutManager, { MarkupMode } from "~/jumpchain/LayoutManager";
import { GID, Id } from "~/jumpchain/Types";

const NotesView: FunctionComponent<EditableComponentProps<string> & { defaultOpen?: boolean }> =
    ({ data, setActive, defaultOpen }) => {
        let head = (
            <div className="spanning row">
                <span className=
                    {`bold center-text-align medium-highlight compact-cell upper-rounded`}>
                    Additional Notes:
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

const NotesEdit: FunctionComponent<EditableComponentProps<string> & {
    submit: () => void
    setOpen: () => void
}> =
    ({ data, setActive, submit, setOpen }) => {

        setOpen();

        let head = (
            <span className=
                {`spanning bold center-text-align splash-highlight compact-cell subtle-rounded`}>
                Additional Notes:
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
                    <TextareaAutosize minRows={4} className="user-whitespace spanning" defaultValue={data} name="notes" autoFocus />
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

const NotesCard: FunctionComponent<{
    chain: Chain, jumperId: Id<GID.Character>, jumpId: Id<GID.Jump>
}>
    = ({ chain, jumperId, jumpId }) => {

        const [open, setOpen] = useState<boolean>(!!chain.requestJump(jumpId).notes[jumperId]?.length);

        const get = () => {
            return chain.requestJump(jumpId).notes[jumperId] || "";
        }

        const set = (formData: { [x: string]: any }) => {
            chain.requestJump(jumpId).notes[jumperId] = formData.notes;
            chain.pushUpdate({
                dataField: ["jumps", jumpId, "notes", jumperId],
                action: Action.Update
            });
        }

        return <EditableContainer<string,
            { defaultOpen?: boolean },
            { setOpen: () => void }>
            get={get}
            set={set}
            display={NotesView}
            edit={NotesEdit}
            extraDisplayProps={{
                defaultOpen: open
            }}
            extraEditProps={{
                setOpen: () => { setOpen(true); }
            }} />
    }


export default function Index() {
    const params = useParams();
    let jId = Number(params.jId);
    let chainId = String(params.chain);
    let charId = Number(params.charId);
    let navigate = useNavigate();
    let [chain, updateBudgets] = useOutletContext<[Chain, () => void]>();

    let [, setCounter] = useState(0);
    let rerender = () => { setCounter((x) => x + 1) };

    let layoutManager = new LayoutManager();
    layoutManager.markupMode = MarkupMode.BBCode;

    let jump = chain.requestJump(jId);

    useEffect( () => {
        if (!jump.useAltForms && !jump.useNarratives && !jump.originCategoryList.length && !Object.values(jump.notes).some(a => a.length != 0)) {
            navigate(`/chain/${chainId}/${charId}/jump/${jId}/purchases`, {
                replace: true});
        }    
    }, [jId])

    if (!jump.useAltForms && !jump.useNarratives && !jump.originCategoryList.length && !Object.values(jump.notes).some(a => a.length != 0)) {
        return <></>;
    }

    return (<>
        <div className="space-evenly">
            {chain.requestJump(jId).originCategoryList.length > 0 ?
                <BackgroundCard chain={chain} jumpId={jId} jumperId={charId} updateBudgets={updateBudgets} key={`background-${jId}-${charId}`}/>
                : []
            }
            <div className="hcenter-down" style={{ alignItems: "stretch", rowGap: "0.5rem" }}>
                {chain.requestJump(jId).useNarratives && (chain.chainSettings.narratives == "enabled" || (chain.characters[charId].primary && chain.chainSettings.narratives == "restricted")) ?
                    <NarrativeCard chain={chain} jumpId={jId} jumperId={charId} key={`narratives-${jId}-${charId}`} defaultOpen /> :
                    []
                }
                <NotesCard chain={chain} jumpId={jId} jumperId={charId} key={`notes-${jId}-${charId}`} />
            </div>
        </div>
        {chain.chainSettings.altForms && chain.requestJump(jId).useAltForms ?
            <div className="spanning row vspaced-half-big">
                <span className=
                    {`spanning bold center-text-align subtle-rounded extra-roomy-cell`}>
                    {"New Alt-Forms:"}
                </span >
                {chain.requestJump(jId).altForms[charId].length ?
                    <div className="row" style={{ paddingBottom: "1rem" }}>
                        {chain.requestJump(jId).altForms[charId].map((afId) =>
                            <AltFormCard chain={chain} altFormId={afId} key={`${afId}_AltForm`} rerender={rerender} />)}
                    </div> : []
                }
                <div className="spanning center-text-align" style={{ paddingRight: "3rem", paddingLeft: "3rem" }}>
                    {chain.requestJump(jId).altForms[charId].length ? [] : "No New Alt-Forms Obtained"}
                    <FloatingButtonRow
                        buttons={[{
                            onClick: () => { new AltForm(chain, charId, jId); rerender(); },
                            icon: "plus-square"
                        }]} position={Direction.Right} color={IconColor.Light} size={IconSize.Small} />
                </div>
            </div>
            : []}
    </>);

}


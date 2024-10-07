import { FunctionComponent } from "react";
import { PurchaseGroup } from "~/jumpchain/Purchase";
import EditableContainer, { EditableComponentProps } from "../EditableContainer";
import Collapsable from "../Collapsable";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "../FloatingButton";
import TextareaAutosize from 'react-textarea-autosize';
import { GID, Id } from "~/jumpchain/Types";
import Chain from "~/jumpchain/Chain";
import { Action } from "~/jumpchain/DataManager";
import PurchaseList from "~/routes/$charId.jump/PurchaseList";
import { useSearchParams } from "@remix-run/react";

const PurchaseGroupView: FunctionComponent<EditableComponentProps<PurchaseGroup> & { del: (e: React.MouseEvent<HTMLElement>) => void, summary?: boolean, }> = (p) => {

    let head = (
        <div className="row compact-cell hover-container">
            <FloatingButtonRow
                buttons={[
                    ...(!p.summary ? [({
                        onClick: p.del, icon: "trash"
                    })] : []),
                    { onClick: (e) => { p.setActive!(true); e.stopPropagation() }, icon: "pencil" }
                ]}
                color={IconColor.Light}
                size={IconSize.Small}
                position={Direction.TopRight}
                hover
            />
            <div>
                <div className="bold overflow-container">
                    {p.data.name || <span className="faint-text">[unnamed group]</span>}
                </div>
            </div>
            <span className="overflow-container">
                <div className="overflow-container extra-big-margin-right user-whitespace">
                    {p.data.description || <span className="faint-text">
                        Summarize the purchase group here. How did you first aquire it? What do you use it for?
                    </span>}
                </div>
            </span>
        </div>
    );

    return (
        head
    );

}

const PurchaseGroupEdit: FunctionComponent<EditableComponentProps<PurchaseGroup> & {
    submit: () => void,
    del: (e: React.MouseEvent<HTMLElement>) => void,
    summary?: boolean
}> = (p) => {

    let head = (
        <div className="row compact-cell">
            <FloatingButtonRow
                buttons={[
                    { onClick: (e) => { p.setActive!(false); e.stopPropagation(); }, icon: "arrow-back" },
                    ...(!p.summary ? [({
                        onClick: p.del, icon: "trash"
                    })] : []),
                    { onClick: (e) => { p.submit(); e.stopPropagation(); }, icon: "floppy-disk" },
                ]}
                color={IconColor.Light}
                size={IconSize.Small}
                position={Direction.TopRight}
            />
            <div>
                <div className="bold margin-bottom-mobile">
                    <input name="name" defaultValue={p.data.name} className="spanning compact-cell" autoFocus autoComplete="off"
                        onClick={(e) => e.stopPropagation()} />
                </div>
            </div>
            <span className="margin-right">
                <div className="overflow-container extra-extra-big-margin-right">
                    <TextareaAutosize defaultValue={p.data.description} className="spanning compact-cell" name="description"
                        onClick={(e) => e.stopPropagation()} />
                </div>
            </span>
        </div>
    );

    return (
        <div className="spanning ui-highlight medium-outline subtle-rounded vspaced two-column-fixed roomy-cell">
            {head}
        </div>
    );

}

const PurchaseGroupCard: FunctionComponent<{ chain: Chain, charId: Id<GID.Character>, pgId: Id<GID.PurchaseGroup>, active?: boolean, summary?: boolean, rerender: () => void }>
    = ({ chain, charId, pgId, active, summary, rerender }) => {

        const [searchParams,] = useSearchParams();

        const get = () => {
            return chain.purchaseGroups[charId][pgId];
        }

        const set = (formData: { [x: string]: any }) => {
            chain.pushUpdate({
                dataField: ["purchaseGroups", charId, pgId, "name"],
                action: Action.Update
            });
            chain.pushUpdate({
                dataField: ["purchaseGroups", charId, pgId, "description"],
                action: Action.Update
            });
            chain.purchaseGroups[charId][pgId].name = formData.name;
            chain.purchaseGroups[charId][pgId].description = formData.description;
        }

        let del = (e: React.MouseEvent<HTMLElement>) => {
            if (window.confirm("Are you sure you want to delete? This cannot be undone.")) {
                chain.deregisterPurchaseGroup(charId, pgId);
                rerender();
            } else {
                e.stopPropagation();
            }
        }

        return <Collapsable
            head={<EditableContainer<PurchaseGroup, { summary?: boolean, del: (e: React.MouseEvent<HTMLElement>) => void }, { summary?: boolean, del: (e: React.MouseEvent<HTMLElement>) => void }>
                get={get}
                set={set}
                active={active}
                display={PurchaseGroupView}
                edit={PurchaseGroupEdit}
                extraDisplayProps={{
                    summary: summary,
                    del: del
                }}
                extraEditProps={{
                    summary: summary,
                    del: del
                }} />}
            body={
                <div className="spanning">
                    <PurchaseList
                        chain={chain}
                        title={"Components"}
                        placeholder={"No Purchases Imported"}
                        source={chain.purchaseGroups[charId][pgId].components}
                        rerender={() => { }}
                        collapsable
                        summary={true}
                        sourceDataField={["purchaseGroups", charId, pgId, "components"]} />
                </div>
            }
            class={`spanning subtle-rounded two-column-fixed ${summary ? "compact-cell" : "roomy-cell"}`}
            openClass="faint-highlight medium-outline vspaced-half-compact active"
            closedClass="faint-highlight-h vspaced-compact mild-outline-h overflow-ellipsis inactive"
            default={searchParams.get("group") == String(pgId)}
            clickable
        />


    }



export { PurchaseGroupCard };
import { FunctionComponent, ReactNode, useState } from "react";
import Purchase, { CostModifier, PurchaseType } from "~/jumpchain/Purchase";
import EditableContainer, { EditableComponentProps } from "../EditableContainer";
import Collapsable from "../Collapsable";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "../FloatingButton";
import TextareaAutosize from 'react-textarea-autosize';
import { GID, Id, LID } from "~/jumpchain/Types";
import Chain from "~/jumpchain/Chain";
import { Link, useParams } from "@remix-run/react";
import { Action } from "~/jumpchain/DataManager";
import PurchaseList from "~/routes/$charId.jump/PurchaseList";
import { SubsystemSummary } from "~/jumpchain/Jump";

const PurchaseSummaryView: FunctionComponent<EditableComponentProps<Purchase> & { startOpen: boolean, jumpNum?: number }> = (p) => {

    let params = useParams();
    let chainId = params.chain!;

    let chain = p.data.chain;

    let jumpNum = (p.jumpNum !== undefined) ? p.jumpNum :
        chain.getJumpNumber(chain.jumpList[chain.jumpList.length - 1]) + 1;

    let summary: SubsystemSummary | undefined = undefined;

    let url: string | undefined;
    switch (p.data.type) {
        case PurchaseType.Item:
        case PurchaseType.Perk:
            url = `/chain/${chainId}/${p.data.characterId}/jump/${p.data.jumpId}/purchases?pId=${p.data.id}`;
            for (let stId in chain.requestJump(p.data.jumpId).subsystemSummaries[p.data.characterId]) {
                for (let summ of chain.requestJump(p.data.jumpId).subsystemSummaries[p.data.characterId][stId]) {
                    if (summ.id == p.data.id) {
                        url = `/chain/${chainId}/${p.data.characterId}/jump/${p.data.jumpId}/subsystem/${stId}?pId=${p.data.id}`;
                        summary = summ;
                    }
                }
            }
            break;
        case PurchaseType.Supplement:
            url = `/chain/${chainId}/${p.data.characterId}/jump/${p.data.jumpId}/supp/${p.data.supplement!}?pId=${p.data.id}`;
            break;
    }

    let link = url ? <span className="faint-text small-text italic hidden-when-inactive">
        <span className="bold">From:</span> <span className="underline-h">
            <Link to={url}> {chain.jumps[p.data.jumpId].name || "[untitled jump]"} </Link>
        </span>
    </span>
        : [];
    let bottomSection = <></>;

    if (p.data.duration !== undefined && p.data.duration >= 1) {
        let remainingDuration = p.data.duration + chain.getJumpNumber(p.data.jumpId) - jumpNum;
        bottomSection = (
            <span className="italic faint-text">
                Expires {remainingDuration == 1 ? "at end of jump" : `in ${remainingDuration} jumps`}
            </span>
        );
    }


    let head = (
        <div className="row compact-cell hover-container">
            <FloatingButtonRow
                buttons={[
                    { onClick: () => p.setActive!(true), icon: "pencil" }
                ]}
                color={IconColor.Light}
                size={IconSize.Small}
                position={Direction.TopRight}
                hover
            />
            <div>
                <div className="bold overflow-container">
                    {p.data.name || <span className="faint-text">[unnamed purchase]</span>}
                </div>
                {link}
            </div>
            <span className="overflow-container">
                <div className="overflow-container big-margin-right user-whitespace">
                    {p.data.description}
                </div>
                <div className="hidden-when-inactive">
                    {bottomSection}
                </div>
            </span>
        </div>
    );

    let body = summary ?
        <div className="spanning vspaced-compact">
            <PurchaseList
                chain={chain}
                collapsable={true}
                copyKey={`should_never_be_pasted_into`}
                title={"Components"}
                placeholder={"No Components Purchased!"}
                source={chain.requestJump(p.data.jumpId).purchases[p.data.characterId]}
                rerender={() => { }}
                sourceDataField={["jumps", p.data.jumpId, "purchases", p.data.characterId]
                }
                filter={(p) => summary.subpurchases.includes(p.id)}
                summary={true}
            /> </div>
        : <></>;

    return (
        <Collapsable
            head={head}
            body={body}
            class="spanning subtle-rounded two-column-fixed compact-cell"
            openClass="faint-highlight medium-outline vspaced-half-compact active"
            closedClass="faint-highlight-h vspaced-compact mild-outline-h overflow-ellipsis inactive"
            default={p.startOpen}
            clickable
        />
    );

}

const PurchaseSummaryEdit: FunctionComponent<EditableComponentProps<Purchase> & { submit: () => void, jumpNum?: number, setOpen: (a: boolean) => void }> = (p) => {

    let params = useParams();
    let chainId = params.chain!;

    let chain = p.data.chain;

    let jumpNum = (p.jumpNum !== undefined) ? p.jumpNum :
        chain.getJumpNumber(chain.jumpList[chain.jumpList.length - 1]) + 1;

    p.setOpen(true);

    let url: string | undefined;
    switch (p.data.type) {
        case PurchaseType.Item:
        case PurchaseType.Perk:
            url = `/chain/${chainId}/${p.data.characterId}/jump/${p.data.jumpId}/purchases?pId=${p.data.id}`;
            for (let stId in chain.requestJump(p.data.jumpId).subsystemSummaries[p.data.characterId]) {
                for (let summ of chain.requestJump(p.data.jumpId).subsystemSummaries[p.data.characterId][stId]) {
                    if (summ.id == p.data.id) {
                        url = `/chain/${chainId}/${p.data.characterId}/jump/${p.data.jumpId}/subsystem/${stId}?pId=${p.data.id}`;
                    }
                }
            }
            break;
        case PurchaseType.Supplement:
            url = `/chain/${chainId}/${p.data.characterId}/jump/${p.data.jumpId}/supp/${p.data.supplement!}?pId=${p.data.id}`;
            break;
    }

    let link = url ? <span className="faint-text small-text italic">
        <span className="bold">From:</span> <span className="underline-h">
            <Link to={url}> {chain.jumps[p.data.jumpId].name || "[untitled jump]"} </Link>
        </span>
    </span>
        : [];

    let bottomSection = <></>;

    if (p.data.duration !== undefined && p.data.duration >= 1) {
        let remainingDuration = p.data.duration + chain.getJumpNumber(p.data.jumpId) - jumpNum;
        bottomSection = (
            <span className="italic faint-text">
                Expires {remainingDuration == 1 ? "at end of jump" : `in ${remainingDuration} jumps`}
            </span>
        );
    }


    let head = (
        <div className="row compact-cell">
            <FloatingButtonRow
                buttons={[
                    { onClick: () => { p.setActive!(false); }, icon: "arrow-back" },
                    { onClick: p.submit, icon: "floppy-disk" },
                ]}
                color={IconColor.Light}
                size={IconSize.Small}
                position={Direction.TopRight}
            />
            <div>
                <div className="bold">
                    <input name="name" defaultValue={p.data.name} className="spanning compact-cell" autoFocus autoComplete="off" />
                </div>
                {link}
            </div>
            <span className="">
                <div className="overflow-container extra-big-margin-right">
                    <TextareaAutosize defaultValue={p.data.description} className="spanning compact-cell" name="description" />
                </div>
                <div>
                    {bottomSection}
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

const PurchaseSummary: FunctionComponent<{ chain: Chain, purchaseId: Id<GID.Purchase>, active?: boolean, jumpNum?: number }>
    = ({ chain, purchaseId, active, jumpNum }) => {

        const [open, setOpen] = useState(false);

        const get = () => {
            return chain.requestPurchase(purchaseId);
        }
        const set = (formData: { [x: string]: any }) => {
            const purchase = chain.requestPurchase(purchaseId);
            chain.pushUpdate({
                dataField: ["purchases", purchaseId, "name"],
                action: Action.Update
            });
            chain.pushUpdate({
                dataField: ["purchases", purchaseId, "description"],
                action: Action.Update
            });
            purchase.name = formData.name;
            purchase.description = formData.description;
        }

        return <EditableContainer<Purchase, { jumpNum?: number, startOpen: boolean }, { jumpNum?: number, setOpen: (a: boolean) => void }>
            get={get}
            set={set}
            active={active}
            display={PurchaseSummaryView}
            edit={PurchaseSummaryEdit}
            extraDisplayProps={{
                jumpNum: jumpNum,
                startOpen: open
            }}
            extraEditProps={{
                jumpNum: jumpNum,
                setOpen: setOpen
            }} />
    }



export { PurchaseSummary, PurchaseSummaryView };
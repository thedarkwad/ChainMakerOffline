import { FunctionComponent, ReactNode, useState } from "react";
import Purchase, { CostModifier, PurchaseType } from "~/jumpchain/Purchase";
import TextareaAutosize from 'react-textarea-autosize';
import { GID, Id, LID } from "~/jumpchain/Types";
import Chain from "~/jumpchain/Chain";
import { Link, useParams } from "@remix-run/react";
import Jump, { DrawbackOverride } from "~/jumpchain/Jump";
import { Action } from "~/jumpchain/DataManager";
import EditableContainer, { EditableComponentProps } from "~/components/EditableContainer";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import Collapsable from "~/components/Collapsable";
import Multiselect from "~/components/Multiselect";

const RetainedDrawbackView: FunctionComponent<EditableComponentProps<Purchase> & { startOpen: boolean, jId: number, jumperId: number }> = (p) => {

    let chain = p.data.chain;
    let params = useParams();
    let chainId = params.chain!;

    let override = p.data.chain.jumps[p.jId].drawbackOverrides[p.jumperId][p.data.id]
        || { override: DrawbackOverride.Enabled, modifier: p.data.costModifier };

    let originalModifier = p.data.costModifier;
    let originalPurchaseValue = p.data.purchaseValue;
    let originalValue = p.data.value;
    p.data.costModifier = override.modifier;
    p.data.purchaseValue = override.purchaseValue;

    let companionView = p.data.type == PurchaseType.ChainDrawback && !chain.chainSettings.chainDrawbacksForCompanions
        && !chain.characters[p.jumperId].primary;

    if (companionView)
        p.data.value = p.data.companionStipend || 0;

    let jumpNum = p.data.chain.getJumpNumber(p.jId);

    let link;
    switch (p.data.type) {
        case PurchaseType.Drawback:
            link = <Link to={`/chain/${chainId}/${p.data.characterId}/jump/${p.data.jumpId}/drawbacks?pId=${p.data.id}`}> {chain.jumps[p.data.jumpId]?.name || "[untitled jump]"} </Link>;
            break;
        case PurchaseType.ChainDrawback:
            link = <Link to={`/chain/${chainId}/config/drawbacks?pId=${p.data.id}`}>Chain Drawbacks</Link>;
            break;
    }


    let bottomSection = <></>;

    if (p.data.duration !== undefined && p.data.duration >= 1) {
        let remainingDuration = p.data.duration + chain.getJumpNumber(p.data.jumpId) - jumpNum;
        bottomSection = (
            <span className="italic faint-text">
                Expires {remainingDuration == 1 ? "at end of jump" : `in ${remainingDuration} jumps`}
            </span>
        );
    }
    let costString = "";

    switch (override.override) {
        case DrawbackOverride.Enabled:
            costString = `Retained for ${p.data.cost} ${chain.requestJump(p.jId).currency(0).abbrev}${override.modifier == CostModifier.Reduced ? " (half value) "
                : override.modifier == CostModifier.Custom ? " (modified value) "
                    : override.modifier == CostModifier.Free ? " (free) " : ""}`;
            break;
        case DrawbackOverride.Excluded:
            costString = "Excluded";
            break;
        case DrawbackOverride.BoughtOffTemp:
            costString = `Temporarily Bought-Off for ${p.data.cost}${override.modifier == CostModifier.Reduced ? " (half value) "
                : override.modifier == CostModifier.Custom ? " (modified value) "
                    : override.modifier == CostModifier.Free ? " [free]" : ""}`;
            break;
        case DrawbackOverride.BoughtOffPermanent:
            costString = `Permanently Bought-Off for ${p.data.cost}${override.modifier == CostModifier.Reduced ? " (half value) "
                : override.modifier == CostModifier.Custom ? " (modified value) "
                    : override.modifier == CostModifier.Free ? " [free]" : ""}`;
            break;
    }


    let head = (
        <div className="row compact-cell">
            <FloatingButtonRow
                buttons={[
                    { onClick: () => p.setActive!(true), icon: "pencil" }
                ]}
                color={IconColor.Light}
                size={IconSize.Small}
                position={Direction.TopRight}
                hover
            />
            <span className="bold overflow-container">
                {p.data.name || <span className="faint-text">[unnamed purchase]</span>} &nbsp;
            </span>
            <span className="vcentered hidden-when-inactive">
                <span className="italic">
                    {costString}
                </span>
                <span className="big-margin-left big-margin-right"> | </span>
                Drawback
            </span>
            <span className="hidden-when-active overflow-container extra-big-margin-right">
                <span className="faint-text">
                    [<span className="italic">
                        {costString}
                    </span>]
                </span>
                &nbsp;
                {override.override !== DrawbackOverride.Excluded ? p.data.description : ""}
            </span>
        </div>
    );
    let body = (
        <div className="row compact-cell">
            <span className="faint-text small-text">
                {companionView ? [] : <>
                    <span className="bold margin-right">Item Stipend:</span>
                    {p.data.itemStipend || 0} <br />
                </>}
                <span className="bold">From:</span> <span className="underline-h">{link}</span>
            </span>
            <span className="user-whitespace">
                {p.data.description}
            </span>
            <span></span>
            {bottomSection}

        </div>
    );

    p.data.costModifier = originalModifier;
    p.data.purchaseValue = originalPurchaseValue;
    p.data.value = originalValue;

    return (
        <Collapsable
            head={head}
            body={body}
            class={`spanning subtle-rounded two-column-fixed compact-cell hover-container ${override.override == DrawbackOverride.Excluded ? "faint-text" : ""}`}
            openClass="faint-highlight medium-outline active vspaced-half-compact"
            closedClass="faint-highlight-h vspaced-compact inactive mild-outline-h overflow-ellipsis"
            default={p.startOpen}
            clickable
        />
    );

}

const RetainedDrawbackEdit: FunctionComponent<EditableComponentProps<Purchase> & { submit: () => void, jId: number, jumperId: number, setOpen: (a: boolean) => void }> = (p) => {


    let chain = p.data.chain;
    let params = useParams();
    let chainId = params.chain!;


    let override = p.data.chain.jumps[p.jId].drawbackOverrides[p.jumperId][p.data.id]
        || { override: DrawbackOverride.Enabled, modifier: p.data.costModifier };

    let [excluded, setExcluded] = useState<boolean>(override.override == DrawbackOverride.Excluded);

    let originalModifier = p.data.costModifier;
    let originalPurchaseValue = p.data.purchaseValue;
    p.data.costModifier = override.modifier;
    p.data.purchaseValue = override.purchaseValue;

    let jumpNum = p.data.chain.getJumpNumber(p.jId);

    let link;
    switch (p.data.type) {
        case PurchaseType.Drawback:
            link = <Link to={`/chain/${chainId}/${p.data.characterId}/jump/${p.data.jumpId}/drawbacks?pId=${p.data.id}`}> {chain.jumps[p.data.jumpId]?.name || "[untitled jump]"} </Link>;
            break;
        case PurchaseType.ChainDrawback:
            link = <Link to={`/chain/${chainId}/config/drawbacks`}>Chain Drawbacks</Link>;
            break;
    }


    let bottomSection = <></>;

    if (p.data.duration !== undefined && p.data.duration >= 1) {
        let remainingDuration = p.data.duration + chain.getJumpNumber(p.data.jumpId) - jumpNum;
        bottomSection = (
            <span className="italic faint-text">
                Expires {remainingDuration == 1 ? "at end of jump" : `in ${remainingDuration} jumps`}
            </span>
        );
    }

    let overrideDropdown = <Multiselect
        name={"override"}
        options={{
            [DrawbackOverride.Enabled]: { name: "Retained" },
            [DrawbackOverride.BoughtOffPermanent]: { name: "Bought Off Permanently" },
            [DrawbackOverride.BoughtOffTemp]: { name: "Bought Off For Jump" },
            [DrawbackOverride.Excluded]: { name: "Excluded" }
        }}
        single
        default={CostModifier.Free}
        value={{
            [DrawbackOverride.Enabled]: override.override == DrawbackOverride.Enabled,
            [DrawbackOverride.BoughtOffPermanent]: override.override == DrawbackOverride.BoughtOffPermanent,
            [DrawbackOverride.BoughtOffTemp]: override.override == DrawbackOverride.BoughtOffTemp,
            [DrawbackOverride.Excluded]: override.override == DrawbackOverride.Excluded
        }}

        onChange={(data) => setExcluded(!!data[DrawbackOverride.Excluded])}
    />

    let costModifierDropdown = <Multiselect
        name={"costModifier"}
        options={{
            [CostModifier.Full]: { name: "At Full Value" },
            [CostModifier.Reduced]: { name: "At Half Value" },
            [CostModifier.Free]: { name: "For No Points" },
            [CostModifier.Custom]: { name: "For Modified Points", numeric: true }
        }}
        single
        default={CostModifier.Free}
        value={{
            [CostModifier.Full]: override.modifier == CostModifier.Full,
            [CostModifier.Reduced]: override.modifier == CostModifier.Reduced,
            [CostModifier.Free]: override.modifier == CostModifier.Free,
            [CostModifier.Custom]: override.modifier == CostModifier.Custom && override.purchaseValue!
        }}
    />



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
            <span className="">
                <input name="name" defaultValue={p.data.name} className="spanning compact-cell" autoFocus autoComplete="off" />
            </span>
            <span className="vcentered margin-top-mobile">
                {overrideDropdown}{excluded ? [] : costModifierDropdown}
            </span>
        </div>
    );
    let body = (
        <div className="row compact-cell">
            <span className="small-text">
                <span className="bold margin-right">Item Stipend:</span>
                {p.data.itemStipend || 0} <br />
                <span className="bold">From:</span> <span className="underline-h">{link}</span>
            </span>
            <span className="user-whitespace">
                <TextareaAutosize defaultValue={p.data.description} className="spanning compact-cell" name="description" />
            </span>
            <span></span>
            {bottomSection}

        </div>
    );

    p.data.costModifier = originalModifier;
    p.data.purchaseValue = originalPurchaseValue;

    return (
        <div
            className="spanning ui-highlight medium-outline subtle-rounded vspaced two-column-fixed roomy-cell">
            {head}
            {body}
        </div>
    );
}

const RetainedDrawbackCard: FunctionComponent<{
    chain: Chain, purchaseId: Id<GID.Purchase>, active?: boolean,
    jId: Id<GID.Jump>, jumperId: Id<GID.Character>,
    rerender: () => void
}>
    = ({ chain, purchaseId, active, jId, jumperId, rerender }) => {

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
            let costModifierString = formData.costModifier ? Object.keys(JSON.parse(formData.costModifier)).find((s) => JSON.parse(formData.costModifier)[s]) : CostModifier.Full;
            let costModifier = (costModifierString === undefined) ? CostModifier.Free : Number(costModifierString);
            let override = Number(Object.keys(JSON.parse(formData.override)).find((s) => JSON.parse(formData.override)[s]));

            if (override == DrawbackOverride.BoughtOffPermanent) {
                if (purchase.buyoff) {
                    delete chain.jumps[purchase.buyoff.jumpId].drawbackOverrides[purchase.buyoff.characterId][purchaseId]
                    chain.pushUpdate({
                        dataField: ["jumps", purchase.buyoff.jumpId, "drawbackOverrides", purchase.buyoff.characterId, purchaseId],
                        action: Action.Delete
                    });

                }
                purchase.buyoff = { jumpId: jId, characterId: jumperId };
                chain.pushUpdate({
                    dataField: ["purchases", purchaseId, "buyoff"],
                    action: Action.Update
                });
            }

            if (override != DrawbackOverride.BoughtOffPermanent && chain.jumps[jId].drawbackOverrides[jumperId][purchaseId]?.override === DrawbackOverride.BoughtOffPermanent) {
                purchase.buyoff = undefined;
                chain.pushUpdate({
                    dataField: ["purchases", purchaseId, "buyoff"],
                    action: Action.Delete
                });
            }

            chain.jumps[jId].drawbackOverrides[jumperId][purchaseId] = {
                override: override,
                modifier: costModifier,
                purchaseValue: costModifier == CostModifier.Custom ? JSON.parse(formData.costModifier)[String(CostModifier.Custom)] : undefined
            };
            if (purchaseId in chain.jumps[jId].drawbackOverrides[jumperId])
                chain.pushUpdate({
                    dataField: ["jumps", jId, "drawbackOverrides", jumperId, purchaseId],
                    action: Action.Update
                });
            else
                chain.pushUpdate({
                    dataField: ["jumps", jId, "drawbackOverrides", jumperId, purchaseId],
                    action: Action.New
                });

            rerender();

        }

        return <EditableContainer<Purchase, { jId: number, startOpen: boolean, jumperId: number },
            { jId: number, setOpen: (a: boolean) => void, jumperId: number }>
            get={get}
            set={set}
            active={active}
            display={RetainedDrawbackView}
            edit={RetainedDrawbackEdit}
            extraDisplayProps={{
                jId: jId,
                jumperId: jumperId,
                startOpen: open
            }}
            extraEditProps={{
                jId: jId,
                jumperId: jumperId,
                setOpen: setOpen
            }} />
    }



export { RetainedDrawbackCard };
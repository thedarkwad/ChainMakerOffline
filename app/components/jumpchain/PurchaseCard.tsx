import { FunctionComponent, ReactNode, useContext, useEffect, useRef, useState } from "react";
import Purchase, { CostModifier, PurchaseType } from "~/jumpchain/Purchase";
import EditableContainer, { EditableComponentProps } from "../EditableContainer";
import Collapsable from "../Collapsable";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "../FloatingButton";
import Multiselect, { SelectOption } from "../Multiselect";
import TextareaAutosize from 'react-textarea-autosize';
import { GID, Id, IdMap, IdMap2, LID } from "~/jumpchain/Types";
import Chain from "~/jumpchain/Chain";
import Jump, { DrawbackOverride } from "~/jumpchain/Jump";
import { Link, useParams, useSearchParams } from "@remix-run/react";
import { Action } from "~/jumpchain/DataManager";
import React from "react";
import CheckBox from "../Checkbox";
import LayoutManager, { MarkupMode } from "~/jumpchain/LayoutManager";
import { purchaseClipboardContext } from "~/routes/chain.$chain";
import { toast } from "react-toastify";

enum Durations {
    Infinite,
    SingleJump,
    Variable
};


function displayStipends(stipends: IdMap2<LID.Currency, LID.PurchaseSubtype, number>, jump: Jump) {

    let stipendStrings: IdMap<LID.Currency, string> = Object.fromEntries(jump.listCurrencies().map(st => [st, ""]));
    for (let cId of Object.keys(stipends))
        for (let tId of Object.keys(stipends[Number(cId)])) {
            let stipend = stipends[Number(cId)][Number(tId)];
            if (stipend <= 0) continue;
            if (stipendStrings[Number(cId)].length)
                stipendStrings[Number(cId)] += ", ";
            stipendStrings[Number(cId)] += `${stipend} ${jump.currency(Number(cId)).abbrev} for ${jump.purchaseSubtype(Number(tId)).name}s`;
        }
    return <>
        {Object.entries(stipendStrings).map(([cId, string]) => (string.length == 0 ? [] :
            <span key={`${cId}_stipend_display`} className="big-margin-left">
                <span className="bold">
                    {jump.currency(Number(cId)).abbrev} Stipends:
                </span>
                &nbsp;
                {string}
            </span>
        ))}
    </>;

}

const PurchaseCardView: FunctionComponent<EditableComponentProps<Purchase>
    & {
        startOpen: boolean, rerender: () => void, essential?: boolean, retained?: Id<GID.Jump>, jumperId?: Id<GID.Character>,
        copyKey?: string
    }> = (p) => {

        const componentRef = useRef<HTMLDivElement>(null);

        let params = useParams();
        let chainId = params.chain!;

        const [scrolled, setScrolled] = useState(false);
        let dummy = false;

        const [searchParams,] = useSearchParams();
        const clipboard = useContext(purchaseClipboardContext);

        if (searchParams.get("pId") == String(p.data.id)) {
            dummy = true;
            useEffect(() => {
                if (componentRef.current && !scrolled && !p.startOpen) {
                    componentRef.current.scrollIntoView({ behavior: "smooth" });
                    setScrolled(true);
                }
            });

        }

        let chain = p.data.chain;

        let categoryText = "";
        let categoryStrings: string[];

        let originalModifier = p.data.costModifier;
        let override: { override: DrawbackOverride; modifier: CostModifier; purchaseValue?: number } | undefined;
        if (p.retained !== undefined && chain.jumps[p.retained].drawbackOverrides[p.jumperId!][p.data.id] !== undefined)
            override = chain.jumps[p.retained!].drawbackOverrides[p.jumperId!][p.data.id];

        switch (p.data.type) {
            case PurchaseType.Companion:
                categoryText = "Import";
                break;
            case PurchaseType.SupplementImport:
                categoryText = "Stipend";
                break;
            case PurchaseType.Drawback:
                categoryText = "Drawback";
                break;
            case PurchaseType.ChainDrawback:
                categoryText = "Chain Drawback";
                break;
            case PurchaseType.Scenario:
                categoryText = "Scenario";
                break;
            case PurchaseType.Supplement:
                let suff = (chain.supplements[p.data.supplement!].itemLike ? "Item" : "Perk");
                categoryStrings = p.data.category.map(
                    (id) => chain.supplements[p.data.supplement!].purchaseCategories[id]
                );
                if (categoryStrings.length == 0) { categoryText = "Uncategorized " + suff; break; }
                if (categoryStrings.length > 2) { categoryText = "Multi-Category " + suff; break; }
                categoryText = categoryStrings.join(" & ") + " " + suff;
                break;
            case PurchaseType.Item:
            case PurchaseType.Perk:
                let suffix = chain.requestJump(p.data.jumpId).purchaseSubtype(p.data.subtype!).name;
                categoryStrings = p.data.category.map(
                    (id) => chain.purchaseCategories[p.data.type][id]
                );
                if (categoryStrings.length == 0) { categoryText = "Uncategorized " + suffix; break; }
                if (categoryStrings.length > 2) { categoryText = "Multi-Category " + suffix; break; }
                categoryText = categoryStrings.join(" & ") + " " + suffix;
                break;
            case PurchaseType.Subsystem:
            default:
                categoryText = "Purchase";
        }

        let sideSection;

        switch (p.data.type) {
            case PurchaseType.Companion:
                sideSection = (
                    Array.from(p.data.importData!.characters).map((id) => chain.characters[id].name).join(", ")
                );
                break;
            case PurchaseType.SupplementImport:
                sideSection = (
                    Array.from(p.data.supplementImportData!.characters).map((id) => chain.characters[id].name).join(", ")
                );
                break;
            case PurchaseType.ChainDrawback:
                sideSection = (<>
                    <span className="bold margin-right">Item Stipend:</span>
                    {p.data.itemStipend || 0}
                    {chain.chainSettings.chainDrawbacksForCompanions ? [] :
                        <><br />
                            <span className="bold margin-right">Companion Stipend:</span>
                            {p.data.companionStipend || 0}
                        </>
                    }
                </>);
                break;
            case PurchaseType.Drawback:
                sideSection = (<>
                    <span className="bold margin-right">Item Stipend:</span>
                    {p.data.itemStipend || 0}
                </>);
                break;
            case PurchaseType.Scenario:
                sideSection = (p.data.reward) ? (<>
                    <span className="bold margin-right">Additional Reward:</span>
                    {p.data.reward}
                </>) : <></>;
                break;
            case PurchaseType.Supplement:
            case PurchaseType.Item:
            case PurchaseType.Perk:
                let dest = "";
                switch (p.data.type) {
                    case PurchaseType.Supplement:
                        dest = chain.supplements[p.data.supplement!].itemLike ? "items" : "summary/purchases";
                        break;
                    case PurchaseType.Item:
                        dest = "items";
                        break;
                    case PurchaseType.Perk:
                        dest = "summary/purchases";
                        break;
                }
                if (p.data.tags.length > 0)
                    sideSection = (<>
                        <span className="bold margin-right">
                            Tags:
                        </span>
                        {p.data.tags.map((tag) => <Link className="underline-h"
                            to={`/chain/${chainId}/${p.data.characterId}/${dest}?tag=${tag}${p.data.supplement ? `&supp=${p.data.supplement}` : ""}`} key={tag}>{tag}</Link>).map(
                                (item, index) => <React.Fragment key={item.key}>
                                    {index > 0 && ', '}
                                    {item}
                                </React.Fragment>
                            )}
                    </>)
                else
                    sideSection = <></>
                break;
            case PurchaseType.Subsystem:
            default: sideSection = <></>;

        }

        let leftBottomSection: ReactNode = <></>;

        let itemLike = p.data.type == PurchaseType.Item || (p.data.type == PurchaseType.Supplement && chain.supplements[p.data.supplement!].itemLike);

        if (p.data.purchaseGroup !== undefined
            && [PurchaseType.Item, PurchaseType.Perk, PurchaseType.Supplement].includes(p.data.type)) 
            leftBottomSection = <div className="faint-text margin-bottom">
                <span className="bold">
                    Purchase Group:
                </span> <Link className="underline-h"
                    to={`/chain/${chainId}/${p.data.characterId}/${!itemLike ? "summary" : "items"}/groups?group=${p.data.purchaseGroup}&pId=${p.data.id}`} >
                    {chain.purchaseGroups[p.data.characterId][p.data.purchaseGroup].name || "Unnamed Group"}
                </Link>
            </div>;


        let bottomSection;
        switch (p.data.type) {
            case PurchaseType.Drawback:
                if (p.data.duration == 1) { bottomSection = <></>; break; }
            case PurchaseType.Item:
            case PurchaseType.Perk:
            case PurchaseType.Supplement:
            case PurchaseType.ChainDrawback:
                if (p.data.duration === undefined || p.data.duration < 1) break;
                let expirationDate = p.data.duration - +(p.retained === undefined ? 0 : chain.getJumpNumber(p.retained) - chain.getJumpNumber(p.data.jumpId));
                bottomSection = (
                    <span className="italic faint-text">
                        Expires {expirationDate == 1 ? "at end of jump" : `in ${expirationDate} jumps`}
                    </span>
                );
                break;
            case PurchaseType.Companion:
                bottomSection = <span className="vspaced">
                    <span className="bold">Allowances:</span> {
                        Object.keys(p.data.importData!.allowances).filter((cId) => p.data.importData?.allowances[Number(cId)]).length ?
                            Object.entries(p.data.importData!.allowances
                            ).map(([cId, a]) => `${a} ${chain.requestJump(p.data.jumpId).currency(Number(cId)).abbrev}`
                            ).map((string, index) => {
                                if (index > 0)
                                    return ", " + string;
                                return string;
                            }) : "None"
                    }
                    {displayStipends(p.data.importData!.stipend, chain.requestJump(p.data.jumpId))}
                </span>;
                break;
            case PurchaseType.SupplementImport:
                bottomSection = <span className="vspaced">
                    {
                        p.data.supplementImportData!.allowance == 0 ? [] :
                            <><span className="bold">Allowance:</span>&nbsp;
                                {p.data.supplementImportData!.allowance} {chain.supplements[p.data.supplement!].currency}</>
                    }
                    {
                        p.data.supplementImportData!.percentage == 0 ? [] :
                            <>
                                <span className="bold">Allowance:</span>&nbsp;
                                {p.data.supplementImportData!.percentage}% of {chain.characters[p.data.characterId].name}'s {chain.supplements[p.data.supplement!].currency}
                            </>
                    }
                </span>;
                break;
            default:
                bottomSection = [];

        }


        let head = (
            <div className="row compact-cell" ref={componentRef}>
                <FloatingButtonRow
                    buttons={[
                        ...(!p.essential ? [{
                            onClick: (e: React.MouseEvent<HTMLElement>) => {
                                if (window.confirm("Are you sure you want to delete? This cannot be undone.")) {
                                    chain.deregisterPurchase(p.data.id); p.rerender();
                                } else {
                                    e.stopPropagation();
                                }
                            }, icon: "trash"
                        }] : []),
                        ...(p.copyKey ? [{
                            onClick: (e: React.MouseEvent<HTMLElement>) => {
                                if (clipboard.current && clipboard.current.some(item => (item.purchase as Purchase)._id == p.data.id)) {
                                    toast.error(`\"${p.data.name}\" already in clipboard.`, {
                                        position: "top-right",
                                        autoClose: 1500,
                                        hideProgressBar: true,
                                    });
                                    e.stopPropagation();
                                    return;
                                }
                                let message = `\"${p.data.name}\" copied to clipboard.`;
                                if (!e.ctrlKey || !clipboard.current) {
                                    if (clipboard.current && clipboard.current.length > 0) {
                                        message = `Clipboard overwritten with \"${p.data.name}\". \n\n To add to clipboard instead, hold down Ctrl when copying.`
                                    }
                                    clipboard.current =
                                        [{ key: p.copyKey!, originalJump: p.data.jumpId, purchase: p.data.exportForClipboard() }];
                                }
                                else
                                    clipboard.current.push({ key: p.copyKey!, originalJump: p.data.jumpId, purchase: p.data.exportForClipboard() });
                                if (clipboard.current.length > 1) {
                                    message = `\"${p.data.name}\" copied to clipboard. You have ${clipboard.current.length} items in your clipboard.`;
                                }

                                toast.info(message, {
                                    position: "top-right",
                                    autoClose: 1500,
                                    hideProgressBar: true,
                                });
                                p.rerender();
                                e.stopPropagation();
                            }, icon: "copy"
                        }] : []),

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
                        {p.data.type == PurchaseType.Drawback || p.data.type == PurchaseType.Scenario ? "Value: " : "Cost: "}
                        {p.data.cost} {[PurchaseType.Supplement, PurchaseType.SupplementImport].includes(p.data.type) ?
                            chain.supplements[p.data.supplement!].currency :
                            (chain.requestJump(p.data.jumpId)?.currency(p.data.currency)?.abbrev || "CP")}
                        {p.data.costModifier == CostModifier.Full ? [] : (
                            <span className="faint-text margin-left">
                                {(p.data.type == PurchaseType.Drawback || p.data.type == PurchaseType.Scenario || p.data.type == PurchaseType.ChainDrawback) ?
                                    ` (taken for ${p.data.costModifier == CostModifier.Free ? "no" :
                                        p.data.costModifier == CostModifier.Custom ? "modified" : "half"} points)` :
                                    ` (value of ${p.data.value})`}
                            </span>
                        )}

                    </span>
                    <span className="big-margin-left big-margin-right"> | </span>
                    {categoryText}
                </span>
                <span className={`hidden-when-active overflow-container ${p.copyKey ? "extra-" : ""}extra-big-margin-right`}>
                    <span className="faint-text">
                        [<span className="italic">
                            {p.data.cost} {(p.data.type == PurchaseType.Supplement) ? chain.supplements[p.data.supplement!].currency :
                                (chain.requestJump(p.data.jumpId)?.currency(p.data.currency)?.abbrev || "CP")}
                        </span>]
                    </span>
                    &nbsp;
                    {p.data.description}
                </span>

            </div>
        );
        let body = (
            <div className="row compact-cell">
                <span className={`faint-text small-text margin-bottom-mobile`}>
                    {leftBottomSection}
                    {sideSection}
                </span>
                <span className="user-whitespace">
                    {p.data.description}
                </span>
                <span></span>
                {bottomSection}

            </div>
        );

        p.data.costModifier = originalModifier;

        return (
            <Collapsable
                head={head}
                body={body}
                class="spanning subtle-rounded two-column-fixed compact-cell hover-container"
                openClass="faint-highlight medium-outline vspaced-half-compact active"
                closedClass="faint-highlight-h vspaced-compact mild-outline-h inactive overflow-ellipsis"
                default={p.startOpen || dummy}
                clickable
            />
        )

    }

const PurchaseCardEdit: FunctionComponent<EditableComponentProps<Purchase> &
{ submit: () => void, rerender: () => void, essential?: boolean, setOpen: () => void }> = (p) => {

    let chain = p.data.chain;
    let jump = chain.requestJump(p.data.jumpId);

    p.setOpen();

    let categorySelect: ReactNode;
    let jumpCategoryEntries: [string, string][];
    let suffix: ReactNode;

    switch (p.data.type) {
        case PurchaseType.Companion:
            jumpCategoryEntries = [];
            suffix = "Import";
            break;
        case PurchaseType.SupplementImport:
            jumpCategoryEntries = [];
            suffix = "Stipend";
            break;
        case PurchaseType.Drawback:
            jumpCategoryEntries = [];
            suffix = "Drawback";
            break;
        case PurchaseType.ChainDrawback:
            jumpCategoryEntries = [];
            suffix = "Chain Drawback";
            break;
        case PurchaseType.Scenario:
            jumpCategoryEntries = [];
            suffix = "Scenario";
            break;
        case PurchaseType.Supplement:
            suffix = (chain.supplements[p.data.supplement!].itemLike ? "Item" : "Perk");
            jumpCategoryEntries = Object.entries(chain.supplements[p.data.supplement!].purchaseCategories);
            break;
        case PurchaseType.Item:
        case PurchaseType.Perk:
            let subtypes = jump.listPurchaseSubtypes().filter((id) => jump.purchaseSubtype(id).type == p.data.type && !jump.purchaseSubtype(id).subsystem);
            if (subtypes.length <= 1)
                suffix = jump.purchaseSubtype(p.data.subtype!).name;
            else {
                suffix = <Multiselect
                    name={"subtype"}
                    options={Object.fromEntries(subtypes.map((id) => [id,
                        { name: jump.purchaseSubtype(id).name }
                    ]))}
                    value={Object.fromEntries(subtypes.map((id) => [id,
                        id == p.data.subtype
                    ]))}
                    single
                />
            }
            jumpCategoryEntries = Object.entries(chain.purchaseCategories[p.data.type]);
            break;
        case PurchaseType.Subsystem:
            jumpCategoryEntries = [];
            suffix = "Purchase";
            break;
        default:
            jumpCategoryEntries = [];
            suffix = "Purchase";
    }

    switch (jumpCategoryEntries.length) {
        case 0:
            categorySelect = <span style={{ marginRight: "4rem" }}>{suffix}</span>;
            break;
        default:
            let multiselectDOM = <Multiselect
                name={"category"}
                options={Object.fromEntries(jumpCategoryEntries.map(
                    ([id, name]) => [id, { name: name }]
                ))}
                value={Object.fromEntries(jumpCategoryEntries.map(
                    ([id, name]) => [id, p.data.category.includes(Number(id))]
                ))}
                placeholder="Uncategorized"
                overflow="Multi-Category"
                separator=" &"
                inline
            />
            categorySelect = <span style={{ display: "inline-flex", marginRight: "4rem", alignItems: "center" }}>
                {multiselectDOM} &nbsp; {suffix}
            </span>;
            break;

    }

    let rightBottomSection: ReactNode = <></>;

    let availableGroups = Object.keys(chain.purchaseGroups[p.data.characterId]).map(Number).filter(
        (pgId) => !p.data.supplement ? chain.purchaseGroups[p.data.characterId][pgId].type == p.data.type
            : ((chain.purchaseGroups[p.data.characterId][pgId].type == PurchaseType.Item) == chain.supplements[p.data.supplement!].itemLike)
    );
    if (availableGroups.length > 0
        && [PurchaseType.Item, PurchaseType.Perk, PurchaseType.Supplement].includes(p.data.type))
        rightBottomSection = <Multiselect
            className="margin-bottom"
            width="min(100%, 15rem)"
            name={"group"}
            options={{
                ...Object.fromEntries(availableGroups.map((id) =>
                    [id, { name: chain.purchaseGroups[p.data.characterId][id].name }]
                )), "-1": { name: "None" }
            }}
            value={{
                ...Object.fromEntries(availableGroups.map((id) =>
                    [id, id == p.data.purchaseGroup]
                )), "-1": p.data.purchaseGroup === undefined
            }}
            single
            title="Group"
        />

    let sideSection;

    switch (p.data.type) {
        case PurchaseType.Companion:
        case PurchaseType.SupplementImport:
            let possibleCompanions = chain.characterList.filter((id) => !chain.requestCharacter(id).primary);
            let currentCompanions = (p.data.importData || p.data.supplementImportData!).characters;
            sideSection = <Multiselect
                name={"characters"}
                width="min(100%, 15rem)"
                options={Object.fromEntries(possibleCompanions.map((id) =>
                    [id, { name: chain.requestCharacter(id).name }]
                ))}
                value={Object.fromEntries(possibleCompanions.map((id) =>
                    [id, currentCompanions.has(id)]
                ))}
                title="Companions"
            />
            break;

        case PurchaseType.ChainDrawback:
            sideSection = (<>
                <div>
                    <span className="bold margin-right">Item Stipend:</span>
                    <input type="number" name="itemStipend" className="compact-cell" defaultValue={p.data.itemStipend || 0} step={50} />
                </div>
                <div className="vspaced">
                    <span className="bold margin-right">Companion Stipend:</span>
                    <input type="number" name="companionStipend" className="compact-cell" defaultValue={p.data.companionStipend || 0} step={50} />
                </div>
            </>);
            break;
        case PurchaseType.Drawback:
            sideSection = (<>
                <span className="bold margin-right">Item Stipend:</span>
                <input type="number" name="itemStipend" className="compact-cell" defaultValue={p.data.itemStipend || 0} step={50} />
            </>);
            break;
        case PurchaseType.Scenario:
            sideSection = <TextareaAutosize name="reward" className="spanning compact-cell" placeholder="Additional Reward" defaultValue={p.data.reward} />;
            break;
        case PurchaseType.Supplement:
        case PurchaseType.Item:
        case PurchaseType.Perk:
            sideSection =
                <TextareaAutosize className="spanning compact-cell" name="tags" placeholder="Tags" defaultValue={p.data.tags.join(", ")} />;
            break;
        case PurchaseType.Subsystem:
        case PurchaseType.ChainDrawback:
        default: sideSection = <></>;

    }

    let bottomSection;

    switch (p.data.type) {

        case PurchaseType.Perk:
        case PurchaseType.Item:
            bottomSection =
                <Multiselect name={"temporary"}
                    options={{
                        0: { name: "Permanent" },
                        1: { name: "Temporary" }
                    }}
                    value={{
                        0: p.data.duration != 1,
                        1: p.data.duration == 1
                    }}
                    single
                    inline
                    title="Duration"
                />;
            break;
        case PurchaseType.Drawback:
        case PurchaseType.ChainDrawback:
        case PurchaseType.Supplement:
            bottomSection = <Multiselect
                name={"duration"}
                options={{ [Durations.Infinite]: { name: "Never Expires" }, [Durations.SingleJump]: { name: "Expires At End of Jump" }, [Durations.Variable]: { name: "Expires in", numeric: true, increment: 1, suffix: "Jumps" } }}
                value={{
                    [Durations.Infinite]: !p.data.duration || p.data.duration < 1,
                    [Durations.SingleJump]: p.data.duration == 1,
                    [Durations.Variable]: (!p.data.duration || p.data.duration <= 1) ? 0 : p.data.duration
                }
                }
                default={p.data.type != PurchaseType.Drawback ? Durations.Infinite : Durations.SingleJump}
                single
                inline
                title="Duration"
            />
            break;
        case PurchaseType.SupplementImport:
            bottomSection = <Multiselect
                name={"supplementAllowance"}
                options={{
                    0: { name: "Flat Stipend", numeric: true, increment: 50 },
                    1: { name: "Point Percentage", numeric: true, increment: 10, suffix: "%" }
                }}
                value={{
                    0: p.data.supplementImportData!.allowance,
                    1: p.data.supplementImportData!.percentage
                }
                }
                default={0}
                single
                inline
                title="Allowance"
            />

            break;
        case PurchaseType.Companion:
            bottomSection = <div style={{ display: "flex" }}>
                <Multiselect
                    name={"allowances"}
                    options={Object.fromEntries(jump.listCurrencies().map((cId) => [cId, { name: jump.currency(cId).abbrev, numeric: true, suffix: jump.currency(cId).abbrev }]))}
                    value={Object.fromEntries(jump.listCurrencies().map((cId) => [cId, p.data.importData!.allowances?.[cId] || 0]))}
                    title="Allowances"
                    placeholder="None"
                    inline
                    className="size-limited-select margin-right"
                    hideName
                />
                {jump.listCurrencies().map((cId) => <Multiselect
                    key={`stipend${cId}`}
                    name={`stipend${cId}`}
                    options={Object.fromEntries(jump.listPurchaseSubtypes().map((stId) => [stId,
                        { name: jump.purchaseSubtype(stId).name, numeric: true, suffix: jump.currency(cId).abbrev }
                    ]))}
                    value={Object.fromEntries(jump.listPurchaseSubtypes().map((stId) => [stId,
                        p.data.importData?.stipend?.[cId]?.[stId] || 0
                    ]))}
                    title={`${jump.currency(cId).abbrev} Stipends`}
                    inline
                    className="size-limited-select margin-right"
                />)}
            </div>;
            break;
        default:
            bottomSection = [];
    }


    let currencyDropdown: ReactNode;
    let currencies = jump ? jump.listCurrencies() : [];
    if (p.data.type == PurchaseType.Supplement || p.data.type == PurchaseType.SupplementImport) {
        currencyDropdown = chain.supplements[p.data.supplement!].currency;
    } else if (currencies.length == 0) {
        currencyDropdown = "CP";
    } else if (currencies.length == 1) {
        currencyDropdown = jump.currency(p.data.currency).abbrev;
    } else {
        let options: Record<number, SelectOption> = {};
        for (let c of currencies) {
            options[Number(c)] = { name: jump.currency(Number(c)).abbrev };
        }
        currencyDropdown = <Multiselect
            single
            name={"currency"}
            options={options}
            value={Object.fromEntries(currencies.map((c) => [c, c == p.data.currency]))}
        />
    }

    let costModifierDropdown = <Multiselect
        name={"costModifier"}
        options={{
            [CostModifier.Full]: { name: "Full" },
            [CostModifier.Reduced]: { name: "Reduced" },
            [CostModifier.Free]: { name: "Free" },
            [CostModifier.Custom]: { name: "Custom", numeric: true }
        }}
        single
        default={CostModifier.Free}
        value={{
            [CostModifier.Full]: p.data.costModifier == CostModifier.Full,
            [CostModifier.Reduced]: p.data.costModifier == CostModifier.Reduced,
            [CostModifier.Free]: p.data.costModifier == CostModifier.Free,
            [CostModifier.Custom]: p.data.costModifier == CostModifier.Custom && p.data.purchaseValue!
        }}
    />

    let head = (
        <div className="row compact-cell">
            <FloatingButtonRow
                buttons={[
                    { onClick: () => { p.setActive!(false); }, icon: "arrow-back" },
                    ...(!p.essential ? [({
                        onClick: (e: React.MouseEvent<HTMLElement>) => {
                            if (window.confirm("Are you sure you want to delete? This cannot be undone.")) {
                                chain.deregisterPurchase(p.data.id); p.rerender();
                            } else {
                                e.stopPropagation();
                            }
                        }, icon: "trash"
                    })] : []),
                    { onClick: p.submit, icon: "floppy-disk" },
                ]}
                color={IconColor.Light}
                size={IconSize.Small}
                position={Direction.TopRight} />
            <span className="bold vcentered">
                <input name="name" defaultValue={p.data.name} className="spanning compact-cell" autoFocus autoComplete="off" />
            </span>
            <span className="vcentered margin-top-mobile">
                <input type="number" name="value" className="compact-cell" defaultValue={p.data.value} step={50} style={{ width: "3.5rem" }} /> &nbsp;
                {currencyDropdown}
                &nbsp;
                &nbsp;
                <span className="italic">
                    @
                </span>
                &nbsp;
                &nbsp;
                {costModifierDropdown}
                <span className="big-margin-left big-margin-right"> | </span>
                {categorySelect}
            </span>
        </div>
    );
    let body = (
        <div className="row compact-cell">
            <span className={`small-text margin-bottom-mobile`}>
                {rightBottomSection}
                {sideSection}
            </span>
            <span>
                <TextareaAutosize className="spanning compact-cell" name="description" defaultValue={p.data.description} />
            </span>
            <span></span>
            <span>
                {bottomSection}
            </span>

        </div>
    );

    return (
        <div className="spanning ui-highlight medium-outline subtle-rounded vspaced two-column-fixed roomy-cell">
            {head}
            {body}
        </div>
    )

}

const PurchaseCard: FunctionComponent<{
    chain: Chain, purchaseId: Id<GID.Purchase>, updateBudgets: () => void,
    active?: boolean, startOpen?: boolean, essential?: boolean,
    retained?: Id<GID.Jump>, jumperId?: Id<GID.Jump>,
    copyKey?: string
}>
    = ({ chain, purchaseId, active, startOpen, updateBudgets, essential, retained, jumperId, copyKey }) => {

        const open = useRef(!!startOpen);

        const get = () => {
            return chain.requestPurchase(purchaseId);
        }
        const set = (formData: { [x: string]: any }) => {

            chain.pushUpdate({
                dataField: ["purchases", purchaseId],
                action: Action.Update
            });

            const purchase = chain.requestPurchase(purchaseId);
            purchase.name = formData.name;
            purchase.value = Number(formData.value);
            purchase.description = formData.description;
            if (formData.currency) {
                let currencyRecord = JSON.parse(formData.currency) as Record<Id<LID.Currency>, boolean>;
                purchase.currency = Number(Object.keys(currencyRecord).find((k) => currencyRecord[Number(k)]));
            }
            if (formData.costModifier) {
                let costModifierRecord = JSON.parse(formData.costModifier) as Record<number, boolean | number>;
                purchase.costModifier = Number(Object.keys(costModifierRecord).find((k) => !!costModifierRecord[Number(k)]));
                purchase.purchaseValue = Number(costModifierRecord[CostModifier.Custom]);
            }
            if ("tags" in formData)
                purchase.tags = (formData.tags as string).split(",").map((s) => s.trim()).filter((s) => s.length);
            if ("reward" in formData)
                purchase.reward = formData.reward;
            if ("temporary" in formData)
                purchase.duration = JSON.parse(formData.temporary)[1] ? 1 : undefined;
            if (formData.category) {
                let categoryRecord = JSON.parse(formData.category) as Record<Id<GID.PurchaseCategory>, boolean>;
                purchase.category = Object.keys(categoryRecord).filter((k) => categoryRecord[Number(k)]).map(k => Number(k));
            }
            if ("itemStipend" in formData)
                purchase.itemStipend = Number(formData.itemStipend);
            if ("companionStipend" in formData)
                purchase.companionStipend = Number(formData.companionStipend);
            if (formData.subtype) {
                let subtypeRecord = JSON.parse(formData.subtype) as Record<Id<LID.PurchaseSubtype>, boolean>;
                purchase.subtype = Number(Object.keys(subtypeRecord).find((k) => subtypeRecord[Number(k)]));
            }
            if (formData.group) {
                let subtypeRecord = JSON.parse(formData.group) as Record<Id<GID.PurchaseGroup>, boolean>;
                let tentative = Number(Object.keys(subtypeRecord).find((k) => subtypeRecord[Number(k)]));
                purchase.purchaseGroup = tentative >= 0 ? tentative : undefined;
            }
            if (formData.duration) {
                let durationRecord = JSON.parse(formData.duration);
                if (durationRecord[Durations.Infinite])
                    purchase.duration = -1;
                if (durationRecord[Durations.SingleJump])
                    purchase.duration = 1;
                if (durationRecord[Durations.Variable])
                    purchase.duration = durationRecord[Durations.Variable];
                if (purchase.duration == 1 && purchase.type == PurchaseType.Drawback) {
                    chain.requestJump(purchase.jumpId).retainedDrawbacks[purchase.characterId].delete(purchase.id);
                    chain.pushUpdate({
                        dataField: ["jumps", purchase.jumpId, "retainedDrawbacks", purchase.characterId, purchase.id],
                        action: Action.Delete
                    });
                }
                if (purchase.duration != 1 && purchase.type == PurchaseType.Drawback) {
                    chain.requestJump(purchase.jumpId).retainedDrawbacks[purchase.characterId].add(purchase.id);
                    chain.pushUpdate({
                        dataField: ["jumps", purchase.jumpId, "retainedDrawbacks", purchase.characterId],
                        action: Action.Update
                    });
                }
            }

            if ("characters" in formData) {
                let characterRecord = JSON.parse(formData.characters) as Record<number, boolean>;
                if (purchase.type == PurchaseType.Companion) {
                    purchase.importData!.characters = new Set(Object.keys(characterRecord).map(Number).filter((id) => characterRecord[id]));
                    purchase.importData!.allowances = JSON.parse(formData.allowances) as Record<number, number>;
                    for (let cId of chain.requestJump(purchase.jumpId).listCurrencies()) {
                        purchase.importData!.stipend[cId] = JSON.parse(formData[`stipend${cId}`]) as Record<number, number>;
                    }
                    chain.pushUpdate({
                        dataField: ["purchases", purchaseId, "_importData"],
                        action: Action.Update
                    });
                    chain.requestJump(purchase.jumpId).recheckCharacterImports();
                } else {
                    purchase.supplementImportData!.characters = new Set(Object.keys(characterRecord).map(Number).filter((id) => characterRecord[id]));
                    let dataRecord = JSON.parse(formData.supplementAllowance) as Record<number, number>;
                    purchase.supplementImportData!.allowance = dataRecord[0] || 0;
                    purchase.supplementImportData!.percentage = dataRecord[1] || 0;
                    chain.pushUpdate({
                        dataField: ["purchases", purchaseId, "_supplementImportData"],
                        action: Action.Update
                    });
                }
            }
        }

        return <EditableContainer<Purchase,
            { startOpen: boolean, rerender: () => void, essential?: boolean, retained?: Id<GID.Jump>, jumperId?: Id<GID.Character>, copyKey?: string },
            { rerender: () => void, essential?: boolean, setOpen: () => void }>
            get={get}
            set={(data) => { set(data); updateBudgets(); }}
            active={active}
            display={PurchaseCardView}
            edit={PurchaseCardEdit}
            extraDisplayProps={{
                startOpen: open.current,
                rerender: updateBudgets,
                essential: essential,
                retained: retained,
                jumperId: jumperId,
                copyKey: copyKey
            }} extraEditProps={{
                rerender: updateBudgets,
                essential: essential,
                setOpen: () => { open.current = true; }
            }} />
    }



export { PurchaseCard };
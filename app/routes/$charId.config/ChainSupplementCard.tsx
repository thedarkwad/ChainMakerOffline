import { FunctionComponent, ReactNode, useEffect, useRef, useState } from "react";
import Purchase, { CostModifier, PurchaseType } from "~/jumpchain/Purchase";
import TextareaAutosize from 'react-textarea-autosize';
import { getFreeId, GID, Id, LID } from "~/jumpchain/Types";
import Chain from "~/jumpchain/Chain";
import { DrawbackOverride } from "~/jumpchain/Jump";
import { Link, useParams, useSearchParams } from "@remix-run/react";
import { Action } from "~/jumpchain/DataManager";
import React from "react";
import ChainSupplement, { CompanionAccess } from "~/jumpchain/ChainSupplement";
import EditableContainer, { EditableComponentProps } from "~/components/EditableContainer";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import Collapsable from "~/components/Collapsable";
import AccordianContainer, { FieldType } from "~/components/AccordianContainer";
import Multiselect from "~/components/Multiselect";

enum Durations {
    Infinite,
    SingleJump,
    Variable
};

const ChainSupplementView: FunctionComponent<EditableComponentProps<ChainSupplement> & { rerender: () => void }
> = (p) => {

    let chain = p.data.chain;

    let params = useParams();
    let chainId = params.chain!;

    let overinvestedJumps = Object.fromEntries(chain.characterList.map((cId) => [cId,
        chain.jumpList.filter((jId) => chain.jumps[jId].characters.has(cId)
            && chain.getSupplementInvestment(cId, jId, p.data.id) > p.data.maxInvestment)
    ]));


    let head = (<div className=
        {`medium-highlight bold center-text-align compact-cell spanning`}>
        {p.data.name}
    </div>);

    let body = <div className="spanning space-evenly extra-roomy-cell">
        <FloatingButtonRow
            buttons={[
                {
                    onClick: (e: React.MouseEvent<HTMLElement>) => {
                        if (window.confirm("Are you sure you want to delete this supplement? This will delete all purchases and point investments and cannot be undone.")) {
                            chain.deregisterChainSupplement(p.data.id);
                            p.rerender();
                        } else {
                            e.stopPropagation();
                        }
                    }, icon: "trash"
                },
                { onClick: () => p.setActive!(true), icon: "pencil" }
            ]}
            color={IconColor.Light}
            size={IconSize.Small}
            position={Direction.TopRight}
            hover
        />
        <span className="faint-text spanning center-text-align">{p.data.itemLike ? "Item Supplement" : "Perk Supplement"}</span>
        <div className="hcenter-down roomy-cell">
            <div className="right-weighted-column">
                <span className="bold right-align-self">Name:</span> <span>{p.data.name}</span>
                <span className="bold right-align-self">URL:</span> <div style={{ textOverflow: "ellipsis", overflow: "hidden", maxWidth: "7rem" }}>
                    {p.data.url && (p.data.url.startsWith("https://") || p.data.url.startsWith("http://")) ? <a href={p.data.url} className="text-highlight underline-h" target="_blank">{p.data.url}</a> : "None"}
                </div>
                <span className="bold right-align-self">Companion Access:</span>
                <span>{p.data.companionAccess == CompanionAccess.Available ? "Fully-Available to Companions" :
                    p.data.companionAccess == CompanionAccess.Communal ? "Points/Purchases Pooled Between All Characters" :
                        p.data.companionAccess == CompanionAccess.Partial ? "Companions Must Be Granted Points By Primary Jumper" :
                            "Restricted to Primary Jumpers"}</span>
                <span className="bold right-align-self">Currency Abbrev:</span> <span>{p.data.currency}</span>
                <span className="faint-text right-align-self">Initial Stipend:</span> <span>{p.data.initialStipend} {p.data.currency}</span>
                <span className="faint-text right-align-self">Stipend Per Jump:</span> <span>{p.data.perJumpStipend} {p.data.currency}</span>
                <span className="faint-text right-align-self">Investment Ratio:</span> <span> 100 CP : {p.data.investmentRatio} {p.data.currency}</span>
                <span className="faint-text right-align-self">Max Investment:</span> <span>{p.data.maxInvestment} CP</span>
            </div>
        </div>
        <div>
            <AccordianContainer<{ name: string }>
                fieldList={{
                    name: { type: FieldType.String, name: "Name" }
                }}
                getter={() => Object.fromEntries(Object.entries(p.data.purchaseCategories).map(([x, s]) => [x, { name: s }]))}
                setter={(id, { name }) => {
                    p.data.purchaseCategories[id] = name;
                    chain.pushUpdate({
                        dataField: ["supplements", p.data.id, "purchaseCategories"],
                        action: Action.Update
                    });
                }}
                newEntry={() => {
                    let id = getFreeId<GID.PurchaseCategory>(p.data.purchaseCategories);
                    p.data.purchaseCategories[id] = "[new category]";
                    chain.pushUpdate({
                        dataField: ["supplements", p.data.id, "purchaseCategories", id],
                        action: Action.New
                    });
                    return id;
                }}
                deleteEntry={(id) => { chain.removePurchaseCategory(PurchaseType.Supplement, id, p.data.id) }}
                title={"Purchase Categories:"} />
        </div>
        {Object.values(overinvestedJumps).some((array) => array.length) ?
            <div className="small-text error-text spanning center-text-align extra-roomy-cell">
                <div className="">
                    <span className="bold">Overinvested Jumps: </span>
                </div>
                <div>
                    {chain.characterList.map((charId) => overinvestedJumps[charId].length ?
                        <div key={`${charId}_${p.data.id}_overflow`} className="vspaced">
                            <span className="bold">{chain.characters[charId].name}: </span>
                            {
                                overinvestedJumps[charId].map((id, index) =>
                                    <React.Fragment key={id}>
                                        {index > 0 ? ", " : []}
                                        <Link to={`/chain/${chainId}/${chain.characterList[0]}/jump/${id}`} className="underline-h">
                                            {chain.jumps[id].name}
                                        </Link>
                                    </React.Fragment>)
                            } </div> : []
                    )
                    }
                </div>

            </div> : []}

    </div >;

    return (
        <Collapsable
            head={head}
            body={body}
            class="subtle-rounded neutral-highlight center-text vcentered medium-outline vspaced extra-big-margin-left extra-big-margin-right hover-container"
            default={true}
            clickable
            key={p.data.id + "view"}
        />
    );

}

const ChainSupplementEdit: FunctionComponent<EditableComponentProps<ChainSupplement> &
{ submit: () => void, rerender: () => void }> = (p) => {
    let chain = p.data.chain;
    let inputRef = useRef<HTMLInputElement>(null);

    let head = (<div className=
        {`splash-highlight bold center-text-align compact-cell spanning`}>
        {p.data.name}
    </div>);

    let body = <div className="spanning space-evenly extra-roomy-cell">
        <FloatingButtonRow
            buttons={[
                { onClick: () => { p.setActive!(false); }, icon: "arrow-back" },
                {
                    onClick: (e: React.MouseEvent<HTMLElement>) => {
                        if (window.confirm("Are you sure you want to delete this supplement? This will delete all purchases and point investments and cannot be undone.")) {
                            chain.deregisterChainSupplement(p.data.id);
                            p.rerender();
                        } else {
                            e.stopPropagation();
                        }
                    }, icon: "trash"
                },
                { onClick: p.submit, icon: "floppy-disk" },
            ]}
            color={IconColor.Light}
            size={IconSize.Small}
            position={Direction.TopRight}
        />
        <span className="faint-text spanning center-text-align">
            <Multiselect
                name={"itemLike"}
                options={{ 0: { name: "Perk Supplement" }, 1: { name: "Item Supplement" } }}
                value={{ 0: !p.data.itemLike, 1: p.data.itemLike }}
                single
                inline
                className="lengthy"
            />
        </span>
        <div className="hcenter-down roomy-cell">
            <div className="right-weighted-column">
                <span className="bold right-align-self">Name:</span>
                <input defaultValue={p.data.name} className="compact-cell" name="name" autoComplete="off" autoFocus />
                <span className="bold right-align-self">URL:</span>
                <input defaultValue={p.data.url} className="compact-cell" name="url" autoComplete="off" />
                <span className="bold right-align-self">Companion Access:</span>
                <Multiselect
                    name={"companionAccess"}
                    options={{
                        [CompanionAccess.Unavailable]: { name: "Restricted to Primary Jumpers" },
                        [CompanionAccess.Available]: { name: "Fully-Available To Companions" },
                        [CompanionAccess.Communal]: { name: "Purchases Shared" },
                        [CompanionAccess.Partial]: { name: "Can Grant Points To Companions" }
                    }}
                    value={{ [CompanionAccess.Partial]: p.data.companionAccess == CompanionAccess.Partial, [CompanionAccess.Unavailable]: p.data.companionAccess == CompanionAccess.Unavailable, [CompanionAccess.Available]: p.data.companionAccess == CompanionAccess.Available, [CompanionAccess.Communal]: p.data.companionAccess == CompanionAccess.Communal }}
                    single
                    inline
                    className="lengthy"
                />
                <span className="bold right-align-self">Currency Abbrev:</span>
                <input defaultValue={p.data.currency} className="compact-cell" step={50}
                    name="currency" autoComplete="off" />
                <span className="faint-text right-align-self">Initial Stipend:</span>
                <span>
                    <input defaultValue={p.data.initialStipend} className="compact-cell" step={50}
                        name="initialStipend" type="number" autoComplete="off" /> {p.data.currency}
                </span>
                <span className="faint-text right-align-self">Stipend Per Jump:</span>
                <span>
                    <input defaultValue={p.data.perJumpStipend} className="compact-cell" step={50}
                        name="perJumpStipend" type="number" autoComplete="off" /> {p.data.currency}
                </span>
                <span className="faint-text right-align-self">Investment Ratio:</span>
                <div className="searchbar compact-cell" style={{ width: "max-content" }} onClick={() => { if (inputRef) inputRef.current?.focus(); }}> 100 CP :
                    <input ref={inputRef} type="number" className="no-arrows" name="investmentRatio"
                        defaultValue={p.data.investmentRatio} step={50} style={{ textAlign: "right", width: "2rem" }} />&nbsp;
                    {p.data.currency}

                </div>
                <span className="faint-text right-align-self">Max Investment:</span>
                <span>
                    <input defaultValue={p.data.maxInvestment} step={50} className="compact-cell" name="maxInvestment" type="number" autoComplete="off" /> CP
                </span>

            </div>
        </div>
        <div>
            <AccordianContainer<{ name: string }>
                fieldList={{
                    name: { type: FieldType.String, name: "Name" }
                }}
                getter={() => Object.fromEntries(Object.entries(p.data.purchaseCategories).map(([x, s]) => [x, { name: s }]))}
                setter={(id, { name }) => {
                    p.data.purchaseCategories[id] = name;
                    chain.pushUpdate({
                        dataField: ["supplements", p.data.id, "purchaseCategories"],
                        action: Action.Update
                    });
                }}
                newEntry={() => {
                    let id = getFreeId<GID.PurchaseCategory>(p.data.purchaseCategories);
                    p.data.purchaseCategories[id] = "[new category]";
                    chain.pushUpdate({
                        dataField: ["supplements", p.data.id, "purchaseCategories", id],
                        action: Action.New
                    });
                    return id;
                }}
                deleteEntry={(id) => { chain.removePurchaseCategory(PurchaseType.Supplement, id, p.data.id) }}
                title={"Purchase Categories:"} />
        </div>
    </div >;

    return (
        <Collapsable
            head={head}
            body={body}
            class="subtle-rounded neutral-highlight center-text vcentered splash-outline vspaced extra-big-margin-left extra-big-margin-right hover-container"
            default={true}
            clickable
            key={p.data.id + "edit"}
        />
    );

}

const ChainSupplementCard: FunctionComponent<{
    chain: Chain, supplementId: Id<GID.Supplement>, rerender: () => void
}>
    = ({ chain, supplementId, rerender }) => {

        let supp = chain.supplements[supplementId];

        return <EditableContainer<ChainSupplement,
            { rerender: () => void },
            { rerender: () => void }>
            get={() => chain.supplements[supplementId]}
            set={(data) => {
                supp.name = data.name;
                supp.currency = data.currency;
                supp.initialStipend = Number(data.initialStipend);
                supp.investmentRatio = Number(data.investmentRatio);
                supp.perJumpStipend = Number(data.perJumpStipend);
                supp.maxInvestment = Number(data.maxInvestment);

                let url = String(data.url);
                if (url)
                    supp.url = url;
                else
                    supp.url = undefined;

                supp.itemLike = !!+(Object.keys(JSON.parse(data.itemLike)).find(a => JSON.parse(data.itemLike)[a]))!;

                let newCompanionAccess = +(Object.keys(JSON.parse(data.companionAccess)).find(a => JSON.parse(data.companionAccess)[a]))!;

                switch (newCompanionAccess) {
                    case CompanionAccess.Unavailable:
                        if (supp.companionAccess != CompanionAccess.Unavailable
                            && confirm("Are you sure you want to restrict this supplement? This will delete all supplement purchases and investments made by companions.")) {
                            supp.companionAccess = newCompanionAccess;
                            for (let jump of Object.values(chain.jumps)) {
                                for (let characterId of jump.characters) {
                                    if (chain.characters[characterId].primary)
                                        continue;
                                    [...jump.supplementPurchases[characterId][supplementId]].forEach((id) => chain.deregisterPurchase(id));
                                    jump.supplementInvestments[characterId][supplementId] = 0;
                                    chain.pushUpdate({
                                        dataField: ["jumps", jump.id, "supplementInvestments", characterId, supplementId],
                                        action: Action.Update
                                    });
                                }
                            }
                        }
                        break;
                    case CompanionAccess.Partial:
                        if ((supp.companionAccess == CompanionAccess.Available || supp.companionAccess == CompanionAccess.Communal)
                            && !confirm("Warning: This will delete all supplement investments made by companions."))
                            break;
                        supp.companionAccess = newCompanionAccess;
                        for (let jump of Object.values(chain.jumps)) {
                            for (let characterId of jump.characters) {
                                if (chain.characters[characterId].primary)
                                    continue;
                                jump.supplementInvestments[characterId][supplementId] = 0;
                                chain.pushUpdate({
                                    dataField: ["jumps", jump.id, "supplementInvestments", characterId, supplementId],
                                    action: Action.Update
                                });
                            }
                        }
                        break;
                    default:
                        supp.companionAccess = newCompanionAccess;
                }
                chain.pushUpdate(
                    {
                        dataField: ["supplements", supplementId],
                        action: Action.Update
                    }
                );
            }}
            active={false}
            display={ChainSupplementView}
            edit={ChainSupplementEdit}
            extraDisplayProps={{
                rerender: rerender
            }} extraEditProps={{
                rerender: rerender
            }} />
    }



export { ChainSupplementView, ChainSupplementCard };
import { Link, useOutletContext, useParams } from "@remix-run/react";
import React from "react";
import { useState } from "react";
import AccordianContainer, { FieldType } from "~/components/AccordianContainer";
import CheckBox from "~/components/Checkbox";
import Collapsable from "~/components/Collapsable";
import BackgroundCard from "~/components/jumpchain/BackgroundCard";
import NarrativeCard from "~/components/jumpchain/NarrativesCard";
import { PurchaseSummary } from "~/components/jumpchain/PurchaseSummary";
import Chain from "~/jumpchain/Chain";
import { Action } from "~/jumpchain/DataManager";
import Jump, { Currency, OriginCategory, PurchaseSubtype } from "~/jumpchain/Jump";
import { PurchaseType } from "~/jumpchain/Purchase";

export default function Index() {
    const params = useParams();
    let chainId = params.chain!;
    let jId = Number(params.jId);
    let charId = Number(params.charId);
    let [chain, updateBudgets] = useOutletContext<[Chain, () => void]>();

    let [, setC] = useState(0);

    let rerender = () => { setC((a) => a + 1) };

    let jump = chain.requestJump(jId);

    let children = chain.jumpList.filter((id => chain.jumps[id].parentJump == jId));

    let jumpBasicsHead = (
        <span className=
            {`spanning bold center-text-align medium-highlight compact-cell subtle-rounded`}
            key={`${jId}-basics`}
        >
            Jump Basics:
        </span>
    );

    let jumpBasicsBody = (<>
        <div className="vcentered vspaced-half-big">
            <input name="name" type="text" className="roomy-cell center-text-align" value={jump.name} autoComplete="off" placeholder="[untitled jump]"
                onChange={(e) => {
                    jump.name = e.target.value;
                    chain.pushUpdate({
                        dataField: ["jumps", jId, "name"],
                        action: Action.Update
                    });
                    updateBudgets();
                }}
            />
        </div>
        <div className="vcentered" key={`${jId}-duration`}
        >
            Years: <input type="number" step="1" min="0" name="years" className="margins compact-cell big-margin-right"
                defaultValue={jump.duration.years}
                onChange={(e) => {
                    jump.duration.years = e.target.valueAsNumber;
                    chain.pushUpdate({
                        dataField: ["jumps", jId, "duration"],
                        action: Action.Update
                    });
                    updateBudgets();
                }}
            />&nbsp;
            Months: <input type="number" step="1" min="0" name="months" className="margins compact-cell big-margin-right"
                defaultValue={jump.duration.months}
                onChange={(e) => {
                    jump.duration.months = e.target.valueAsNumber;
                    chain.pushUpdate({
                        dataField: ["jumps", jId, "duration"],
                        action: Action.Update
                    });
                    updateBudgets();
                }}
            />&nbsp;
            Days: <input type="number" step="1" min="0" name="days" className="margins compact-cell"
                defaultValue={jump.duration.days}
                onChange={(e) => {
                    jump.duration.days = e.target.valueAsNumber;
                    chain.pushUpdate({
                        dataField: ["jumps", jId, "duration"],
                        action: Action.Update
                    });
                    updateBudgets();
                }}
            />&nbsp;
        </div>
        <div className="vcentered vspaced">
            Supplement: &nbsp; <CheckBox name="" value={jump.parentJump !== undefined}
                onChange={(bool) => {
                    if (bool)
                        chain.makeSupplement(jId);
                    else
                        chain.makePrimaryJump(jId);
                    updateBudgets();
                    return undefined;
                }} />
        </div>
        {
            jump.parentJump !== undefined ?
                <div className="faint-text small-text">
                    (Parent: <Link to={`/chain/${chainId}/${charId}/jump/${jump.parentJump}/config`} className="underline bold">{chain.jumps[jump.parentJump].name}</Link>)
                </div>
                : children.length ?
                    <div className="faint-text small-text big-margin-right big-margin-left">
                        (Children: {children.map((id, index) =>
                            <React.Fragment key={id + "supp"}>
                                {index > 0 ? ", " : ""}
                                <Link to={`/chain/${chainId}/${charId}/jump/${id}/config`} className="underline bold">{chain.jumps[id].name}</Link>
                            </React.Fragment>)
                        })
                    </div>
                    : []

        }
        {
            jump.parentJump === undefined ?
                <div className="underline faint-text clickable" onClick={
                    () => {
                        let i = chain.jumpList.findIndex(id => jId == id);
                        let newJump = new Jump(chain);
                        chain.jumpList.splice(i + 1, 0, ...chain.jumpList.splice(chain.jumpList.length - 1, 1));
                        newJump.parentJump = jId;
                        newJump.name = "[untitled supplement]";
                        newJump.duration.years = 0;
                        updateBudgets();

                    }
                }>
                    Create New Supplement
                </div>
                : []
        }

        <div className="vcentered vspaced">
            URL: <input style={{}} className="margins compact-cell" value={jump.url} onChange={(e) => {
                jump.url = e.target.value;
                chain.pushUpdate({
                    dataField: ["jumps", jId, "url"],
                    action: Action.Update
                });
                updateBudgets();
            }}
            />
        </div>
    </>);

    let jumpBasics = (
        <Collapsable
            head={jumpBasicsHead}
            body={jumpBasicsBody}
            class="faint-highlight mild-outline subtle-rounded hcenter-down vspaced"
            default
            clickable
        />);

    let jumpFeaturesHead = (
        <span className=
            {`spanning bold center-text-align medium-highlight compact-cell subtle-rounded`}
            key={`${jId}-features`}
        >
            Optional Features:
        </span>
    );

    let jumpFeaturesBody = (<div className="roomy-cell right-weighted-column">
        {chain.chainSettings.narratives != "disabled" ?
            <div className="vcentered vspaced row clickable" onClick={() => {
                jump.useNarratives = !jump.useNarratives;
                chain.pushUpdate({
                    dataField: ["jumps", jId, "useNarratives"],
                    action: Action.Update
                });
                updateBudgets();
            }}>
                <CheckBox name="" value={jump.useNarratives} />
                <span className={jump.useNarratives ? "" : "faint-text"}>Narratives {jump.useNarratives ? "Enabled" : "Disabled"}</span>
            </div> : []
        }
        {chain.chainSettings.altForms ?
            <div className="vcentered vspaced row clickable" onClick={() => {
                jump.useAltForms = !jump.useAltForms;
                chain.pushUpdate({
                    dataField: ["jumps", jId, "useAltForms"],
                    action: Action.Update
                });
                updateBudgets();
            }}>
                <CheckBox name="" value={jump.useAltForms} />
                <span className={jump.useAltForms ? "" : "faint-text"}>Alt-Forms {jump.useAltForms ? "Enabled" : "Disabled"}</span>
            </div> : []
        }
        {Object.values(chain.supplements).length ?
            <div className="vcentered vspaced row clickable" onClick={() => {
                if (jump.useSupplements && !confirm("Are you sure you want to disable? This will delete all supplement purchases and investments made during this jump."))
                    return;
                jump.useSupplements = !jump.useSupplements;
                chain.pushUpdate({
                    dataField: ["jumps", jId, "useSupplements"],
                    action: Action.Update
                });
                if (!jump.useSupplements) {
                    for (let suppId in chain.supplements) {
                        jump.characters.forEach((charId) => {
                            [...jump.supplementPurchases[charId][suppId]].forEach(id => chain.deregisterPurchase(id))
                            jump.supplementInvestments[charId][suppId] = 0;
                            chain.pushUpdate({
                                dataField: ["jumps", jId, "supplementInvestments"],
                                action: Action.Update
                            });
                        });
                    }
                }
                updateBudgets();
            }}>
                <CheckBox name="" value={jump.useSupplements} />
                <span className={jump.useSupplements ? "" : "faint-text"}>Chain-Supplements {jump.useSupplements ? "Enabled" : "Disabled"}</span>
            </div> : []
        }


    </div >);

    let jumpFeatures = (
        <Collapsable
            head={jumpFeaturesHead}
            body={jumpFeaturesBody}
            class="light-shade mild-outline subtle-rounded hcenter-down vspaced"
            default
            clickable
        />);

    return (<div className="space-evenly">
        <div>
            {jumpBasics}
            <AccordianContainer<OriginCategory>
                fieldList={
                    {
                        name: { type: FieldType.String, name: "Name" },
                        singleLine: { type: FieldType.Boolean, name: "Single Line" },
                        default: { type: FieldType.Excluded, name: "" },
                    }}
                getter={() => Object.fromEntries(jump.originCategoryList.map((id) => [id, jump.originCategory(id)]))}
                title={"Background & Origin Aspects:"}
                setter={(id, originCategory) => {
                    chain.pushUpdate({
                        dataField: ["jumps", jId, "originCategories", id],
                        action: Action.Update
                    });
                    jump.originCategory(id).name = originCategory.name;
                    jump.originCategory(id).singleLine = originCategory.singleLine;
                    updateBudgets();
                }}
                newEntry={() => jump.addOriginCategory({
                    name: "[new origin aspect]",
                    singleLine: false
                })}
                key={`${jId}Origins`}
                deleteEntry={(id) => { jump.removeOriginCategory(id); updateBudgets(); }}
            />
        </div>
        <div>
            <AccordianContainer<Currency>
                fieldList={
                    {
                        name: { type: FieldType.String, name: "Name" },
                        abbrev: { type: FieldType.String, name: "Abrev" },
                        budget: { type: FieldType.Number, name: "Budget" },
                        essential: { type: FieldType.Excluded, name: "" }
                    }
                }
                getter={() => Object.fromEntries(jump.listCurrencies().map((id) => [id, jump.currency(id)]))}
                title={"Currencies:"}
                setter={(id, currency) => {
                    chain.pushUpdate({
                        dataField: ["jumps", jId, "currencies", id],
                        action: Action.Update
                    });
                    jump.currency(id).abbrev = currency.abbrev;
                    jump.currency(id).name = currency.name;
                    jump.currency(id).budget = currency.budget;
                    updateBudgets();
                }}
                newEntry={() => {
                    let id = jump.newCurrency({
                        name: "[new currency]",
                        abbrev: "[nc]",
                        budget: 0,
                        essential: false
                    }); updateBudgets(); return id;
                }}
                deleteEntry={(id) => { jump.removeCurrency(id); updateBudgets(); }}
                key={`${jId}Currencies`}
            />
            <AccordianContainer<PurchaseSubtype>
                fieldList={{
                    name: { type: FieldType.String, name: "Name", nonEssentialOnly: true },
                    stipend: { type: FieldType.Number, name: "Stipend" },
                    currency: { type: FieldType.Currency, name: "Currency" },
                    subsystem: { type: FieldType.Boolean, name: "Subsystem", nonEssentialOnly: true },
                    type: {
                        type: FieldType.Choose, name: "Type", nonEssentialOnly: true,
                        choices: [{ name: "Perk", value: PurchaseType.Perk }, { name: "Item", value: PurchaseType.Item }]
                    },
                    essential: { type: FieldType.Excluded, name: "" }
                }}
                getter={() => Object.fromEntries(jump.listPurchaseSubtypes().map((id) => [id, jump.purchaseSubtype(id)]))}
                title={"Purchase Subtypes:"}
                setter={(id, subtype) => {
                    jump.updatePurchaseSubtype(id, subtype)
                    updateBudgets();
                }}
                newEntry={() => {
                    let id = jump.newPurchaseSubtype({
                        name: "[new subtype]",
                        stipend: 0,
                        currency: 0,
                        type: PurchaseType.Perk
                    }); updateBudgets(); return id;
                }}
                deleteEntry={(id) => { jump.removePurchaseSubtype(id); updateBudgets(); }}
                currencyList={Object.fromEntries(jump.listCurrencies().map((id) => [id, jump.currency(id)]))}
                key={`${jId}Subtypes`}
            />
            {jumpFeatures}
        </div>
    </div>);

}
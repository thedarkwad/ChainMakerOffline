import { useOutletContext, useParams } from "@remix-run/react";
import { useEffect, useReducer, useRef, useState } from "react";
import Collapsable from "~/components/Collapsable";
import ExternalLink from "~/components/ExternalLink";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import BackgroundCard from "~/components/jumpchain/BackgroundCard";
import NarrativeCard from "~/components/jumpchain/NarrativesCard";
import { PurchaseCard } from "~/components/jumpchain/PurchaseCard";
import { PurchaseSummary } from "~/components/jumpchain/PurchaseSummary";
import Chain from "~/jumpchain/Chain";
import Purchase, { PurchaseType } from "~/jumpchain/Purchase";
import PurchaseList from "./$charId.jump/PurchaseList";
import { Action } from "~/jumpchain/DataManager";
import { CompanionAccess } from "~/jumpchain/ChainSupplement";

export default function Index() {

    const params = useParams();
    let [chain, updateBudgets] = useOutletContext<[Chain, () => void]>();
    let jId = Number(params.jId);
    let charId = Number(params.charId);
    let suppId = Number(params.suppId);

    let jump = chain.requestJump(jId);
    let supp = chain.supplements[suppId];

    let investmentRef = useRef<HTMLInputElement>(null);

    let createNewPurchase = () => {
        let p: Purchase = new Purchase(chain, PurchaseType.Supplement, jump, charId, suppId);
        return p.id;
    }

    let createNewStipend = () => {
        let p: Purchase = new Purchase(chain, PurchaseType.SupplementImport, jump, charId, suppId);
        return p.id;
    }

    let previousPuchasesHead = (
        <div className=
            {`bold center-text-align medium-highlight compact-cell subtle-rounded`}>
            Previous Purchases:
        </div>
    );

    let previousPurchaseIds = chain.jumpList.slice(0, chain.jumpList.findIndex(
        (entry) => (entry === jId))
    ).flatMap((id) => chain.jumps[id].characters.has(charId) ? chain.jumps[id].supplementPurchases![charId][suppId] : []
    ).filter((pId) => (
        !chain.requestPurchase(pId).duration
        || (chain.requestPurchase(pId).duration! < 0)
        || (chain.getJumpNumber(jId) - chain.getJumpNumber(chain.requestPurchase(pId).jumpId) < chain.requestPurchase(pId).duration!)
    )
    );

    let previousPuchasesBody = previousPurchaseIds.length > 0 ? (<div className="compact-cell">
        {
            previousPurchaseIds.map((pId) =>
                <PurchaseSummary
                    jumpNum={chain.getJumpNumber(jId)}
                    key={"prevPurchase" + pId}
                    chain={chain}
                    purchaseId={pId}
                />
            )
        }
    </div>) : <></>;

    useEffect(
        () => {
            if (supp.maxInvestment > 0) {
                investmentRef.current!.value = String(jump.supplementInvestments[charId][suppId]);
            }
        }
        , [suppId])

    return <>
        <div className="neutral-highlight mild-outline subtle-rounded roomy-cell center-text vcentered center-text-align">
            <span className="bold hspaced faint-text"> {supp.name} {supp.url ? <ExternalLink href={supp.url} color="faint" /> : []}</span>
            <span className="hspaced">
                <span className="bold">{supp.currency}:</span> {chain.calulateSupplementBudget(charId, jId, suppId)}
            </span>
            {supp.maxInvestment > 0 ?
                <span className="hspaced">
                    <span className="bold">{jump.currency(0).abbrev} Investment:</span> <input
                        ref={investmentRef}
                        key={`${jId}_bank`}
                        type="number"
                        defaultValue={jump.supplementInvestments[charId][suppId]}
                        step={50}
                        min={0}
                        max={supp.maxInvestment - chain.getSupplementInvestment(charId, jId, suppId, true)}
                        onChange={(e) => {
                            jump.supplementInvestments[charId][suppId] = e.currentTarget.valueAsNumber || 0;
                            chain.pushUpdate({
                                dataField: ["jumps", jId, "supplementInvestments", charId, suppId],
                                action: Action.Update
                            });
                            updateBudgets();
                        }}
                    />
                </span> : []
            }
        </div>
        {
            previousPurchaseIds.length > 0 ?
                (<Collapsable head={previousPuchasesHead} body={previousPuchasesBody} default={false} clickable
                    class="vspaced subtle-rounded" />)
                : <></>
        }
        <PurchaseList
            chain={chain}
            title={"New Purchases"}
            placeholder={"No New Purchases!"}
            source={jump.supplementPurchases[charId][suppId]}
            filter={(p) => p.type == PurchaseType.Supplement}
            sourceDataField={["jumps", jId, "supplementPurchases", charId]}
            copyKey={`supplement_${suppId}`}
            createNew={createNewPurchase}
            rerender={updateBudgets}
            collapsable
        />
        {supp.companionAccess == CompanionAccess.Partial && chain.characterList.filter((id) => !chain.characters[id].primary).length ?
            <PurchaseList
                chain={chain}
                title={"Companion Stipends"}
                placeholder={"No Companions Stipends"}
                source={jump.supplementPurchases[charId][suppId]}
                filter={(p) => p.type == PurchaseType.SupplementImport}
                sourceDataField={["jumps", jId, "supplementPurchases", charId]}
                createNew={createNewStipend}
                rerender={updateBudgets}
                collapsable
            />
            : []

        }



    </>;


}


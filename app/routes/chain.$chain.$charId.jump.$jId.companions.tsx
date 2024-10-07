import { useOutletContext, useParams } from "@remix-run/react";
import { useReducer, useState } from "react";
import Collapsable from "~/components/Collapsable";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import BackgroundCard from "~/components/jumpchain/BackgroundCard";
import NarrativeCard from "~/components/jumpchain/NarrativesCard";
import { PurchaseCard } from "~/components/jumpchain/PurchaseCard";
import Chain from "~/jumpchain/Chain";
import Purchase, { PurchaseType } from "~/jumpchain/Purchase";
import PurchaseList from "./$charId.jump/PurchaseList";

export default function Index() {

    const params = useParams();

    let jId = Number(params.jId);
    let charId = Number(params.charId);
    let [chain, updateBudgets] = useOutletContext<[Chain, () => void]>();
    let jump = chain.requestJump(jId);

    let companions = chain.characterList.filter((id) => !chain.characters[id].primary);
    let imports = jump.purchases[charId].filter((id) => chain.requestPurchase(id).type == PurchaseType.Companion);

    if (!companions.length && !imports.length)
        return <div className="roomy-cell center-text-align bold vspaced error-highlight">
            You don't have any companions to import! <br />
            If you want one, first register them in the "Traveler Manifest."
        </div>
            ;

    return (
        <PurchaseList
            chain={chain}
            title={"Imports"}
            placeholder={"No Companions Imported!"}
            source={jump.purchases[charId]}
            filter={(p) => p.type == PurchaseType.Companion}
            createNew={() => { return (new Purchase(chain, PurchaseType.Companion, jump, charId)).id; }}
            rerender={updateBudgets}
            collapsable
            sourceDataField={["jumps", jId, "purchases", charId]}
        />
    );

}


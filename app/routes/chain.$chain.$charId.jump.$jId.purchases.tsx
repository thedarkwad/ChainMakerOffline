import { useOutletContext, useParams } from "@remix-run/react";
import Chain from "~/jumpchain/Chain";
import Purchase, { PurchaseType } from "~/jumpchain/Purchase";
import PurchaseList from "./$charId.jump/PurchaseList";

export default function Index() {

    let [chain, updateBudgets] = useOutletContext<[Chain, () => void]>();

    const params = useParams();
    let jId = Number(params.jId);
    let charId = Number(params.charId);
    let jump = chain.requestJump(jId);

    let subsystemPurchases = Object.entries(jump.subsystemSummaries[charId]).flatMap(([, list]) => list).map((summary) => summary.id);

    return (
        <>
            <PurchaseList
                chain={chain}
                title={"Perks"}
                placeholder={"No Perks Purchased!"}
                source={jump.purchases[charId]}
                filter={(p) => (p.type == PurchaseType.Perk) && !subsystemPurchases.includes(p.id)}
                createNew={() => {return (new Purchase(chain, PurchaseType.Perk, jump, charId)).id;}}
                rerender={updateBudgets}
                sourceDataField={["jumps", jId, "purchases", charId]}
                copyKey="perks"
                collapsable
            />
            <PurchaseList
                chain={chain}
                title={"Items"}
                filter={(p) => (p.type == PurchaseType.Item) && !subsystemPurchases.includes(p.id)}
                placeholder={"No Items Purchased!"}
                source={jump.purchases[charId]}
                createNew={() => {return (new Purchase(chain, PurchaseType.Item, jump, charId)).id;}}
                rerender={updateBudgets}
                sourceDataField={["jumps", jId, "purchases", charId]}
                copyKey="items"
                collapsable
            />
        </>
    );

}


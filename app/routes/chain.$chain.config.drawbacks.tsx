import { useOutletContext, useParams } from "@remix-run/react";
import { useState } from "react";
import Chain from "~/jumpchain/Chain";
import Purchase, { PurchaseType } from "~/jumpchain/Purchase";
import PurchaseList from "~/routes/$charId.jump/PurchaseList";

export default function Index() {

    let chain = useOutletContext<Chain>();
    
    const [, setCounter] = useState(0);
    let rerender = () => { setCounter((a) => a + 1) };


    return (
        <>
            <PurchaseList
                chain={chain}
                title={"Chain Drawbacks"}
                placeholder={"No Chain Drawbacks Taken!"}
                source={chain.chainDrawbacks}
                createNew={() => {return (new Purchase(chain, PurchaseType.ChainDrawback, undefined, -1)).id;}}
                rerender={rerender}
                sourceDataField={["chainDrawbacks"]}
                collapsable
            />
        </>
    );

}

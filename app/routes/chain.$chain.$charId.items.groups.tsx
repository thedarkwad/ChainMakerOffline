import { Outlet, useNavigate, useOutletContext, useParams } from "@remix-run/react";
import JumpNavigationBar from "./$charId.jump/JumpNavigationBar";
import Chain from "~/jumpchain/Chain";
import { useState } from "react";
import SummaryNavigationBar from "./$charId.summary/SummaryNavigationBar";
import NarrativeCard from "~/components/jumpchain/NarrativesCard";
import { PurchaseGroupCard } from "~/components/jumpchain/PurchaseGroupCard";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import { persistentAdd } from "~/jumpchain/Types";
import { PurchaseType } from "~/jumpchain/Purchase";
import { Action } from "~/jumpchain/DataManager";


export default function Index() {

    const params = useParams();
    const [chain,] = useOutletContext<[Chain, () => void]>();
    let charId = Number(params.charId);

    let [, setCounter] = useState(0);
    let rerender = () => { setCounter((x) => x + 1) };

    let groups = Object.keys(chain.purchaseGroups[charId]).map(Number
    ).filter(id => chain.purchaseGroups[charId][id].type == PurchaseType.Item);

    return <div className="vspaced">
        {groups.map((id) =>
            <PurchaseGroupCard chain={chain} pgId={id} charId={charId} rerender={rerender} />
        )}
        <div className="spanning roomy-cell vspaced">
            {groups.length > 0 ? [] : (<div className="faint-text center-text-align big-margin-right">
                No item groups created!
            </div>)}
            <FloatingButtonRow
                buttons={[
                    {
                        onClick: () => {
                            let newId = persistentAdd({
                                type: PurchaseType.Item,
                                name: "[untitled item group]",
                                description: "",
                                components: []
                            }, chain.purchaseGroups[charId]);

                            chain.pushUpdate({
                                dataField: ["purchaseGroups", charId, newId],
                                action: Action.New
                            });
                            
                            rerender();
                        }, icon: "plus-square"
                    }
                ]}
                position={Direction.Right}
                color={IconColor.Light}
                size={IconSize.Small} />
        </div>
    </div>

}
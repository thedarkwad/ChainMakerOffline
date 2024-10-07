import { useNavigate, useOutletContext, useParams } from "@remix-run/react";
import { FunctionComponent, useEffect, useReducer, useRef, useState } from "react";
import Collapsable from "~/components/Collapsable";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import { PurchaseCard } from "~/components/jumpchain/PurchaseCard";
import Multiselect, { SelectOption } from "~/components/Multiselect";
import Chain from "~/jumpchain/Chain";
import Jump, { SubsystemSummary } from "~/jumpchain/Jump";
import Purchase, { PurchaseType } from "~/jumpchain/Purchase";
import { GID, Id, LID } from "~/jumpchain/Types";
import PurchaseList from "./$charId.jump/PurchaseList";
import { Action } from "~/jumpchain/DataManager";

const SubsystemPurchaseCard: FunctionComponent<{
    chain: Chain, jump: Jump, charId: Id<GID.Character>, subsystem: Id<LID.PurchaseSubtype>, summary: SubsystemSummary, updateBudgets: () => void,
}> = ({ chain, jump, charId, summary, subsystem, updateBudgets }) => {

    const formRef = useRef<HTMLFormElement>(null);

    let subtype = jump.purchaseSubtype(subsystem);

    let createNewSubpurchase = () => {
        let p: Purchase = new Purchase(chain, PurchaseType.Subsystem, jump, charId, undefined, { subsystem: subsystem, parent: summary.id });
        p.currency = subtype.currency;
        return p.id;
    };

    let options: Record<number, SelectOption> = {};
    for (let c of jump.listCurrencies()) {
        options[Number(c)] = { name: jump.currency(Number(c)).abbrev };
    }

    let updateStipend = () => {
        let data = new FormData(formRef.current!);
        summary.stipend = Number(data.get("stipend"));
        let currencyJSON = JSON.parse(Object.fromEntries(data).currency as string);
        for (let currId in currencyJSON) {
            if (currencyJSON[currId]) {
                summary.currency = Number(currId);
                break;
            }
        }
        chain.pushUpdate({
            dataField: ["jumps", jump.id, "subsystemSummaries", charId],
            action: Action.Update
        });
        updateBudgets();
    }

    let currencyDropdown = <Multiselect
        single
        name={"currency"}
        options={options}
        value={Object.fromEntries(jump.listCurrencies().map((c) => [c, c == summary.currency]))}
        onChange={updateStipend}
    />

    return (
        <Collapsable
            head={<div className=
                {`medium-highlight bold center-text-align compact-cell spanning`}>
                {chain.requestPurchase(summary.id).name} [{subtype.name} Purchase]
            </div>}
            body={
                <div className="extra-roomy-cell spanning">
                    <FloatingButtonRow
                        buttons={[
                            ({
                                onClick: (e: React.MouseEvent<HTMLElement>) => {
                                    if (window.confirm("Are you sure you want to delete? This will remove all subpurchases and cannot be undone.")) {
                                        chain.deregisterPurchase(summary.id); updateBudgets();
                                    } else {
                                        e.stopPropagation();
                                    }
                                }, icon: "trash"
                            })
                        ]}
                        color={IconColor.Light}
                        size={IconSize.Small}
                        position={Direction.TopRight} />
                    <div className={`compact-cell vspaced-half-compact spanning vcentered center-text-align`}>
                        <span className="bold">Stipend:</span>&nbsp;
                        <form ref={formRef} className="container">
                            <input type="number" onChange={updateStipend} value={summary.stipend} step="50" className="compact-cell" name="stipend" />
                            &nbsp;
                            {currencyDropdown}
                        </form>
                    </div>
                    <PurchaseCard chain={chain} purchaseId={summary.id} updateBudgets={updateBudgets} startOpen />
                    <PurchaseList
                        chain={chain}
                        copyKey={`subsystem_${jump.id}_${subsystem}`}
                        title={"Components"}
                        placeholder={"No Components Purchased!"}
                        source={jump.purchases[charId]}
                        createNew={createNewSubpurchase}
                        rerender={updateBudgets}
                        sourceDataField={["jumps", jump.id, "purchases", charId]}
                        filter={(p) => summary.subpurchases.includes(p.id)}
                    />
                </div>
            }
            class="subtle-rounded light-shade center-text vcentered medium-outline vspaced-half-compact extra-big-margin-left"
            clickable
            default
        />
    );

};


export default function Index() {

    let [newPurchase, registerNewPurchase] = useState({ counter: 0, id: -1 });

    const params = useParams();
    let [chain, updateBudgets] = useOutletContext<[Chain, () => void]>();
    let jId = Number(params.jId);
    let charId = Number(params.charId);
    let chainId = String(params.chain);
    let ssId = Number(params.ssId);

    const navigate = useNavigate();

    let jump = chain.requestJump(jId);

    useEffect(() => {
        if (!jump.listPurchaseSubtypes().includes(ssId) || !jump.purchaseSubtype(ssId).subsystem) {
            navigate(`/chain/${chainId}/${charId}/jump/${jId}`, { replace: true });
        }
    }, [jId])

    if (!jump.listPurchaseSubtypes().includes(ssId) || !jump.purchaseSubtype(ssId).subsystem) {
        return <></>;
    }

    let subtype = jump.purchaseSubtype(ssId);
    let subsystemAccess = jump.subsystemSummaries[charId][ssId];

    let createNewSummaryPerk = () => {
        let p: Purchase = new Purchase(chain, subtype.type, jump, charId);
        jump.subsystemSummaries[charId][ssId].push({
            id: p.id,
            stipend: 0,
            currency: subtype.currency,
            subpurchases: []
        });
        chain.pushUpdate({
            dataField: ["jumps", jId, "subsystemSummaries", charId, ssId],
            action: Action.Update
        });
        registerNewPurchase({ counter: newPurchase.counter + 1, id: p.id });
    }


    let cells = []
    for (let summary of subsystemAccess) {
        cells.push(<SubsystemPurchaseCard
            chain={chain}
            jump={jump}
            summary={summary}
            updateBudgets={updateBudgets}
            charId={charId}
            subsystem={ssId}
            key={summary.id}
        />)
    }

    return (<>
        {cells}
        <div className="spanning roomy-cell vspaced">
            {jump.subsystemSummaries[charId][ssId].length > 0 ? [] :
                (<div className="faint-text center-text-align big-margin-right">No {subtype.name} Purchases Made!</div>)}
            <FloatingButtonRow
                buttons={[{ onClick: createNewSummaryPerk, icon: "plus-square" }]}
                position={Direction.Right}
                color={IconColor.Light}
                size={IconSize.Small} />
        </div>

    </>);


}


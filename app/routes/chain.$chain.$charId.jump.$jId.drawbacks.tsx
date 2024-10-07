import { useOutletContext, useParams } from "@remix-run/react";
import { FunctionComponent, useEffect, useState } from "react";
import Collapsable from "~/components/Collapsable";
import Chain from "~/jumpchain/Chain";
import Purchase, { PurchaseType } from "~/jumpchain/Purchase";
import PurchaseList from "./$charId.jump/PurchaseList";
import { Action } from "~/jumpchain/DataManager";
import { RetainedDrawbackCard } from "./$charId.jump/RetainedDrawbackCard";
import EditableContainer, { EditableComponentProps } from "~/components/EditableContainer";
import Jump from "~/jumpchain/Jump";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import { GID, Id, LID } from "~/jumpchain/Types";
import Multiselect, { SelectOption } from "~/components/Multiselect";

let CurrencyExchangeView: FunctionComponent<
    EditableComponentProps<{ oCurrency: number, tCurrency: number, oAmmount: number, tAmmount: number }> & { jump: Jump, delete: () => void }> = (p) => {
        return (
            <div style={{ userSelect: "none" }}
                className="compact-cell spanning subtle-rounded compact-cell hover-container faint-highlight-h
                    vspaced-compact mild-outline-h two-column-fixed">
                <div className="compact-cell row">
                    <FloatingButtonRow
                        buttons={[
                            { onClick: p.delete, icon: "trash" },
                            { onClick: () => p.setActive!(true), icon: "pencil" }
                        ]}
                        color={IconColor.Light}
                        size={IconSize.Small}
                        position={Direction.TopRight}
                        hover
                    />

                    <span className="bold">{p.data.oAmmount} {p.jump.currency(p.data.oCurrency).abbrev} exchanged for:</span><span className="faint-text">{p.data.tAmmount} {p.jump.currency(p.data.tCurrency).abbrev}</span>
                </div>
            </div>
        );
    }

let CurrencyExchangeEdit: FunctionComponent<
    EditableComponentProps<{ oCurrency: number, tCurrency: number, oAmmount: number, tAmmount: number }> & { jump: Jump, delete: () => void, submit: () => void }> = (p) => {

        let options: Record<number, SelectOption> = {};
        for (let c of p.jump.listCurrencies()) {
            options[Number(c)] = { name: p.jump.currency(Number(c)).abbrev };
        }

        return (
            <div style={{ userSelect: "none" }}
                className="spanning ui-highlight medium-outline subtle-rounded vspaced two-column-fixed roomy-cell">
                <div className="compact-cell row">
                    <FloatingButtonRow
                        buttons={[
                            { onClick: () => { p.setActive!(false); }, icon: "arrow-back" },
                            { onClick: p.delete, icon: "trash" },
                            { onClick: p.submit, icon: "floppy-disk" },
                        ]}
                        color={IconColor.Light}
                        size={IconSize.Small}
                        position={Direction.TopRight}
                    />

                    <span className="bold vcentered">
                        <input className="compact-cell" name="oAmmount" type="number" defaultValue={p.data.oAmmount} step={50} />&nbsp;
                        <Multiselect
                            single
                            name={"oCurrency"}
                            options={options}
                            inline
                            value={Object.fromEntries(p.jump.listCurrencies().map((c) => [c, c == p.data.oCurrency]))}
                        />&nbsp;for:</span>
                    <span className="vcentered">
                        <input className="compact-cell" name="tAmmount" type="number" defaultValue={p.data.tAmmount} step={50} minLength={15} style={{width: "4rem"}}/>&nbsp;
                        <Multiselect
                            single
                            name={"tCurrency"}
                            options={options}
                            inline
                            value={Object.fromEntries(p.jump.listCurrencies().map((c) => [c, c == p.data.tCurrency]))}
                        />
                    </span>
                </div>
            </div>
        );
    }


let CurrencyExchangeCard: FunctionComponent<{ jump: Jump, charId: Id<GID.Character>, index: number, rerender: () => void, default: boolean }> = (p) => {
    const get = () => {
        return p.jump.currencyExchanges[p.charId][p.index];
    }
    const set = (formData: { [x: string]: any }) => {
        p.jump.currencyExchanges[p.charId][p.index].oAmmount = Number(formData.oAmmount);
        p.jump.currencyExchanges[p.charId][p.index].tAmmount = Number(formData.tAmmount);

        let oCurrencyRecord = JSON.parse(formData.oCurrency) as Record<Id<LID.Currency>, boolean>;
        p.jump.currencyExchanges[p.charId][p.index].oCurrency = Number(Object.keys(oCurrencyRecord).find((k) => oCurrencyRecord[Number(k)]));

        let tCurrencyRecord = JSON.parse(formData.tCurrency) as Record<Id<LID.Currency>, boolean>;
        p.jump.currencyExchanges[p.charId][p.index].tCurrency = Number(Object.keys(tCurrencyRecord).find((k) => tCurrencyRecord[Number(k)]));

        p.jump.chain.pushUpdate({
            dataField: ["jumps", p.jump.id, "currencyExchanges", p.charId, p.index],
            action: Action.Update
        });

        p.rerender();

    }

    const deleteExchange = () => {
        p.jump.currencyExchanges[p.charId].splice(p.index, 1);
        p.jump.chain.pushUpdate({
            dataField: ["jumps", p.jump.id, "currencyExchanges", p.charId],
            action: Action.Update
        });
        p.rerender();
    }

    return <EditableContainer<{ oCurrency: number, tCurrency: number, oAmmount: number, tAmmount: number },
        { jump: Jump, delete: () => void },
        { jump: Jump, delete: () => void }>
        get={get}
        set={set}
        display={CurrencyExchangeView}
        edit={CurrencyExchangeEdit}
        active={p.default}
        extraDisplayProps={{
            jump: p.jump,
            delete: deleteExchange
        }}
        extraEditProps={{
            jump: p.jump,
            delete: deleteExchange
        }} />

}


export default function Index() {

    let [chain, updateBudgets] = useOutletContext<[Chain, () => void]>();
    let [newPurchase, registerNewPurchase] = useState({ counter: 0, id: -1 });

    const params = useParams();
    let jId = Number(params.jId);
    let charId = Number(params.charId);
    let jump = chain.requestJump(jId);

    useEffect(() => {
        registerNewPurchase({ counter: 0, id: -1 });
    }, [jId, charId]);

    let createNewExchange = () => {
        jump.currencyExchanges[charId].push({
            oCurrency: 0,
            tCurrency: 0,
            oAmmount: 0,
            tAmmount: 0
        });

        chain.pushUpdate({
            dataField: ["jumps", jId, "currencyExchanges", charId],
            action: Action.Update
        });

        registerNewPurchase({ counter: newPurchase.counter + 1, id: jump.currencyExchanges[charId].length - 1 });
    }

    let chainDrawbacksHead = (
        <div className=
            {`bold center-text-align medium-highlight compact-cell subtle-rounded`}>
            Chain Drawbacks:
        </div>
    );

    let retainedDrawbacksHead = (
        <div className=
            {`bold center-text-align medium-highlight compact-cell subtle-rounded`}>
            Retained Drawbacks:
        </div>
    );

    let currencyExchangesHead = (
        <div className=
            {`bold center-text-align medium-highlight compact-cell subtle-rounded`}>
            Currency Exchanges:
        </div>
    );

    let currencyExchangesBody = <div className="spanning" >
        {
            jump.currencyExchanges[charId].map((c, i) => <CurrencyExchangeCard
                jump={jump}
                charId={charId}
                index={i}
                rerender={updateBudgets}
                default={i == newPurchase.id}
            />)
        }
        <div className="spanning roomy-cell vspaced">
            {jump.currencyExchanges[charId].length > 0 ? [] :
                (<div className="faint-text center-text-align big-margin-right">No Currency Exchanges Taken</div>)}
            <FloatingButtonRow
                buttons={[{ onClick: createNewExchange, icon: "plus-square" }]}
                position={Direction.Right}
                color={IconColor.Light}
                size={IconSize.Small} />
        </div>

    </div>;

    let chainDrawbacks = jump.getPreviouslyRetainedDrawbacks(charId, true, true);
    let retainedDrawbacks = jump.getPreviouslyRetainedDrawbacks(charId, false);

    let jumpNum = chain.getJumpNumber(jId);
    let chainDrawbacksBody = <div className="compact-cell">
        {
            chainDrawbacks.filter(
                (pId) => !chain.requestPurchase(pId).duration || chain.requestPurchase(pId).duration! < 0 || chain.requestPurchase(pId).duration! > jumpNum
            ).map((pId) =>
                <RetainedDrawbackCard chain={chain} purchaseId={pId} key={pId} active={false} rerender={updateBudgets} jId={jId} jumperId={charId} />
            )
        }
    </div>;

    let retainedDrawbacksBody = <div className="compact-cell">
        {
            retainedDrawbacks.map((pId) =>
                <RetainedDrawbackCard chain={chain} purchaseId={pId} key={pId} active={false} rerender={updateBudgets} jId={jId} jumperId={charId} />
            )
        }
    </div>;

    return (
        <>
            {chain.bankSettings.enabled ? (<div className="neutral-highlight mild-outline subtle-rounded roomy-cell center-text vcentered center-text-align">
                <span className="bold hspaced faint-text">Bank</span>
                <span className="hspaced">
                    <span className="bold">Balance: </span>
                    {chain.calculateBankBalance(charId, jId) + chain.getBankDeposit(charId, jId, false, true)}
                </span>
                <span className="hspaced">
                    <span className="bold">{jump.currency(0).abbrev} Deposit:</span> <input
                        key={`${jId}_bank`}
                        type="number"
                        defaultValue={jump.bankDeposits[charId]}
                        step={50}
                        max={chain.bankSettings.maxDeposit - chain.getBankDeposit(charId, jId, true, false)}
                        onChange={(e) => {
                            jump.bankDeposits[charId] = e.currentTarget.valueAsNumber || 0;
                            chain.pushUpdate({
                                dataField: ["jumps", jId, "bankDeposits", charId],
                                action: Action.Update
                            });
                            updateBudgets();
                        }}
                    />
                </span>
            </div>
            ) : []}
            {chainDrawbacks.length ? <Collapsable head={chainDrawbacksHead} body={chainDrawbacksBody} default={false} clickable
                class="vspaced subtle-rounded" /> : []}
            {retainedDrawbacks.length ? <Collapsable head={retainedDrawbacksHead} body={retainedDrawbacksBody} default={true} clickable
                class="vspaced subtle-rounded" /> : []}
            {jump.listCurrencies().length > 1 ?
                <Collapsable head={currencyExchangesHead} body={currencyExchangesBody} default={false} clickable
                    class="vspaced subtle-rounded" /> : []}

            <PurchaseList
                chain={chain}
                title={"Drawbacks"}
                placeholder={"No Drawbacks Taken!"}
                source={jump.drawbacks[charId]}
                filter={(p) => p.type == PurchaseType.Drawback}
                createNew={() => { return (new Purchase(chain, PurchaseType.Drawback, jump, charId)).id; }}
                rerender={updateBudgets}
                sourceDataField={["jumps", jId, "drawbacks", charId]}
                copyKey="drawbacks"
                collapsable
            />
            <PurchaseList
                chain={chain}
                title={"Scenarios"}
                placeholder={"No Scenarios Taken!"}
                source={jump.drawbacks[charId]}
                filter={(p) => p.type == PurchaseType.Scenario}
                createNew={() => { return (new Purchase(chain, PurchaseType.Scenario, jump, charId)).id; }}
                sourceDataField={["jumps", jId, "drawbacks", charId]}
                rerender={updateBudgets}
                copyKey="scenarios"
                collapsable
            />

        </>
    );

}


import { NavLink, useOutletContext, useParams, useSubmit } from "@remix-run/react";
import { useContext, useRef, useState } from "react";
import AccordianContainer, { FieldType } from "~/components/AccordianContainer";
import CheckBox from "~/components/Checkbox";
import Collapsable from "~/components/Collapsable";
import Multiselect from "~/components/Multiselect";
import Chain from "~/jumpchain/Chain";
import { Action } from "~/jumpchain/DataManager";
import Purchase, { PurchaseType } from "~/jumpchain/Purchase";
import { getFreeId, GID } from "~/jumpchain/Types";
import { rerenderTitleContext } from "./chain.$chain";


export default function Index() {

  const chain = useOutletContext<Chain>();
  const [, setBankEnabled] = useState(chain.bankSettings.enabled);
  const rerender = useContext(rerenderTitleContext);

  const params = useParams();
  let chainId = params.chain!;

  let submit = useSubmit();

  const ratioRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-evenly">
      <div>
        <Collapsable
          head={<div className={`spanning bold center-text-align medium-highlight compact-cell subtle-rounded`}        >
            General:
          </div>}
          body={
            <div className="hcenter-down extra-roomy-cell">
              <input className="roomy-cell" defaultValue={chain.name} onChange={
                (e) => {
                  chain.name = e.currentTarget.value || "";
                  chain.pushUpdate(
                    {
                      dataField: ["name"],
                      action: Action.Update
                    }
                  );
                  rerender();
                }
              } />
              <div className="right-weighted-column vspaced" >
                <div className="row clickable" onClick={() => {
                  chain.chainSettings.chainDrawbacksForCompanions = !chain.chainSettings.chainDrawbacksForCompanions;
                  chain.pushUpdate(
                    {
                      dataField: ["chainSettings", "chainDrawbacksForCompanions"],
                      action: Action.Update
                    }
                  );
                  rerender();
                }}>
                  <CheckBox name={""} value={chain.chainSettings.chainDrawbacksForCompanions} />
                  <span className="">Companions Fully-Benefit from Chain Drawbacks</span>
                </div>
                <div className="row clickable" onClick={() => {
                  chain.chainSettings.chainDrawbacksSupplements = !chain.chainSettings.chainDrawbacksSupplements;
                  chain.pushUpdate(
                    {
                      dataField: ["chainSettings", "chainDrawbacksSupplements"],
                      action: Action.Update
                    }
                  );
                  rerender();
                }}>
                  <CheckBox name={""} value={chain.chainSettings.chainDrawbacksSupplements} />
                  <span className="">Supplements Receive Points From Chain Drawbacks</span>
                </div>


              </div>
              <div className="right-weighted-column vspaced" >
                <span className="italic spanning center-text-align vspaced-compact">Optional Systems:</span>
                <span className="bold right-align-self vcentered">Narratives:</span>
                <Multiselect
                  name={"A"}
                  options={{
                    0: { name: "Disabled" },
                    1: { name: "Enabled for Primary Jumper(s)" },
                    2: { name: "Enabled for All" }

                  }}
                  value={{
                    0: chain.chainSettings.narratives == "disabled",
                    1: chain.chainSettings.narratives == "restricted",
                    2: chain.chainSettings.narratives == "enabled"
                  }}
                  onChange={(data) => {
                    if (data[0]) chain.chainSettings.narratives = "disabled";
                    if (data[1]) chain.chainSettings.narratives = "restricted";
                    if (data[2]) chain.chainSettings.narratives = "enabled";
                    chain.pushUpdate({
                      dataField: ["chainSettings", "narratives"],
                      action: Action.Update
                    });
                  }}
                  single />

                <span className="bold right-align-self vcentered">Alt-Forms:</span>
                <Multiselect
                  name={"A"}
                  options={{
                    0: { name: "Enabled" },
                    1: { name: "Disabled" }
                  }}
                  value={{ 0: chain.chainSettings.altForms, 1: !chain.chainSettings.altForms }}
                  onChange={(data) => {
                    if (data[0]) chain.chainSettings.altForms = true;
                    if (data[1]) chain.chainSettings.altForms = false;
                    chain.pushUpdate({
                      dataField: ["chainSettings", "altForms"],
                      action: Action.Update
                    });
                  }}
                  single />
              </div>
            </div>
          }
          clickable
          default
          class={`vspaced spanning light-shade mild-outline subtle-rounded`}
        />
        <Collapsable
          head={<div className={`spanning bold center-text-align medium-highlight compact-cell subtle-rounded`}        >
            Bank:
          </div>}
          body={
            <div className="hcenter-down extra-roomy-cell">
              <div className="vcentered center-align-text large-text vspaced-half-compact">
                <CheckBox name={"enable"} defaultValue={chain.bankSettings.enabled} onChange={(v) => {
                  if (v) {
                    chain.bankSettings.enabled = true;
                  } else if (confirm("Are you sure you want to disable your bank? This will remove any existing bank deposits or withdrawls.")) {
                    chain.bankSettings.enabled = false;
                    for (let jump of Object.values(chain.jumps)) {
                      jump.characters.forEach((charId) => { jump.bankDeposits[charId] = 0; });
                    }
                  } else {
                    return false;
                  }
                  chain.pushUpdate({
                    dataField: ["bankSettings", "enabled"],
                    action: Action.Update
                  });
                  setBankEnabled(chain.bankSettings.enabled);
                }} /> <span className="margin-left margin-right"></span>Enable Bank
              </div>
              {chain.bankSettings.enabled ?
                <div className="right-weighted-column vspaced-half-big" >
                  <span className="bold right-align-self">Max Deposit: </span>
                  <div className="searchbar compact-cell vcentered" style={{ justifyItems: "stretch" }}>
                    <input type="number" style={{ width: "100%" }} step={50}
                      defaultValue={chain.bankSettings.maxDeposit} onChange={(e) => {
                        chain.bankSettings.maxDeposit = e.currentTarget.valueAsNumber || 0;
                        chain.pushUpdate({
                          dataField: ["bankSettings", "maxDeposit"],
                          action: Action.Update
                        });
                      }
                      }
                    />
                  </div>
                  <span className="bold right-align-self">Deposit Ratio: </span>
                  <div className="searchbar compact-cell" onClick={() => { if (ratioRef.current) ratioRef.current.focus(); }}>100 Jump CP &nbsp;:
                    <input type="number" className="no-arrows" style={{ textAlign: "right", width: "2rem" }} step={50}
                      ref={ratioRef}
                      defaultValue={chain.bankSettings.depositRatio} onChange={(e) => {
                        chain.bankSettings.depositRatio = e.currentTarget.valueAsNumber || 0;
                        chain.pushUpdate({
                          dataField: ["bankSettings", "depositRatio"],
                          action: Action.Update
                        });

                      }
                      }
                    /> Bank CP</div>
                  <span className="bold right-align-self">Interest Rate: </span>
                  <div className="searchbar compact-cell">
                    <input type="number" className="no-arrows" style={{ textAlign: "right", width: "90%" }} step={10}
                      defaultValue={chain.bankSettings.interestRate} onChange={(e) => {
                        chain.bankSettings.interestRate = e.currentTarget.valueAsNumber || 0;
                        chain.pushUpdate({
                          dataField: ["bankSettings", "interestRate"],
                          action: Action.Update
                        });
                      }
                      }
                    />%
                  </div>
                </div> :
                []
              }
            </div>
          }
          clickable
          default
          class={`vspaced spanning light-shade mild-outline subtle-rounded`}
        />

      </div>
      <div>
        <AccordianContainer<{ name: string }>
          fieldList={{
            name: { type: FieldType.String, name: "Name" }
          }}
          getter={() => Object.fromEntries(Object.entries(chain.purchaseCategories[PurchaseType.Perk]).map(([x, s]) => [x, { name: s }]))}
          setter={(id, { name }) => {
            chain.purchaseCategories[PurchaseType.Perk][id] = name;
            chain.pushUpdate({
              dataField: ["purchaseCategories", PurchaseType.Perk, id],
              action: Action.Update
            });
          }}
          newEntry={() => {
            let id = getFreeId<GID.PurchaseCategory>(chain.purchaseCategories[PurchaseType.Perk]);
            chain.purchaseCategories[PurchaseType.Perk][id] = "[new category]";
            chain.pushUpdate({
              dataField: ["purchaseCategories", PurchaseType.Perk, id],
              action: Action.New
            });
            return id;
          }}
          deleteEntry={(id) => { chain.removePurchaseCategory(PurchaseType.Perk, id) }}
          title={"Perk Categories:"} />

        <AccordianContainer<{ name: string }>
          fieldList={{
            name: { type: FieldType.String, name: "Name" }
          }}
          getter={() => Object.fromEntries(Object.entries(chain.purchaseCategories[PurchaseType.Item]).map(([x, s]) => [x, { name: s }]))}
          setter={(id, { name }) => {
            chain.purchaseCategories[PurchaseType.Item][id] = name;
            chain.pushUpdate({
              dataField: ["purchaseCategories", PurchaseType.Item, id],
              action: Action.Update
            });
          }}
          newEntry={() => {
            let id = getFreeId<GID.PurchaseCategory>(chain.purchaseCategories[PurchaseType.Item]);
            chain.purchaseCategories[PurchaseType.Item][id] = "[new category]";
            chain.pushUpdate({
              dataField: ["purchaseCategories", PurchaseType.Item, id],
              action: Action.New
            });
            return id;
          }}
          deleteEntry={(id) => { chain.removePurchaseCategory(PurchaseType.Item, id) }}
          title={"Item Categories:"} />

      </div>
    </div>
  );

}

import { useOutletContext } from "@remix-run/react";
import AccordianContainer, { FieldType } from "~/components/AccordianContainer";
import CheckBox from "~/components/Checkbox";
import Collapsable from "~/components/Collapsable";
import Multiselect from "~/components/Multiselect";
import Chain from "~/jumpchain/Chain";
import { Action } from "~/jumpchain/DataManager";
import { getFreeId, GID } from "~/jumpchain/Types";
import { ChainSupplementCard } from "./$charId.config/ChainSupplementCard";
import { useState } from "react";
import FloatingButtonRow, { Direction, IconColor, IconSize } from "~/components/FloatingButton";
import ChainSupplement from "~/jumpchain/ChainSupplement";


export default function Index() {

  const chain = useOutletContext<Chain>();
  const [, setCounter] = useState(0);

  let rerender = () => { setCounter((x) => x + 1); }

  return (
    <>
      {
        Object.keys(chain.supplements).map((sId) =>
          <ChainSupplementCard key={`${sId}-supplement`} chain={chain} rerender={rerender} supplementId={Number(sId)} />
        )
      }
      <div className="spanning roomy-cell vspaced big-margin-right">
        {Object.keys(chain.supplements).length > 0 ? [] : (<div className="faint-text center-text-align big-margin-right">No Supplements</div>)}
        <FloatingButtonRow
          buttons={[{ onClick: () => {new ChainSupplement(chain); rerender();}, icon: "plus-square" }]}
          position={Direction.Right}
          color={IconColor.Light}
          size={IconSize.Small} />
      </div>

    </>
  );
}
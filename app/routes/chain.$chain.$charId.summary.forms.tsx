import { Outlet, useNavigate, useOutletContext, useParams } from "@remix-run/react";
import JumpNavigationBar from "./$charId.jump/JumpNavigationBar";
import Chain from "~/jumpchain/Chain";
import { useState } from "react";
import SummaryNavigationBar from "./$charId.summary/SummaryNavigationBar";
import NarrativeCard from "~/components/jumpchain/NarrativesCard";
import { AltFormCard } from "~/components/jumpchain/AltFormCard";


export default function Index() {

    const params = useParams();
    const [chain,] = useOutletContext<[Chain, () => void]>();
    let charId = Number(params.charId);

    let altForms = chain.jumpList.map(
        (jId) => (chain.requestJump(jId).characters.has(charId) && chain.requestJump(jId).useAltForms) ? chain.requestJump(jId).altForms[charId] : []).flat();

    return <div className="vspaced">
        {
            altForms.length > 0 ?
                altForms.map((afId) =>
                    <AltFormCard chain={chain} altFormId={afId} rerender={() => { }} essential showLink key={`${afId}_AltForm`} />)
                : <div className="spanning roomy-cell center-text-align">No Alt-Forms Obtained!</div>
        }
    </div >

}
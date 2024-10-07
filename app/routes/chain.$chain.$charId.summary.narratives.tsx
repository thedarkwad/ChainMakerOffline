import { Outlet, useNavigate, useOutletContext, useParams } from "@remix-run/react";
import JumpNavigationBar from "./$charId.jump/JumpNavigationBar";
import Chain from "~/jumpchain/Chain";
import { useState } from "react";
import SummaryNavigationBar from "./$charId.summary/SummaryNavigationBar";
import NarrativeCard from "~/components/jumpchain/NarrativesCard";


export default function Index() {

    const params = useParams();
    const [chain,] = useOutletContext<[Chain, () => void]>();
    let charId = Number(params.charId);

    return <div className="vspaced">
        {chain.jumpList.map((jId) =>
            (!chain.jumps[jId].characters.has(charId) || !chain.requestJump(jId).useNarratives) ? [] :
                <NarrativeCard chain={chain} jumperId={charId} jumpId={jId} summary key={`${jId}_Narratives`} horizontal
                    defaultOpen={!!chain.requestJump(jId).narratives[charId].accomplishments || !!chain.requestJump(jId).narratives[charId].challenges || !!chain.requestJump(jId).narratives[charId].goals} />
        )}
    </div>

}
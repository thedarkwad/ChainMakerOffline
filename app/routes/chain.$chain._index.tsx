import { useNavigate, useOutletContext, useParams } from "@remix-run/react";
import { useEffect } from "react";
import Chain from "~/jumpchain/Chain";

export default function Index() {
  const params = useParams();
  const chain = useOutletContext<Chain>();
  let chainId = String(params.chain);

  let navigate = useNavigate();

  useEffect(
    () => navigate(`/chain/${chainId}/${chain.characterList[0]}/jump/${chain.jumpList[0]}`, { replace: true })
    , []);

  return (

    <>
    </>

  );
}

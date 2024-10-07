import { NavLink, useParams } from "@remix-run/react";
import { FunctionComponent, ReactNode } from "react";
import Chain from "~/jumpchain/Chain";
import { CompanionAccess } from "~/jumpchain/ChainSupplement";
import { PurchaseType } from "~/jumpchain/Purchase";

const NavItem: FunctionComponent<{ text: string, address: string }> = ({ text, address }) => {
    let sharedClasses = "roomy-cell subtle-rounded hspaced clickable";
    let activeClasses = "active-navlink medium-highlight mild-outline";
    let inactiveClasses = "inactive-navlink text-highlight-h mild-outline-h faint-highlight-h";
    return (<NavLink end className={({ isActive }) => `${sharedClasses} ${isActive ? activeClasses : inactiveClasses}`}
        to={address}>
        <span className="def out-of-flow center-text-align" style={{ left: 0, right: 0 }}>{text}</span>
        <span className="alternate bold">{text}</span>
    </NavLink>);
}

const Component: FunctionComponent<{ chain: Chain, jumperId: number }> = ({ chain, jumperId }) => {

    let params = useParams();
    let chainId = params.chain!;

    let supplementNavs: ReactNode[] = [];
    for (let chainSupplement of Object.values(chain.supplements)) {
        if (chainSupplement.itemLike) continue;
        if (chain.characters[jumperId].primary || chainSupplement.companionAccess != CompanionAccess.Unavailable)
            supplementNavs.push(<NavItem
                text={chainSupplement.name}
                address={`/chain/${chainId}/${jumperId}/summary/supp/${chainSupplement.id}`}
                key={`Supp${chainSupplement.id}`}
            />
            )
    }

    return (<nav className="flex-left faint-text">
        <NavItem text="Overview" address={`/chain/${chainId}/${jumperId}/summary`} />
        <NavItem text="Perk List" address={`/chain/${chainId}/${jumperId}/summary/purchases`} />
        {chain.chainSettings.altForms ? <NavItem text="Alt-Forms" address={`/chain/${chainId}/${jumperId}/summary/forms`} /> : []}
        {supplementNavs}
        {chain.chainSettings.narratives == "enabled" || (chain.characters[jumperId].primary && chain.chainSettings.narratives == "restricted") ?
            <NavItem text="Narrative Summary" address={`/chain/${chainId}/${jumperId}/summary/narratives`} /> : []
        }
        <NavItem text="Perk Groups" address={`/chain/${chainId}/${jumperId}/summary/groups`} />
    </nav>);

}

export default Component;
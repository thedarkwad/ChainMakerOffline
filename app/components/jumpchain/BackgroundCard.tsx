import { FunctionComponent } from "react";
import { GID, Id } from "~/jumpchain/Types";
import EditableContainer, { EditableComponentProps } from "../EditableContainer";
import { Row, TwoColumnDisplay, TwoColumnEdit } from "./TwoColumnCard";
import Chain from "~/jumpchain/Chain";
import { Action } from "~/jumpchain/DataManager";

const BackgroundCard: FunctionComponent<{ chain: Chain, jumpId: Id<GID.Jump>, jumperId: Id<GID.Character>, updateBudgets: () => void }> =
    ({ chain, jumpId, jumperId, updateBudgets }) => {
        let get: () => Row[] = () => {
            return chain.requestJump(jumpId).originCategoryList.map((id) => {
                    return {
                        _title: chain.requestJump(jumpId).originCategory(id).name,
                        _summary: chain.requestJump(jumpId).origins[jumperId][id].summary,
                        _cost: chain.requestJump(jumpId).origins[jumperId][id].cost,
                        ...(chain.requestJump(jumpId).originCategory(id).singleLine ? {} :
                            { Description: chain.requestJump(jumpId).origins[jumperId][id].description || "" })
                    };
                })
        };

        let set = (formData: { [key: string]: any }) => {

            chain.pushUpdate({
                dataField: ["jumps", jumpId, "origins", jumperId],
                action: Action.Update
            });

            let rows: { [x: string]: number | string }[] = [];
            Object.entries(formData).forEach(([key, value]) => {
                let underscore = key.indexOf('_');
                let index = Number(key.substring(0, underscore));
                let entry = key.substring(underscore + 1, key.length);
                while (rows.length <= index) rows.push({} as Row);
                rows[index][entry] = (entry == "_cost") ? Number(value) : String(value);
            });
            for (let rowIndex in rows) {
                let originCatId = chain.requestJump(jumpId).originCategoryList[rowIndex];
                chain.requestJump(jumpId).origins[jumperId][originCatId].cost = Number(rows[rowIndex]._cost);
                chain.requestJump(jumpId).origins[jumperId][originCatId].summary = String(rows[rowIndex]._summary);
                chain.requestJump(jumpId).origins[jumperId][originCatId].description = String(rows[rowIndex].Description);
            }
        };

        return <EditableContainer<Row[], {title: string, curr: string}, {title: string, curr: string}>
            get={get}
            set={(data) => { set(data); updateBudgets(); }}
            display={TwoColumnDisplay as FunctionComponent<EditableComponentProps<Row[]> & { title: string; curr: string }>}
            edit={TwoColumnEdit as FunctionComponent<EditableComponentProps<Row[]> & { submit: () => void; title: string; curr: string}>}
            extraDisplayProps={{title: "Background", curr: chain.requestJump(jumpId).currency(0).abbrev}}
            extraEditProps={{title: "Background", curr: chain.requestJump(jumpId).currency(0).abbrev}} />
    }

export default BackgroundCard;
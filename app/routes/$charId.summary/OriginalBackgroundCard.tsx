import { FunctionComponent } from "react";
import { GID, Id } from "~/jumpchain/Types";
import Chain from "~/jumpchain/Chain";
import { Row, TwoColumnDisplay, TwoColumnEdit } from "~/components/jumpchain/TwoColumnCard";
import EditableContainer, { EditableComponentProps } from "~/components/EditableContainer";
import { Action } from "~/jumpchain/DataManager";

const OriginalBackgroundCard: FunctionComponent<{ chain: Chain, jumperId: Id<GID.Character> , rerender: () => void}> =
    ({ chain, jumperId, rerender}) => {
        let char = chain.requestCharacter(jumperId);

        let get: () => Row[] = () => {
            return [{
                _title: "Name",
                _summary: char.name,
            },
            {
                _title: "Gender",
                _summary: char.gender
            },
            {
                _title: "Age",
                _summary: String(char.originalAge)
            },
            {
                _title: "Background",
                _summary: char.background.summary,
                Description: char.background.description

            }] as Row[];

        }

        let set = (formData: { [key: string]: any }) => {
            char.name = formData["0__summary"];
            chain.pushUpdate({
                dataField: ["characters", jumperId, "name"],
                action: Action.Update
            });
            char.gender = formData["1__summary"];
            chain.pushUpdate({
                dataField: ["characters", jumperId, "gender"],
                action: Action.Update
            });
            char.originalAge = formData["2__summary"];
            chain.pushUpdate({
                dataField: ["characters", jumperId, "originalAge"],
                action: Action.Update
            });
            char.background = {summary: formData["3__summary"], description: formData["3_Description"]};
            chain.pushUpdate({
                dataField: ["characters", jumperId, "background"],
                action: Action.Update
            });

            rerender();



        };

        return <EditableContainer<Row[], { title: string}, { title: string }>
            get={get}
            set={(data) => { set(data);}}
            display={TwoColumnDisplay as FunctionComponent<EditableComponentProps<Row[]> & { title: string}>}
            edit={TwoColumnEdit as FunctionComponent<EditableComponentProps<Row[]> & { submit: () => void; }>}
            extraDisplayProps={{ title: "Original Background" }}
            extraEditProps={{ title: "Original Background" }} />
    }

export default OriginalBackgroundCard;
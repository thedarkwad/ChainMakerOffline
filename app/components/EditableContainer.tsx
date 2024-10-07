import { Component, FormEvent, FunctionComponent, createRef } from "react";

export interface EditableComponentProps<DataType> {
    data: DataType;
    setActive?: (a: boolean) => void;
}

interface EditCallbacks {
    submit: () => void,
    delete?: () => void
}

export enum FieldType {
    String,
    Number,
    Object
}

function sanitize(value: string, type: FieldType) {
    switch (type) {
        case FieldType.String:
            return value;
        case FieldType.Number:
            return Number(value);
        case FieldType.Object:
            return JSON.parse(value);
    }
}

interface EditableProps<DataType, A, B> {
    get: () => DataType;
    set: (formData: { [key: string]: any }) => void;
    fieldList?: Record<keyof DataType, FieldType>;
    display: FunctionComponent<EditableComponentProps<DataType> & A>;
    extraDisplayProps: A;
    edit: FunctionComponent<EditableComponentProps<DataType> & EditCallbacks & B>;
    extraEditProps: B;
    active? : boolean;
    callback?: (form: HTMLFormElement, record: (entry: { key: string; data: string; }) => void) => void;
    encType?: string
}

export default class EditableContainer<DataType, A, B>
    extends Component<EditableProps<DataType, A, B>,
        { active: boolean, hiddenEntries: { key: string, data: string }[] }> {

    formRef: React.RefObject<HTMLFormElement>;

    private formSubmit(e?: FormEvent<HTMLFormElement>): void {
        if (e) e.preventDefault();
        if (this.props.callback) this.props.callback(this.formRef.current!, this.addHiddenEntry);
        const data = Object.fromEntries(Array.from(new FormData(this.formRef.current!)))
        this.props.set(data);
        this.setState({ active: false });
    };

    constructor(props: EditableProps<DataType, A, B>) {
        super(props);
        this.state = { active: !!props.active, hiddenEntries: [] };
        this.formRef = createRef();
        this.formSubmit = this.formSubmit.bind(this);
        this.setActive = this.setActive.bind(this);
        this.addHiddenEntry = this.addHiddenEntry.bind(this);
    }

    public setActive(a: boolean) {
        this.setState({ active: a, hiddenEntries: [] });
    }

    public addHiddenEntry(entry: { key: string, data: string }) {
        this.setState({ hiddenEntries: this.state.hiddenEntries.concat([entry]) });
    }

    public render() {
        if (!this.state.active)
            return (<this.props.display data={this.props.get()} setActive={this.setActive} {...this.props.extraDisplayProps}/>);
        else
            return (
                <form
                    style={{display: "contents"}}
                    onSubmit={this.formSubmit}
                    encType={this.props.encType || "application/x-www-form-urlencoded"}
                    onKeyDown={(e: React.KeyboardEvent<HTMLFormElement>) => {
                        if (e.code == "Enter" && !e.shiftKey) {e.preventDefault(); this.formSubmit();}
                        if (e.code == "Escape") this.setActive(false)
                    }}
                    ref={this.formRef} >
                    <this.props.edit
                        data={this.props.get()}
                        setActive={this.setActive}
                        submit={this.formSubmit}
                        {...this.props.extraEditProps}
                    />
                    {
                        this.state.hiddenEntries.map(({ key, data }) => (
                            <input type="hidden" defaultValue={data} name={key} />
                        ))
                    }
                </form>
            );
    }
}


// JIRA.Schema.FieldBean
export type Fields = { [k: string]: Field };

export type FieldOrFieldMeta = Field | FieldMeta;
export type EditMetaDescriptor = { [key: string]: FieldOrFieldMeta };
export interface Field {
    readonly id: string;
    readonly key: string;
    readonly name: string;
    readonly schema?: FieldSchemaMeta;
    currentValue?: any;
    renderedValue?: any;
    readonly custom: boolean;
    readonly clauseNames: string[];
}

export function readField(props: any) {
    return {
        id: props.id,
        key: props.key,
        name: props.name,
        custom: props.custom,
        clauseNames: props.clauseNames,
        schema: props.schema ? readFieldSchema(props.schema) : undefined
    };
}

export function isField(f: any): f is Field {
    return f && (<Field>f).clauseNames !== undefined;
}

// FieldMetaBean
// There doesn't seem to be any actual documentation on this, the shape has been 
// determined by the shape it's required to have for our purposes.
export interface FieldMeta {
    readonly id: string;
    readonly key: string;
    readonly name: string;
    readonly schema: FieldSchemaMeta;
    currentValue?: any;
    renderedValue?: any;
    readonly autoCompleteUrl: string | undefined;
    readonly required: boolean;
    readonly allowedValues: any[] | undefined;
}

export function isFieldMeta(f: any): f is FieldMeta {
    return f && (<FieldMeta>f).required !== undefined;
}

export function readFieldsMeta(fields: { [k: string]: any }, fieldValues?: { [k: string]: any }, renderedFields?: { [k: string]: any }): { [k: string]: FieldMeta } {
    let metaFields: { [k: string]: FieldMeta } = {};

    Object.keys(fields).forEach(key => {
        console.log(key);
        const fieldValue: any = fieldValues ? fieldValues[key] : undefined;
        const fieldRenderedValue: any = (renderedFields && renderedFields[key]) ? renderedFields[key] : undefined;

        metaFields[key] = readFieldMeta(key, fields[key], fieldValue, fieldRenderedValue);
    });

    return metaFields;
}

export function readFieldMeta(key: string, props: any, fieldValue?: any, renderedValue?: any): FieldMeta {
    return {
        schema: readFieldSchema(props.schema),
        id: props.id,
        name: props.name,
        key: props.key ? props.key : key,
        autoCompleteUrl: props.autoCompleteUrl,
        required: props.required,
        allowedValues: props.allowedValues,
        currentValue: fieldValue,
        renderedValue: renderedValue
    };
}

// TODO: [VSCODE-555] use field meta type/items to map types for input valuess
export interface FieldSchemaMeta {
    readonly type: string;
    readonly custom: string | undefined;
    readonly system: string | undefined;
    readonly items: string | undefined;
}

function readFieldSchema(props: any): FieldSchemaMeta {
    return {
        type: props.type,
        custom: props.custom,
        system: props.system,
        items: props.items
    };
}

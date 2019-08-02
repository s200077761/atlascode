// JIRA.Schema.FieldBean
export interface Field {
    readonly id: string;
    readonly key: string;
    readonly name: string;
    readonly custom: boolean;
    readonly schema: FieldSchemaMeta | undefined;
}

export function readField(props: any) {
    return {
        id: props.id,
        key: props.key,
        name: props.name,
        custom: props.custom,
        schema: props.schema ? readFieldSchema(props.schema) : undefined
    };
}

// FieldMetaBean
// There doesn't seem to be any actual documentation on this, the shape has been 
// determined by the shape it's required to have for our purposes.
export interface FieldMeta {
    readonly schema: FieldSchemaMeta;
    readonly id: string;
    readonly name: string;
    readonly key: string;
    readonly autoCompleteUrl: string | undefined;
    readonly required: boolean;
    readonly allowedValues: any[];
}

export function readFieldsMeta(fields: { [k: string]: any }): { [k: string]: FieldMeta } {
    let metaFields: { [k: string]: FieldMeta } = {};

    Object.keys(fields).forEach(key => {
        metaFields[key] = readFieldMeta(key, fields[key]);
    });

    return metaFields;
}

export function readFieldMeta(key: string, props: any): FieldMeta {
    return {
        schema: readFieldSchema(props.schema),
        id: props.id,
        name: props.name,
        key: props.key ? props.key : key,
        autoCompleteUrl: props.autoCompleteUrl,
        required: props.required,
        allowedValues: props.allowedValues ? props.allowedValues : []
    };
}

// TODO: [VSCODE-555] use field meta type/items to map types for input values
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
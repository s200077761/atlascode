// JIRA.Schema.FieldBean
export interface Field {
    readonly id: string;
    readonly key: string;
    readonly name: string;
    readonly custom: boolean;
    readonly schema: FieldSchema | undefined;
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
    readonly schema: FieldSchema;
    readonly id: string;
    readonly name: string;
    readonly key: string;
    readonly autoCompleteUrl: string | undefined;
    readonly required: boolean;
    readonly allowedValues: string[];
}

export function readFieldMeta(props: any): FieldMeta {
    return {
        schema: readFieldSchema(props.schema),
        id: props.id,
        name: props.name,
        key: props.key,
        autoCompleteUrl: props.autoCompleteUrl,
        required: props.required,
        allowedValues: props.allowedValues
    };
}

export interface FieldSchema {
    readonly type: string;
    readonly custom: string | undefined;
    readonly system: string | undefined;
}

function readFieldSchema(props: any): FieldSchema {
    return {
        type: props.type,
        custom: props.custom,
        system: props.system
    };
}
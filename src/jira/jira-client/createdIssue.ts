import { isArray } from "util";

export interface CreatedIssue {
    readonly id: string;
    readonly key: string;
    readonly transition: NestedResponse;
}

export function readCreatedIssue(params: any): CreatedIssue {
    return {
        id: params.id,
        key: params.key,
        transition: readNestedResponse(params.transition)
    };
}

export interface NestedResponse {
    readonly status: number;
    readonly errorCollection: ErrorCollection;
}

function readNestedResponse(params: any): NestedResponse {
    return {
        status: params.status,
        errorCollection: readErrorCollection(params.errorCollection)
    };
}

export interface ErrorCollection {
    readonly status: number;
    readonly errorMessages: string[];
    readonly errors: any;
}

function readErrorCollection(params: any): ErrorCollection {
    return {
        status: params.status,
        errorMessages: isArray(params.errorMessages) ? params.errorMessages : [],
        errors: params.errors
    };
}
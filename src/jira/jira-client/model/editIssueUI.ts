import { FieldProblem, FieldUI } from "./fieldUI";

export type CommonFields = { [key: string]: FieldUI };

export interface EditMetaTransformerResult {
    problems: FieldProblem[];
    commonFields: CommonFields;
    advancedFields: FieldUI[];
}


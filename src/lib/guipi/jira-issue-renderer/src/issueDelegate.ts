import { FieldUI, SelectFieldUI } from '@atlassianlabs/jira-pi-meta-models';

// In general the FieldUI will be sufficient. In certain cases (issuelinks in particulary) it might be necessary to add
// an index to disambiguiate what is being referred to.
export type FieldReference = FieldUI & { index?: string };
export type SelectFieldReference = SelectFieldUI & { index?: string };
export interface IssueDelegate {
    /**
     * Called when the value of a field is updated
     * @param field - the FieldUI corresponding to the updated field
     * @param value - the new value for the field
     */
    fieldDidUpdate(field: FieldReference, value: any): void;

    /**
     * Called when the value typed in an autocomplete field is updated
     * @param field - the FieldUI corresponding to the updated field
     * @param value - the new value for the field
     */
    autocompleteRequest(field: SelectFieldReference, value: string): void;

    /**
     * Return true if a field is waiting for some event (i.e. an autcomplete field waiting for values)
     * @param field - the FieldUI corresponding to the updated field
     */
    isFieldWaiting(field: FieldReference): boolean;

    /**
     * Return true if a field is not valid in the current state (i.e. the project is changing)
     * @param field - the FieldUI corresponding to the updated field
     */
    isFieldDisabled(field: FieldReference): boolean;

    /**
     * Return the value to be displayed in the given field
     * @param field - the FieldUI corresponding to the requested field
     */
    valueForField(field: FieldReference, index?: string): any;

    /**
     * Return the options corresponding to a field. Can return undefined if there are no options for the field
     * (i.e. it is a text field)
     * @param field - the FieldUI corresponding to the field for which options are being requested
     */
    optionsForField(field: FieldReference): any[] | undefined;
}

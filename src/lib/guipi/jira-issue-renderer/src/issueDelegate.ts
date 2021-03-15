import { FieldUI, SelectFieldUI } from '@atlassianlabs/jira-pi-meta-models';

export interface IssueDelegate {
    /**
     * Called when the value of a field is updated
     * @param field - the FieldUI corresponding to the updated field
     * @param value - the new value for the field
     */
    fieldDidUpdate(field: FieldUI, value: string): void;

    /**
     * Called when the value typed in an autocomplete field is updated
     * @param field - the FieldUI corresponding to the updated field
     * @param value - the new value for the field
     */
    autocompleteRequest(field: SelectFieldUI, value: string): void;

    /**
     * Return true if a field is waiting for some event (i.e. an autcomplete field waiting for values)
     * @param field - the FieldUI corresponding to the updated field
     */
    isFieldWaiting(field: FieldUI): boolean;

    /**
     * Return true if a field is not valid in the current state (i.e. the project is changing)
     * @param field - the FieldUI corresponding to the updated field
     */
    isFieldDisabled(field: FieldUI): boolean;

    /**
     * Return the value to be displayed in the given field
     * @param field - the FieldUI corresponding to the requested field
     */
    valueForField(field: FieldUI): any;

    /**
     * Return the options corresponding to a field. Can return undefined if there are no options for the field
     * (i.e. it is a text field)
     * @param field - the FieldUI corresponding to the field for which options are being requested
     */
    optionsForField(field: FieldUI): any[] | undefined;
}

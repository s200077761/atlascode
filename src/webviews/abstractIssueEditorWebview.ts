import { AbstractReactWebview } from "./abstractWebview";
import { isAction } from "../ipc/messaging";
import { isFetchQuery, isOpenJiraIssue, isCreateSelectOption } from "../ipc/issueActions";
import { Container } from "../container";
import { IssuePickerIssue, IssuePickerResult, isIssuePickerResult, isAutocompleteSuggestionsResult } from "../jira/jira-client/model/responses";
import { Logger } from "../logger";
import { showIssue } from "../commands/jira/showIssue";

export abstract class AbstractIssueEditorWebview extends AbstractReactWebview {

    abstract async handleSelectOptionCreated(fieldKey: string, newValue: any): Promise<void>;

    protected formatSelectOptions(result: any): any[] {
        let suggestions: any[] = [];

        if (isIssuePickerResult(result)) {
            if (Array.isArray(result.sections)) {
                suggestions = result.sections.reduce((prev, curr) => prev.concat(curr.issues), [] as IssuePickerIssue[]);
            }
        } else if (isAutocompleteSuggestionsResult(result)) {
            suggestions = result.results.map(result => {
                return { label: result.displayName, value: result.value };
            });
        } else if (Array.isArray(result)) {
            suggestions = result;
        }
        return suggestions;
    }

    protected async onMessageReceived(msg: any): Promise<boolean> {
        let handled = await super.onMessageReceived(msg);

        if (!handled) {
            if (isAction(msg)) {
                switch (msg.action) {
                    case 'fetchIssues': {
                        //TODO: [VSCODE-588] Add nonce handling
                        handled = true;
                        if (isFetchQuery(msg)) {
                            try {
                                let client = await Container.clientManager.jirarequest(msg.site);
                                let suggestions: IssuePickerIssue[] = [];
                                if (msg.autocompleteUrl && msg.autocompleteUrl.trim() !== '') {
                                    const result: IssuePickerResult = await client.getAutocompleteDataFromUrl(msg.autocompleteUrl + msg.query);
                                    if (Array.isArray(result.sections)) {
                                        suggestions = result.sections.reduce((prev, curr) => prev.concat(curr.issues), [] as IssuePickerIssue[]);
                                    }
                                } else {
                                    suggestions = await client.getIssuePickerSuggestions(msg.query);
                                }

                                this.postMessage({ type: 'issueSuggestionsList', issues: suggestions });
                            } catch (e) {
                                Logger.error(new Error(`error posting comment: ${e}`));
                                this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error fetching issues') });
                            }
                        }
                        break;
                    }
                    case 'fetchSelectOptions': {
                        //TODO: [VSCODE-588] Add nonce handling
                        handled = true;
                        if (isFetchQuery(msg)) {
                            try {
                                let client = await Container.clientManager.jirarequest(msg.site);
                                let suggestions: any[] = [];
                                if (msg.autocompleteUrl && msg.autocompleteUrl.trim() !== '') {
                                    const result = await client.getAutocompleteDataFromUrl(msg.autocompleteUrl + msg.query);
                                    suggestions = this.formatSelectOptions(result);
                                }

                                this.postMessage({ type: 'selectOptionsList', options: suggestions });
                            } catch (e) {
                                Logger.error(new Error(`error posting comment: ${e}`));
                                this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error fetching issues') });
                            }
                        }
                        break;
                    }
                    case 'openJiraIssue': {
                        handled = true;
                        if (isOpenJiraIssue(msg)) {
                            showIssue(msg.issueOrKey);
                        }
                        break;
                    }
                    case 'createOption': {
                        handled = true;
                        if (isCreateSelectOption(msg)) {
                            try {
                                let client = await Container.clientManager.jirarequest(msg.siteDetails);
                                const result = await client.postCreateUrl(msg.createUrl, msg.createData);
                                await this.handleSelectOptionCreated(msg.fieldKey, result);
                            } catch (e) {
                                Logger.error(new Error(`error creating select option: ${e}`));
                                this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error creating select option') });
                            }
                        }
                        break;
                    }
                }
            }
        }

        return handled;
    }
}
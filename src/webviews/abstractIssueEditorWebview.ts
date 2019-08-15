import { AbstractReactWebview } from "./abstractWebview";
import { isAction } from "../ipc/messaging";
import { isFetchQuery, isOpenJiraIssue } from "../ipc/issueActions";
import { Container } from "../container";
import { IssuePickerIssue, IssuePickerResult } from "../jira/jira-client/model/responses";
import { Logger } from "../logger";
import { showIssue } from "../commands/jira/showIssue";

export abstract class AbstractIssueEditorWebview extends AbstractReactWebview {

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
                                suggestions = await client.getIssuePickerSuggestions(msg.query);
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
                    case 'openJiraIssue': {
                        handled = true;
                        if (isOpenJiraIssue(msg)) {
                            showIssue(msg.issueOrKey);
                        }
                        break;
                    }
                }
            }
        }

        return handled;
    }
}
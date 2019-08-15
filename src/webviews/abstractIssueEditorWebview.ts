import { AbstractReactWebview } from "./abstractWebview";
import { isAction } from "../ipc/messaging";
import { isFetchQuery } from "../ipc/issueActions";
import { Container } from "../container";
import { IssuePickerIssue } from "../jira/jira-client/model/responses";
import { Logger } from "../logger";

export abstract class AbstractIssueEditorWebview extends AbstractReactWebview {

    protected async onMessageReceived(msg: any): Promise<boolean> {
        let handled = await super.onMessageReceived(msg);

        if (!handled) {
            if (isAction(msg)) {
                switch (msg.action) {
                    case 'fetchIssues': {
                        handled = true;
                        if (isFetchQuery(msg)) {
                            try {
                                let client = await Container.clientManager.jirarequest(msg.site);
                                const suggestions: IssuePickerIssue[] = await client.getIssuePickerSuggestions(msg.query);
                                this.postMessage({ type: 'issueSuggestionsList', issues: suggestions });
                            } catch (e) {
                                Logger.error(new Error(`error posting comment: ${e}`));
                                this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error fetching issues') });
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
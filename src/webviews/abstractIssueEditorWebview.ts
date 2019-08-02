import { AbstractReactWebview } from "./abstractWebview";
import { CreatedSomething, IssueCreated, LabelList, UserList, IssueSuggestionsList, JqlOptionsList } from "../ipc/issueMessaging";
import { HostErrorMessage, Action } from "../ipc/messaging";

export type CommonEditorWebviewEmit = CreatedSomething | IssueCreated | HostErrorMessage | LabelList | UserList | IssueSuggestionsList | JqlOptionsList;

export abstract class AbstractIssueEditorWebview<S, R extends Action> extends AbstractReactWebview<S, R> {


}
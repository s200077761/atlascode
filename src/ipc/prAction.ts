import { Action } from "./action";

export interface PRAction extends Action {
    currentUser?: Bitbucket.Schema.User;
    pr?: Bitbucket.Schema.Pullrequest;
    commits?: Bitbucket.Schema.Commit[];
    comments?: Bitbucket.Schema.Comment[];
}

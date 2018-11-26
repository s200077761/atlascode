import { AbstractIssueTree } from "./abstractIssueTree";
import { JiraLoginTreeId } from "../../constants";
import { Commands } from "../../commands";

export class LoginTree extends AbstractIssueTree {
    constructor() {
        super(JiraLoginTreeId,undefined,"Please login to Jira", {command:Commands.AuthenticateJira,title:"Login to Jira"});
    }
}
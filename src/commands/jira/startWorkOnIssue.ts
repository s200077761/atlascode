import { Container } from "../../container";
import { isMinimalIssue, MinimalIssue, MinimalORIssueLink, IssueLinkIssue } from "../../jira/jira-client/model/entities";
import { fetchMinimalIssue } from "../../jira/fetchIssue";

export async function startWorkOnIssue(issueOrLink: MinimalORIssueLink | undefined) {
    let issue: MinimalIssue | undefined = undefined;

    if (isMinimalIssue(issueOrLink)) {
        issue = issueOrLink;
    } else {
        const linkedIssue: IssueLinkIssue = issueOrLink as IssueLinkIssue;
        issue = await fetchMinimalIssue(linkedIssue.key, linkedIssue.siteDetails);
    }

    Container.startWorkOnIssueWebview.createOrShowIssue(issue);
}


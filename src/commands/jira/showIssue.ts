import { IssuePanel } from "../../views/jira/issuePanel";
import { Atl } from "../../atlclients/clientManager";
import { JiraIssue } from "../../jira/jiraIssue";
import { Logger } from "../../logger";

export async function showIssue(extensionPath: string, issue: JiraIssue) {
  let client = await Atl.jirarequest();

  if (client) {
    await client.issue
      .getIssue({
        issueIdOrKey: issue.key,
        expand: "",
        fields: JiraIssue.fields
      })
      .then((res: JIRA.Response<JIRA.Schema.IssueBean>) => {
        IssuePanel.createOrShow(extensionPath, JiraIssue.readIssue(res.data));
      })
      .catch((reason: any) => {
        Logger.error(reason);
      });
  }
}

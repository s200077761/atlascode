import { configuration } from "../../config/configuration";
import { JiraOutlineProvider } from "../../views/jira/jiraOutlineProvider";
import { JiraWorkingProjectConfigurationKey } from "../../constants";

export async function refreshExplorer(
  assignedOutline: JiraOutlineProvider,
  openOutline: JiraOutlineProvider
) {
  const project = configuration.get(JiraWorkingProjectConfigurationKey, null);
  if (project) {
    assignedOutline.setJql(`assignee=currentUser() and project=${project} and statusCategory in ("In Progress")`);
    openOutline.setJql(`assignee in (EMPTY) and project=${project} order by lastViewed DESC`);
  } else {
    assignedOutline.setJql('assignee=currentUser() and statusCategory in ("In Progress")');
    openOutline.setJql("assignee in (EMPTY) order by lastViewed DESC");
  }
}

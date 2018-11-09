import * as vscode from "vscode";
import { Atl } from "../../atlclients/clientManager";
import { configuration } from "../../config/configuration";
import { JiraWorkingProjectConfigurationKey } from "../../constants";
import { Project, isProject, projectFromJsonObject } from "../../jira/jiraModel";
import { Logger } from "../../logger";
import { Commands } from "../../commands";

export async function showProjectSelectionDialog() {
  getProjects().then(projects => {
    vscode.window
      .showQuickPick(projects.map(project => project.name), {
        placeHolder: "Select a project"
      })
      .then(result => {
        const selected = projects.find(proj => proj.name === result);
        if (selected) {
          saveWorkingProject(selected);
        }
      });
  });
}

function saveWorkingProject(project: Project) {
  configuration.update(JiraWorkingProjectConfigurationKey, project.id, vscode.ConfigurationTarget.Workspace)
  .then(() => vscode.commands.executeCommand(Commands.RefreshExplorer))
  .catch(reason => {
      Logger.debug(`Failed to save working project: ${reason}`);
  });
}

async function getProjects(): Promise<Project[]> {
  let client = await Atl.jirarequest();

  if (client) {
    return client.project
      .getProjectsPaginated({})
      .then((res: JIRA.Response<JIRA.Schema.PageBeanProjectBean>) => {
        return readProjects(res.data.values);
      });
  }

  return Promise.reject();
}

function readProjects(projects: JIRA.Schema.ProjectBean[] | undefined): Project[] {

  if (projects) {
    return projects
      .filter(project => isProject(project))
      .map(project => projectFromJsonObject(project));
  }

  return [];
}

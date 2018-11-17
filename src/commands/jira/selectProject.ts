import * as vscode from "vscode";
import { Container } from "../../container";
import { configuration } from "../../config/configuration";
import { JiraWorkingProjectConfigurationKey } from "../../constants";
import { Project, isProject, projectFromJsonObject } from "../../jira/jiraModel";
import { Logger } from "../../logger";

export async function showProjectSelectionDialog() {
  getProjects().then(projects => {
    vscode.window
      .showQuickPick(projects.map(project => project.name), {
        placeHolder: "Select a project"
      })
      .then(async (result) => {
        const selected = projects.find(proj => proj.name === result);
        if (selected) {
          await saveWorkingProject(selected);
        }
      });
  });
}

async function saveWorkingProject(project: Project) {
  Logger.debug("saving project to config", project.id);
  await configuration.updateEffective(JiraWorkingProjectConfigurationKey, project.id)
  .catch(reason => {
    Logger.debug("rejected config update", reason);
  });
}

async function getProjects(): Promise<Project[]> {
  let client = await Container.clientManager.jirarequest();

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

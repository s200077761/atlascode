import * as vscode from "vscode";
import { Container } from "../../container";
import { configuration } from "../../config/configuration";
import { JiraWorkingProjectConfigurationKey } from "../../constants";
import { Project } from "../../jira/jiraModel";
import { Logger } from "../../logger";
import { projectSelectedEvent } from "../../analytics";

export async function showProjectSelectionDialog() {
  const projects = await Container.jiraSiteManager.getProjects();
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
}

async function saveWorkingProject(project: Project) {
  Logger.debug("saving project to config", project.id);
  await configuration.updateEffective(JiraWorkingProjectConfigurationKey, project.id)
  .catch(reason => {
    Logger.debug("rejected config update", reason);
  });

  projectSelectedEvent(project.id, Container.jiraSiteManager.effectiveSite.id).then(e => {Container.analyticsClient.sendTrackEvent(e); });
}


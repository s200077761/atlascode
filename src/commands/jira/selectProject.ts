import * as vscode from "vscode";
import { Container } from "../../container";
import { configuration } from "../../config/configuration";
import { JiraWorkingProjectConfigurationKey } from "../../constants";
import {
  Project,
  isProject,
  projectFromJsonObject
} from "../../jira/jiraModel";
import { Logger } from "../../logger";
import { projectSelectedEvent } from "../../analytics";
import debounce from "lodash.debounce";

export async function showProjectSelectionDialog() {
  const projects = await Container.jiraSiteManager.getProjects();

  const quickPick: vscode.QuickPick<ProjectQuickPickItem> = vscode.window.createQuickPick();
  quickPick.placeholder = "Select a project";
  quickPick.items = projects.map((proj: Project) => {
    return new ProjectQuickPickItem(proj);
  });

  quickPick.onDidChangeSelection((items: ProjectQuickPickItem[]) => {
    if (items.length > 0) {
      saveWorkingProject(items[0].project)
        .then(() => { quickPick.hide(); });
    }
  });

  quickPick.onDidChangeValue(debounce((value: string) => {
    quickPick.busy = true;
    fetchProjectsMatching(value).then(items => {
      quickPick.busy = false;
      if (items) {
        quickPick.items = items;
        quickPick.show();
      }
    }).catch((e: any) => {
      Logger.error(new Error(`Error while fetching projects: ${e}`));
      vscode.window.showErrorMessage("Fetching available projects failed.");
      quickPick.busy = false;
    });
  }, 400));
  quickPick.show();
}

async function fetchProjectsMatching(value: string): Promise<ProjectQuickPickItem[] | undefined> {
  const client = await Container.clientManager.jirarequest();

  if (client) {
    const res = await client.project.getProjectsPaginated({ query: value });
    const projectObjects = res.data.values;
    if (projectObjects) {
      return projectObjects
        .filter(project => isProject(project))
        .map(project => {
          const p = projectFromJsonObject(project);
          return new ProjectQuickPickItem(p);
        });
    } else {
      return Promise.resolve(undefined);
    }
  }
  return Promise.resolve(undefined);
}

async function saveWorkingProject(project: Project) {
  await configuration
    .updateEffective(JiraWorkingProjectConfigurationKey, {
      id: project.id,
      name: project.name,
      key: project.key
    })
    .catch(reason => {
      Logger.debug("rejected config update", reason);
    });

  projectSelectedEvent(
    project.id,
    Container.jiraSiteManager.effectiveSite.id
  ).then(e => {
    Container.analyticsClient.sendTrackEvent(e);
  });
}

class ProjectQuickPickItem implements vscode.QuickPickItem {
  public label: string;
  public description: string;

  constructor(public project: Project) {
    this.label = this.project.name;
    this.description = this.project.key;
  }
}

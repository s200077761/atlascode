import * as vscode from "vscode";
import { Container } from "../../container";
import { configuration } from "../../config/configuration";
import { Logger } from "../../logger";
import { projectSelectedEvent } from "../../analytics";
import debounce from "lodash.debounce";
import { ProductJira, DetailedSiteInfo } from "../../atlclients/authInfo";
import { Project, readProject } from "../../jira/jira-client/model/entities";

export async function showProjectSelectionDialog() {
  const projects = await Container.jiraProjectManager.getProjects();

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
  const client = await Container.clientManager.jiraClient(Container.siteManager.effectiveSite(ProductJira));

  if (client) {
    const res = await client.getProjects(value);
    const projectObjects = res;
    if (projectObjects) {
      return projectObjects
        .map(project => {
          const p = readProject(project);
          return new ProjectQuickPickItem(p);
        });
    } else {
      return Promise.resolve(undefined);
    }
  }
  return Promise.resolve(undefined);
}

async function saveWorkingProject(project: Project) {
  const site: DetailedSiteInfo = Container.siteManager.effectiveSite(ProductJira);
  const defaultProjects = Container.config.jira.defaultProjects;
  defaultProjects[site.id] = project.key;

  await configuration
    .setDefaultProjects(defaultProjects)
    .catch(reason => {
      Logger.debug("rejected config update", reason);
    });

  projectSelectedEvent(
    Container.siteManager.effectiveSite(ProductJira),
    project.id,
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

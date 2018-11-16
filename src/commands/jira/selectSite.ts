import * as vscode from "vscode";
import * as authinfo from '../../atlclients/authInfo';
import { Container } from '../../container';
import { configuration } from "../../config/configuration";
import { Logger } from "../../logger";
import { JiraWorkingSiteConfigurationKey, JiraWorkingProjectConfigurationKey } from "../../constants";

export async function showSiteSelectionDialog() {
  Container.authManager.getAuthInfo(authinfo.AuthProvider.JiraCloud).then((info:authinfo.AuthInfo|undefined) => {
        if(!info) {
          // TODO: show login propmpt.
          return;
        }
        vscode.window
        .showQuickPick(info.accessibleResources!.map(site => site.name), {
          placeHolder: "Select a site"
        })
        .then(result => {
          const selected = info.accessibleResources!.find(site => site.name === result);
          if (selected) {
            saveWorkingSite(selected);
          }
        });
    });
}

async function saveWorkingSite(site: authinfo.AccessibleResource) {
  Logger.debug('saving site',site);
  await configuration.updateEffective(JiraWorkingSiteConfigurationKey, site)
  .then(async () => {
    Logger.debug('clearing current project');
    await configuration.updateEffective(JiraWorkingProjectConfigurationKey, undefined);
  })
  .then(() => {
    vscode.commands.executeCommand('atlascode.jira.refreshExplorer');
  })
  .catch(reason => {
      Logger.debug(`Failed to save working site: ${reason}`);
  });
}


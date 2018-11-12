import * as vscode from "vscode";
import * as authinfo from '../../atlclients/authInfo';
import { AuthStore } from '../../atlclients/authStore';
import { configuration } from "../../config/configuration";
import { Logger } from "../../logger";
import { JiraWorkingSiteConfigurationKey } from "../../constants";

export async function showSiteSelectionDialog() {
    AuthStore.getAuthInfo(authinfo.AuthProvider.JiraCloud).then((info:authinfo.AuthInfo|undefined) => {
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

function saveWorkingSite(site: authinfo.AccessibleResource) {
  configuration.update(JiraWorkingSiteConfigurationKey, site, vscode.ConfigurationTarget.Workspace)
  .then(() => vscode.commands.executeCommand('atlascode.jira.refreshExplorer') )
  .catch(reason => {
      Logger.debug(`Failed to save working site: ${reason}`);
  });
}


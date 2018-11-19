import { commands, window } from "vscode";
import { AuthInfo, AuthProvider, AccessibleResource } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { configuration } from "../../config/configuration";
import { Logger } from "../../logger";
import { JiraWorkingSiteConfigurationKey, JiraWorkingProjectConfigurationKey } from "../../constants";
import { Commands } from "../../commands";

export async function showSiteSelectionDialog() {
  Container.authManager.getAuthInfo(AuthProvider.JiraCloud).then((info:AuthInfo|undefined) => {
        if(!info) {
          // TODO: show login propmpt.
          return;
        }
        window
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

async function saveWorkingSite(site: AccessibleResource) {
  Logger.debug('saving site',site);
  await configuration.updateEffective(JiraWorkingSiteConfigurationKey, site)
  .then(async () => {
    Logger.debug('clearing current project');
    if(Container.config.jira.workingProject) {
      await configuration.updateEffective(JiraWorkingProjectConfigurationKey, undefined);
    } else {
      commands.executeCommand(Commands.RefreshJiraExplorer);
    }
    
  });
}


import { commands, window } from "vscode";
import { AccessibleResource } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { configuration } from "../../config/configuration";
import { Logger } from "../../logger";
import { JiraWorkingSiteConfigurationKey, JiraWorkingProjectConfigurationKey } from "../../constants";
import { Commands } from "../../commands";
import { siteSelectedEvent } from "../../analytics";

export async function showSiteSelectionDialog() {
  const sites = await Container.jiraSiteManager.getSitesAvailable();
        window
        .showQuickPick(sites.map(site => site.name), {
          placeHolder: "Select a site"
        })
        .then(result => {
          const selected = sites.find(site => site.name === result);
          if (selected) {
            saveWorkingSite(selected);
          }
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
    
    siteSelectedEvent(site.id).then(e => {Container.analyticsClient.sendTrackEvent(e); });
  });
}


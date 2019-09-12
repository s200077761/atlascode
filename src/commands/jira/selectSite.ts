import { commands, window } from "vscode";
import { ProductJira, DetailedSiteInfo } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { configuration } from "../../config/configuration";
import { Commands } from "../../commands";
import { siteSelectedEvent } from "../../analytics";

export async function showSiteSelectionDialog() {
  const sites = await Container.siteManager.getSitesAvailable(ProductJira);
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

async function saveWorkingSite(site: DetailedSiteInfo) {
  await configuration.setDefaultSite(site.id)
    .then(async () => {
      commands.executeCommand(Commands.RefreshJiraExplorer);

      siteSelectedEvent(site).then(e => { Container.analyticsClient.sendTrackEvent(e); });
    });
}


import * as vscode from "vscode";
import { MinimalIssueOrKeyAndSiteOrKey, isIssueKeyAndSite, Transition, isMinimalIssue } from "./jira-client/model/entities";
import { DetailedSiteInfo, emptySiteInfo, ProductJira } from "../atlclients/authInfo";
import { Container } from "../container";
import { Logger } from "../logger";
import { Commands } from "../commands";
import { issueTransitionedEvent } from "../analytics";

export async function transitionIssue(issueOrKey: MinimalIssueOrKeyAndSiteOrKey, transition: Transition) {
    let issueKey: string = "";
    let site: DetailedSiteInfo = emptySiteInfo;

    if (isMinimalIssue(issueOrKey)) {
        issueKey = issueOrKey.key;
        site = issueOrKey.siteDetails;
    } else {
        if (isIssueKeyAndSite(issueOrKey)) {
            issueKey = issueOrKey.key;
            site = issueOrKey.siteDetails;
        } else {
            issueKey = issueOrKey;
            site = Container.siteManager.effectiveSite(ProductJira);
        }
    }

    try {
        await performTranstion(issueKey, transition, site);
        return;
    }
    catch (e) {
        Logger.error(e);
        throw e;
    }
}

async function performTranstion(issueKey: string, transition: Transition, site: DetailedSiteInfo) {
    try {
        const client = await Container.clientManager.jiraClient(site);
        await client.transitionIssue(issueKey, transition.id);

        vscode.commands.executeCommand(Commands.RefreshJiraExplorer)
            .then(b => {
                Container.jiraIssueViewManager.refreshAll();
            });

        issueTransitionedEvent(site, issueKey).then(e => { Container.analyticsClient.sendTrackEvent(e); });
    }
    catch (err) {
        Logger.error(err);
        throw err;
    }
}

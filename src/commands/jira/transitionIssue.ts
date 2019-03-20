import * as vscode from "vscode";

import { Logger } from "../../logger";
import { Issue, Transition, emptyIssue, isIssue } from "../../jira/jiraModel";
import { Commands } from "../../commands";
import { Container } from "../../container";
import { IssueNode } from "../../views/nodes/issueNode";
import { issueTransitionedEvent } from "../../analytics";

export async function transitionIssue(param: Issue | IssueNode, transition?: Transition) {
  let issue: Issue = emptyIssue;

  if (isIssue(param)) {
    issue = param;
  } else {
    issue = param.issue;
  }
  if (!issue.transitions) {
    throw new Error(`${issue.key} - There are no valid states into which this issue can be transitioned.`);
  }

  if (transition) {
    try {
      await performTranstion(issue, transition);
      return;
    }
    catch (e) {
      Logger.error(e);
      throw e;
    }
  }

  const names = issue.transitions
    .filter(transition => isValidTransition(issue, transition))
    .map(transition => transition.name) as string[];
  vscode.window
    .showQuickPick(names, {
      placeHolder: "Transition to status"
    })
    .then(result => {
      const selected = issue.transitions!.find(transition => transition.name === result);
      if (selected) {
        performTranstion(issue, selected)
          .catch(reason => {
            Logger.error(reason);
            throw reason;
          });
      }
    });
}

function isValidTransition(issue: Issue, transition: Transition): boolean {
  return transition.name !== undefined &&
    !transition.hasScreen &&
    transition.to !== undefined &&
    issue.status !== undefined &&
    transition.to.id !== issue.status.id;
}

async function performTranstion(issue: Issue, transition: Transition) {
  let client = await Container.clientManager.jirarequest(issue.workingSite);

  if (client) {
    try {
      await client.issue.transitionIssue({ issueIdOrKey: issue.key, body: { transition: { id: transition.id } } });

      vscode.commands.executeCommand(Commands.RefreshJiraExplorer)
        .then(b => {
          Container.jiraIssueViewManager.refreshAll();
        });

      issueTransitionedEvent(issue.key, Container.jiraSiteManager.effectiveSite.id).then(e => { Container.analyticsClient.sendTrackEvent(e); });
    }
    catch (err) {
      Logger.error(err);
      throw err;
    }
  }
}

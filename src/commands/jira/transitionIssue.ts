import * as vscode from "vscode";

import { Logger } from "../../logger";
import { Issue, Transition } from "../../jira/jiraModel";
import { Atl } from "../../atlclients/clientManager";
import { Commands } from "../../commands";
import { Container } from "../../container";

export async function transitionIssue(issue: Issue, transition?:Transition) {

  if (!issue.transitions) {
    vscode.window.showInformationMessage('There are no valid states into which this issue can be transitioned.');
    return;
  }

  if(transition) {
    performTranstion(issue,transition);
    return;
  }

  const names = issue.transitions
    .filter(transition => isValidTransition(issue, transition))
    .map(transition => transition.name) as string[];
  vscode.window
    .showQuickPick(names, {
      placeHolder: "Transition to status"
    })
    .then(result => {
      const selected = issue.transitions!.find(
        transition => transition.name === result
      );
      if (selected) {
        Logger.debug(selected);
        performTranstion(issue, selected);
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

async function performTranstion(issue: Issue,transition: Transition) {
  let client = await Atl.jirarequest();

  if (client) {
    client.issue.doTransition({
        issueIdOrKey: issue.key,
        body: { transition: { id: transition.id } }
      }).then(() => {
        vscode.commands.executeCommand(Commands.RefreshExplorer).then(b => {
          Container.jiraIssueViewManager.refreshAll();
        });
      }).catch((err: any) => {
        Logger.error(err);
      });
  }
}

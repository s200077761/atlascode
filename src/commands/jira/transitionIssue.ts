import * as vscode from "vscode";

import { Logger } from "../../logger";
import { JiraIssue } from "../../jira/jiraIssue";
import { Atl } from "../../atlclients/clientManager";
import { Commands } from "../../commands";

export async function transitionIssue(issue: JiraIssue) {
  Logger.debug(issue);
  if (!issue.transitions) {
    vscode.window.showInformationMessage('There are no valid states into which this issue can be transitioned.');
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

function isValidTransition(issue: JiraIssue, transition: JIRA.Schema.TransitionBean): boolean {
  return transition.name !== undefined && 
  !transition.hasScreen && 
  transition.to !== undefined && 
  issue.status !== undefined &&
  transition.to.id !== issue.status.id;
}

async function performTranstion(
  issue: JiraIssue,
  transition: JIRA.Schema.TransitionBean
) {
  let client = await Atl.jirarequest();

  if (client) {
    client.issue
      .doTransition({
        issueIdOrKey: issue.key,
        body: { transition: { id: transition.id } }
      })
      .then(() => {
        vscode.commands.executeCommand(Commands.RefreshExplorer);
      })
      .catch((err: any) => {
        Logger.error(err);
      });
  }
}

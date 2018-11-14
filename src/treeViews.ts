import * as vscode from "vscode";

import { JiraOutlineProvider } from "./views/jira/jiraOutlineProvider";

export function registerJiraTreeViews(context: vscode.ExtensionContext, providers:{id: string, provider: JiraOutlineProvider}[]) {
    providers.forEach(({id, provider}) => {
        context.subscriptions.push(
            vscode.window
              .createTreeView(id, { treeDataProvider: provider })
              .onDidChangeVisibility(e => provider.onDidChangeVisibility(e))
          );
    });
}
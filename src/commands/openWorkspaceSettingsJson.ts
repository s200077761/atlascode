/*
this code is originally from https://github.com/Naturalclar/workspaceSettings
*/

import * as vscode from 'vscode';
import * as path from 'path';

export function openWorkspaceSettingsJson() {
    if (!vscode.workspace.rootPath) {
        return;
    }
    const editor = new vscode.WorkspaceEdit();

    // set filepath for settings.json
    const filePath = path.join(
        vscode.workspace.rootPath,
        ".vscode",
        "settings.json"
    );

    const openPath = vscode.Uri.file(filePath);
    // create settings.json if it does not exist
    editor.createFile(openPath, { ignoreIfExists: true });
    // open workspace settings.json
    vscode.workspace.applyEdit(editor).then(() => {
        vscode.workspace.openTextDocument(openPath).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    });
}

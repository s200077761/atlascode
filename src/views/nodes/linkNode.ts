import vscode, { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { Commands } from '../../commands';
import { iconSet, Resources } from '../../resources';
import { AbstractBaseNode } from './abstractBaseNode';

export class LinkNode extends AbstractBaseNode {
    constructor(
        readonly _message: string,
        readonly description: string,
        readonly icon: iconSet,
        readonly uriString: string
    ) {
        super();
    }

    getTreeItem() {
        const text = this._message;
        const node = new TreeItem(text, TreeItemCollapsibleState.None);
        node.tooltip = text;
        node.description = this.description;
        node.resourceUri = vscode.Uri.parse(this.uriString);
        node.iconPath = Resources.icons.get(this.icon);
        node.command = {
            command: Commands.ViewInWebBrowser,
            title: '',
            arguments: [this],
        };

        return node;
    }
}

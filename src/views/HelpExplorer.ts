import { Disposable } from 'vscode';
import { HelpTreeViewId } from '../constants';
import { FocusEvent } from '../webview/ExplorerFocusManager';
import { Explorer } from './Explorer';
import { HelpDataProvider } from './helpDataProvider';

export class HelpExplorer extends Explorer implements Disposable {
    constructor() {
        super(() => this.dispose());
        this.treeDataProvider = new HelpDataProvider();
        this.newTreeView();
    }

    viewId(): string {
        return HelpTreeViewId;
    }

    product() {
        return { name: 'N/A', key: 'N/A' };
    }

    dispose() {
        super.dispose();
    }

    async handleFocusEvent(e: FocusEvent) {
        //No focus available for now
    }
}

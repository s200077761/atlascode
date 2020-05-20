import vscode from 'vscode';
import { ProductBitbucket, ProductJira, SiteInfo } from '../../atlclients/authInfo';
import { CustomJQLTreeId, PullRequestTreeViewId } from '../../constants';

export function focusExplorerForSite(site: SiteInfo) {
    if (site.product.key === ProductJira.key) {
        vscode.commands.executeCommand(`${CustomJQLTreeId}.focus`);
    } else if (site.product.key === ProductBitbucket.key) {
        vscode.commands.executeCommand(`${PullRequestTreeViewId}.focus`);
    }
}

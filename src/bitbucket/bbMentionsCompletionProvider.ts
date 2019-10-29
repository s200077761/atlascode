import { CompletionItem, CompletionItemKind, CompletionItemProvider, Position, TextDocument, window } from 'vscode';
import { PRFileDiffQueryParams } from '../views/pullrequest/pullRequestNode';
import { PullRequestNodeDataProvider } from '../views/pullRequestNodeDataProvider';
import { clientForSite } from './bbUtils';


export class BitbucketMentionsCompletionProvider implements CompletionItemProvider {

    async provideCompletionItems(doc: TextDocument, pos: Position) {
        const activePullRequestUri = window.visibleTextEditors
            .map(textEditor => textEditor.document.uri)
            .find(uri => uri.scheme === PullRequestNodeDataProvider.SCHEME);

        if (!activePullRequestUri) {
            return;
        }

        const { site, participants } = JSON.parse(activePullRequestUri.query) as PRFileDiffQueryParams;
        const bbApi = await clientForSite(site);
        const triggerWord = doc.getText(doc.getWordRangeAtPosition(pos));
        const users = await bbApi.pullrequests.getReviewers(site, triggerWord);
        if (users.length === 0) {
            users.push(...participants);
        }

        return users.map(user => {
            const item = new CompletionItem(user.displayName, CompletionItemKind.Constant);
            item.detail = user.mention;
            // Remove `@` as it is included in user input already
            item.insertText = user.mention.slice(1);
            item.filterText = triggerWord;
            return item;
        });
    }
}
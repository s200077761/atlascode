import {
    window, CompletionItemProvider, TextDocument, Position, CompletionItem, CompletionItemKind
} from 'vscode';
import { FileDiffQueryParams } from '../views/pullrequest/pullRequestNode';
import { clientForRemote } from './bbUtils';
import { PullRequestNodeDataProvider } from '../views/pullRequestNodeDataProvider';


export class BitbucketMentionsCompletionProvider implements CompletionItemProvider {

    async provideCompletionItems(doc: TextDocument, pos: Position) {
        const activePullRequestUri = window.visibleTextEditors
            .map(textEditor => textEditor.document.uri)
            .find(uri => uri.scheme === PullRequestNodeDataProvider.SCHEME);

        if (!activePullRequestUri) {
            return;
        }

        const queryParams = JSON.parse(activePullRequestUri.query) as FileDiffQueryParams;
        const bbApi = await clientForRemote(queryParams.remote);
        const triggerWord = doc.getText(doc.getWordRangeAtPosition(pos));
        const users = await bbApi.pullrequests.getReviewers(queryParams.remote, triggerWord);
        if (users.length === 0) {
            users.push(...queryParams.participants);
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
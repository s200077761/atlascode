import { AbstractMultiViewManager } from './multiViewManager';
import { BitbucketIssueWebview } from "./bitbucketIssueWebview";

export class BitbucketIssueViewManager extends AbstractMultiViewManager<Bitbucket.Schema.Issue> {
    constructor(extensionPath: string) {
        super(extensionPath);
    }

    dataKey(data: Bitbucket.Schema.Issue): string {
        return (data.links!.self!.href!);
    }

    createView(extensionPath: string) {
        return new BitbucketIssueWebview(extensionPath);
    }
}
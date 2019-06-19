import { AbstractMultiViewManager } from './multiViewManager';
import { BitbucketIssueWebview } from "./bitbucketIssueWebview";
import { BitbucketIssue } from '../bitbucket/model';

export class BitbucketIssueViewManager extends AbstractMultiViewManager<BitbucketIssue> {
    constructor(extensionPath: string) {
        super(extensionPath);
    }

    dataKey(data: BitbucketIssue): string {
        return (data.links!.self!.href!);
    }

    createView(extensionPath: string) {
        return new BitbucketIssueWebview(extensionPath);
    }
}
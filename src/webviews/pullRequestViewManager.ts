
import {  PullRequestWebview } from './pullRequestWebview';
import { AbstractMultiViewManager } from './multiViewManager';
import { PullRequestDecorated } from '../bitbucket/model';

// PullRequestViewManager manages views for PR details.
export class PullRequestViewManager extends AbstractMultiViewManager<PullRequestDecorated> {

    dataKey(data: PullRequestDecorated): string {
        return data.data.links!.self!.href!;
    }

    createView(extensionPath: string) {
        return new PullRequestWebview(extensionPath);
    }

}
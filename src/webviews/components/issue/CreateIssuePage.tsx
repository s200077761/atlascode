import * as React from 'react';
import { Action } from "../../../ipc/messaging";
import { WebviewComponent } from "../WebviewComponent";
import { CreateIssueData } from '../../../ipc/issueMessaging';

type Emit = Action;
export default class CreateIssuePage extends WebviewComponent<Emit, CreateIssueData, {},{}> {
    constructor(props: any) {
        super(props);
    }

    onMessageReceived(e:CreateIssueData): void {
        console.log("got screen data", e);
    }
    
    public render() {
        return (<div>create issue</div>);
    }
}

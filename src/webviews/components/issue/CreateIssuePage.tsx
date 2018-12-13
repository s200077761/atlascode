import * as React from 'react';
import { Action } from "../../../ipc/messaging";
import { WebviewComponent } from "../WebviewComponent";

type Emit = Action;
export default class CreateIssuePage extends WebviewComponent<Emit, {}, {},{}> {
    constructor(props: any) {
        super(props);
    }

    onMessageReceived(e: {}): void {
        console.log("Method not implemented.", e);
    }
    
    public render() {
        return (<div>create issue</div>);
    }
}

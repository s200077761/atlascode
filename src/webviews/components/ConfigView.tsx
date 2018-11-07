import * as React from 'react';
import { WebviewComponent } from './WebviewComponent';
import { Action } from '../../ipc/messaging';
import { IConfig } from '../../config/model';

export default class ConfigView extends WebviewComponent<Action, IConfig, {},{}> {
    constructor(props: any) {
        super(props);
    }

    public render() {
        return <div>Config View!</div>;
    }

    public onMessageReceived(e: IConfig) {

    }
}
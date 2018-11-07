import * as React from 'react';
import { Action } from '../../ipc/messaging';

interface VsCodeApi {
    postMessage(msg: {}): void;
    setState(state: {}): void;
    getState(): {};
}

declare function acquireVsCodeApi(): VsCodeApi;

export interface WebviewComponent<A extends Action, R, P = {}, S = {}> extends React.Component<P,S> { }
// WebviewComponent is the base React component for creating a webview in vscode.
// This handles comms between vscode and react.
// Generic Types:
// A = the type of ipc.Action(s) to send to vscode
// R = the type of ipc.Message(s) we can recieve
// P = the type of react properties
// S = the type of react state
export abstract class WebviewComponent<A extends Action,R,P,S> extends React.Component<P,S> {
    private readonly _api: VsCodeApi;

    constructor(props: Readonly<P>) {
        super(props);
        this._api = acquireVsCodeApi();

        const onMessageEvent = this.onMessageEvent.bind(this);
        window.addEventListener('message', onMessageEvent);
    }

    private onMessageEvent(e:MessageEvent) {
        const msg = e.data as R;
        this.onMessageReceived(msg);
    }

    abstract onMessageReceived(e: R):void;

    protected postMessage(e: A) {
        this._api.postMessage(e);
    }

}
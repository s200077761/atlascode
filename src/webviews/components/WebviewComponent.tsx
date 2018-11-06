import * as React from 'react';
import { Action } from '../../ipc/action';

interface VsCodeApi {
    postMessage(msg: {}): void;
    setState(state: {}): void;
    getState(): {};
}

declare function acquireVsCodeApi(): VsCodeApi;

export interface WebviewComponent<A extends Action, R, P = {}, S = {}> extends React.Component<P,S> { }
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
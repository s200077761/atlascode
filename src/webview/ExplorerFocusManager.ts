import { EventEmitter, Event, Disposable } from 'vscode';

export enum FocusEventActions {
    CREATEISSUE = 'Create an issue',
    VIEWISSUE = 'View an issue',
    CREATEPULLREQUEST = 'Create a pull request',
    VIEWPULLREQUEST = 'View a pull request',
}

export type FocusEvent = {
    action: FocusEventActions;
    openNode?: boolean;
};

export class ExplorerFocusManager extends Disposable {
    private _onFocusEvent = new EventEmitter<FocusEvent>();
    constructor() {
        super(() => this.dispose());
    }

    fireEvent(eventType: FocusEventActions, openNode?: boolean) {
        this._onFocusEvent.fire({
            action: eventType,
            openNode: openNode,
        });
    }

    public get onFocusEvent(): Event<FocusEvent> {
        return this._onFocusEvent.event;
    }

    dispose() {
        this._onFocusEvent.dispose();
    }
}

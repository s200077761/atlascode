import { AbstractReactWebview } from './abstractWebview';
import { IConfig } from '../config/model';
import { Action } from '../ipc/action';

export class ConfigWebview extends AbstractReactWebview<IConfig,Action> {
	
    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "AtlasCode Settings";
    }
    public get id(): string {
        return "configView";
    }

    public invalidate() {
        return;
    }
}
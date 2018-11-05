import { AbstractReactWebview } from './abstractWebview';

export class ConfigWebview extends AbstractReactWebview {
	
    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "AtlasCode Settings";
    }
    public get id(): string {
        return "configView";
    }
}
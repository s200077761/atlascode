import { AbstractReactWebview } from './abstractWebview';
import { Action } from '../ipc/messaging';
import { commands } from 'vscode';
import { Commands } from '../commands';
import { Logger } from '../logger';

export class WelcomeWebview extends AbstractReactWebview<{},Action> {
	
    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "AtlasCode Welcome";
    }
    public get id(): string {
        return "welcomeView";
    }

    public async invalidate() {
        
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);

        if(!handled) {
            switch (e.action) {
                case 'showConfigPage': {
                    Logger.debug('got showConfig request from webview',e);
                    handled = true;
                    commands.executeCommand(Commands.ShowConfigPage);
                    break;
                }
            }
        }

        return handled;
    }
}
import { AbstractReactWebview } from './abstractWebview';
import { Action } from '../ipc/messaging';
import { commands, Uri } from 'vscode';
import { Commands } from '../commands';
import { Logger } from '../logger';
import { isSubmitFeedbackAction } from '../ipc/configActions';
import { submitFeedback } from './feedbackSubmitter';

export class WelcomeWebview extends AbstractReactWebview<{},Action> {
	
    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "AtlasCode Welcome";
    }
    public get id(): string {
        return "atlascodeWelcomeScreen";
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
                case 'sourceLink': {
                    handled = true;
                    commands.executeCommand('vscode.open', Uri.parse(`https://bitbucket.org/atlassianlabs/atlascode`));
                    break;
                }
                case 'helpLink': {
                    handled = true;
                    commands.executeCommand('vscode.open', Uri.parse(`https://applink.atlassian.com/stride/a436116f-02ce-4520-8fbb-7301462a1674/chat/20317f63-2ed0-40d2-86b2-7611fa9b0035`));
                    break;
                }
                case 'submitFeedback': {
                    handled = true;
                    if(isSubmitFeedbackAction(e)){
                        submitFeedback(e.feedback, 'atlascodeWelcomeScreen');
                    }
                    break;
                }
            }
        }

        return handled;
    }
}
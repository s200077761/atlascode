import { AbstractReactWebview } from './abstractWebview';
import { Action } from '../ipc/messaging';
import { commands, Uri } from 'vscode';
import { Commands } from '../commands';
import { isSubmitFeedbackAction } from '../ipc/configActions';
import { submitFeedback, getFeedbackUser } from './feedbackSubmitter';
import { DetailedSiteInfo } from '../atlclients/authInfo';

export class WelcomeWebview extends AbstractReactWebview {

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Atlassian Welcome";
    }
    public get id(): string {
        return "atlascodeWelcomeScreen";
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        return undefined;
    }

    public async invalidate() {
        const currentUser = await getFeedbackUser();

        this.postMessage({
            type: 'update',
            feedbackUser: currentUser
        });
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);

        if (!handled) {
            switch (e.action) {
                case 'showConfigPage': {
                    handled = true;
                    commands.executeCommand(Commands.ShowConfigPage);
                    break;
                }
                case 'sourceLink': {
                    handled = true;
                    commands.executeCommand('vscode.open', Uri.parse(`https://bitbucket.org/atlassianlabs/atlascode`));
                    break;
                }
                case 'issueLink': {
                    handled = true;
                    commands.executeCommand('vscode.open', Uri.parse(`https://bitbucket.org/atlassianlabs/atlascode/issues`));
                    break;
                }
                case 'docsLink': {
                    handled = true;
                    commands.executeCommand('vscode.open', Uri.parse(`https://confluence.atlassian.com/display/BITBUCKET/Atlassian+For+VSCode`));
                    break;
                }
                case 'submitFeedback': {
                    handled = true;
                    if (isSubmitFeedbackAction(e)) {
                        submitFeedback(e.feedback, 'atlascodeWelcomeScreen');
                    }
                    break;
                }
            }
        }

        return handled;
    }
}

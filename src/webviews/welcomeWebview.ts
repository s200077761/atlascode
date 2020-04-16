import { commands, env, Uri } from 'vscode';
import { DetailedSiteInfo, Product } from '../atlclients/authInfo';
import { Commands } from '../commands';
import { isSubmitFeedbackAction } from '../ipc/configActions';
import { Action } from '../ipc/messaging';
import { AbstractReactWebview } from './abstractWebview';
import { getFeedbackUser, submitFeedback } from './feedbackSubmitter';

export class WelcomeWebview extends AbstractReactWebview {
    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return 'Atlassian Welcome';
    }
    public get id(): string {
        return 'atlascodeWelcomeScreen';
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        return undefined;
    }

    public get productOrUndefined(): Product | undefined {
        return undefined;
    }

    public async invalidate() {
        const currentUser = await getFeedbackUser();

        this.postMessage({
            type: 'update',
            feedbackUser: currentUser,
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
                    env.openExternal(Uri.parse(`https://bitbucket.org/atlassianlabs/atlascode`));
                    break;
                }
                case 'issueLink': {
                    handled = true;
                    env.openExternal(Uri.parse(`https://bitbucket.org/atlassianlabs/atlascode/issues`));
                    break;
                }
                case 'docsLink': {
                    handled = true;
                    env.openExternal(
                        Uri.parse(`https://confluence.atlassian.com/display/BITBUCKET/Getting+started+with+VS+Code`)
                    );
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

import { commands, EventEmitter, window } from 'vscode';
import { Commands } from '../commands';
import { ProductBitbucket, ProductJira, SiteInfo } from './authInfo';

export enum OnboardingNotificationActions {
    CREATEISSUE = 'Create an issue',
    VIEWISSUE = 'View an issue',
    CREATEPULLREQUEST = 'Create a pull request',
    VIEWPULLREQUEST = 'View a pull request'
}

export type OnboardingNotificationPressedEvent = {
    action: OnboardingNotificationActions;
};

export function displayAuthNotification(site: SiteInfo, event: EventEmitter<OnboardingNotificationPressedEvent>) {
    if (site.product.key === ProductJira.key) {
        window
            .showInformationMessage(
                `You are now authenticated with ${site.product.name}.`,
                OnboardingNotificationActions.CREATEISSUE,
                OnboardingNotificationActions.VIEWISSUE
            )
            .then(selection => {
                if (selection) {
                    if (selection === OnboardingNotificationActions.CREATEISSUE) {
                        event.fire({
                            action: OnboardingNotificationActions.CREATEISSUE
                        });
                        commands.executeCommand(Commands.CreateIssue, undefined, 'auth notification');
                    } else if (selection === OnboardingNotificationActions.VIEWISSUE) {
                        event.fire({
                            action: OnboardingNotificationActions.VIEWISSUE
                        });
                    }
                }
            });
    } else if (site.product.key === ProductBitbucket.key) {
        window
            .showInformationMessage(
                `You are now authenticated with ${site.product.name}.`,
                OnboardingNotificationActions.CREATEPULLREQUEST,
                OnboardingNotificationActions.VIEWPULLREQUEST
            )
            .then(selection => {
                if (selection) {
                    if (selection === OnboardingNotificationActions.CREATEPULLREQUEST) {
                        event.fire({
                            action: OnboardingNotificationActions.CREATEPULLREQUEST
                        });
                        commands.executeCommand(Commands.CreatePullRequest);
                    } else if (selection === OnboardingNotificationActions.VIEWPULLREQUEST) {
                        event.fire({
                            action: OnboardingNotificationActions.VIEWPULLREQUEST
                        });
                    }
                }
            });
    }
}

import { commands, EventEmitter, window } from 'vscode';
import { Commands } from '../commands';
import { ProductBitbucket, ProductJira, SiteInfo } from './authInfo';

export enum onboardingNotificationActions {
    CREATEISSUE = 'Create an issue',
    VIEWISSUE = 'View an issue',
    CREATEPULLREQUEST = 'Create a pull request',
    VIEWPULLREQUEST = 'View a pull request'
}

export type OnboardingNotificationPressedEvent = {
    action: onboardingNotificationActions;
};

export function displayAuthNotification(site: SiteInfo, event: EventEmitter<OnboardingNotificationPressedEvent>) {
    if (site.product.key === ProductJira.key) {
        window
            .showInformationMessage(
                `You are now authenticated with ${site.product.name}.`,
                onboardingNotificationActions.CREATEISSUE,
                onboardingNotificationActions.VIEWISSUE
            )
            .then(selection => {
                if (selection) {
                    if (selection === onboardingNotificationActions.CREATEISSUE) {
                        event.fire({
                            action: onboardingNotificationActions.CREATEISSUE
                        });
                        commands.executeCommand(Commands.CreateIssue, undefined, 'auth notification');
                    } else if (selection === onboardingNotificationActions.VIEWISSUE) {
                        event.fire({
                            action: onboardingNotificationActions.VIEWISSUE
                        });
                    }
                }
            });
    } else if (site.product.key === ProductBitbucket.key) {
        window
            .showInformationMessage(
                `You are now authenticated with ${site.product.name}.`,
                onboardingNotificationActions.CREATEPULLREQUEST,
                onboardingNotificationActions.VIEWPULLREQUEST
            )
            .then(selection => {
                if (selection) {
                    if (selection === onboardingNotificationActions.CREATEPULLREQUEST) {
                        event.fire({
                            action: onboardingNotificationActions.CREATEPULLREQUEST
                        });
                        commands.executeCommand(Commands.CreatePullRequest);
                    } else if (selection === onboardingNotificationActions.VIEWPULLREQUEST) {
                        event.fire({
                            action: onboardingNotificationActions.VIEWPULLREQUEST
                        });
                    }
                }
            });
    }
}

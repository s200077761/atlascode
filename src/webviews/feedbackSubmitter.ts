import { window, version } from 'vscode';
import axios from 'axios';
import { FeedbackData, FeedbackType } from "../ipc/configActions";
import { Container } from "../container";
import { feedbackEvent } from "../analytics";
import { ProductJira, ProductBitbucket } from '../atlclients/authInfo';
import { truncate } from 'lodash';
import { FeedbackUser } from '../ipc/configMessaging';

const feedbackTypeIds = {
    [FeedbackType.Bug]: '10105',
    [FeedbackType.Comment]: '10106',
    [FeedbackType.Suggestion]: '10107',
    [FeedbackType.Question]: '10108',
    [FeedbackType.Empty]: '10107'
};

export async function getFeedbackUser(): Promise<FeedbackUser> {
    let firstAvailableUser: FeedbackUser | undefined = undefined;

    const jiraCloudSites = Container.siteManager.getSitesAvailable(ProductJira);
    for (const site of jiraCloudSites) {
        try {
            const client = await Container.clientManager.jiraClient(site);
            const user = await client.getCurrentUser();
            if (user.accountId && user.displayName && user.emailAddress) {
                firstAvailableUser = {
                    userName: user.displayName,
                    emailAddress: user.emailAddress
                };
                break;
            }
        }
        catch (e) {
            // continue
        }
    }

    if (!firstAvailableUser) {
        const bitbucketCloudSites = Container.siteManager.getSitesAvailable(ProductBitbucket);
        for (const site of bitbucketCloudSites) {
            try {
                const client = await Container.clientManager.bbClient(site);
                const user = await client.pullrequests.getCurrentUser(site);
                if (user.accountId && user.displayName && user.emailAddress) {
                    firstAvailableUser = {
                        userName: user.displayName,
                        emailAddress: user.emailAddress
                    };
                    break;
                }
            }
            catch (e) {
                // continue
            }
        }
    }

    return firstAvailableUser || { userName: '', emailAddress: '' };
}

export async function submitFeedback(feedback: FeedbackData, source: string) {
    feedbackEvent(feedback, source).then(e => { Container.analyticsClient.sendTrackEvent(e); });

    const context = {
        source: source,
        extensionVersion: Container.version,
        vscodeVersion: version,
        platform: process.platform,
        jiraCloud: Container.siteManager.getSitesAvailable(ProductJira).find(site => site.isCloud) !== undefined,
        jiraServer: Container.siteManager.getSitesAvailable(ProductJira).find(site => !site.isCloud) !== undefined,
        bitbucketCloud: Container.siteManager.getSitesAvailable(ProductBitbucket).find(site => site.isCloud) !== undefined,
        bitbucketServer: Container.siteManager.getSitesAvailable(ProductBitbucket).find(site => !site.isCloud) !== undefined
    };

    const payload = {
        fields: [
            {
                id: "summary",
                value: `Atlascode: ${truncate(feedback.description.trim().split('\n', 1)[0], { length: 100, separator: /,?\s+/ }).trim()}`
            },
            {
                id: "description",
                value: feedback.description
            },
            {
                // Context (text)
                id: "customfield_10047",
                value: JSON.stringify(context, undefined, 4)
            },
            {
                // Request type (bug/comment/improvement/question)
                id: "customfield_10042",
                value: {
                    id: feedbackTypeIds[feedback.type]
                }
            },
            {
                // User name (text, optional)
                id: "customfield_10045",
                value: feedback.userName
            },
            {
                // Can be contacted?
                id: "customfield_10043",
                value: [
                    {
                        id: feedback.canBeContacted ? "10109" : "10111"
                    }
                ]
            },
            {
                // Can be researched?
                id: "customfield_10044",
                value: [
                    {
                        id: feedback.canBeResearched ? "10110" : "10112"
                    }
                ]
            },
            {
                id: "email",
                value: feedback.emailAddress
            },
            {
                id: "components",
                value: [
                    {
                        id: "10097"
                    }
                ]
            }
        ]
    };

    axios(`https://jsd-widget.atlassian.com/api/embeddable/b1d25f9a-a527-40a4-9671-a98182dd78b1/request?requestTypeId=202`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        data: JSON.stringify(payload)
    });

    window.showInformationMessage('The Atlassian team thanks you for your feedback!');
}

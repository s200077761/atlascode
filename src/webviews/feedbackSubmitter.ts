import { window } from 'vscode';
import { FeedbackData } from "../ipc/configActions";
import { Container } from "../container";
import { feedbackEvent } from "../analytics";


export async function submitFeedback(feedback: FeedbackData, source: string) {
    feedbackEvent(feedback, source).then(e => { Container.analyticsClient.sendTrackEvent(e); });

    window.showInformationMessage('The Atlassian team thanks you for your feedback!');
}

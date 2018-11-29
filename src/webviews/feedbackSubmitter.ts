import { FeedbackData } from "../ipc/configActions";
import { Container } from "../container";
import { feedbackEvent } from "../analytics";
import { Logger } from "../logger";
import fetch from 'node-fetch';
import { AuthProvider } from "../atlclients/authInfo";


export async function submitFeedback(feedback:FeedbackData, source:string) {
    Container.analyticsClient.sendTrackEvent(await feedbackEvent(feedback, source)).catch(reason => Logger.debug('error sending analytics',reason));

    // temporarily sedn to stride so we can see it easily
    fetch('https://api.atlassian.com/site/a436116f-02ce-4520-8fbb-7301462a1674/conversation/f31de456-7b2a-4d11-8142-1550ddf3adba/message', {
        method: 'post',
        body:    await appCard(feedback,source),
        headers: { 
            'Content-Type': 'application/json',
            Authorization: 'Bearer pK6Oi3p5epMrC0uyZcDN'
        },
    })
    .then(res => res.json())
    .then(json => Logger.debug(json));
}

async function appCard(feedback:FeedbackData, source:string): Promise<any> {

    let userName = 'Unknown User';
    let authInfo = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud).catch(reason => Logger.debug('error getting jira creds',reason));
    let lozengeText = "Can be contacted";
    let lozengeAppear = "new";
    
    if(!authInfo) {
        authInfo = await Container.authManager.getAuthInfo(AuthProvider.BitbucketCloud).catch(reason => Logger.debug('error getting bb creds',reason));
    }
    
    if(authInfo) {
        userName = authInfo.user.displayName;
    }

    if(!feedback.canBeContacted) {
        lozengeText = "Cannot be contacted";
        lozengeAppear = "removed";
    }


    return `{
        "version": 1,
        "type": "doc",
        "content": [
          {
            "type": "applicationCard",
            "attrs": {
              "collapsible": true,
              "text": "Atlascode Feedback Submitted by ${userName}",
              "title": {
                "text": "Atlascode Feedback Submitted by ${userName}",
                "user": {
                  "icon": {
                    "url": "https://user-images.githubusercontent.com/49339/32078472-5053adea-baa7-11e7-9034-519002f12ac7.png",
                    "label": "Atlascode"
                  }
                }
              },
              "description": {
                "text": "${feedback.description}"
              },
              "details": [
                {
                  "icon": {
                    "url": "https://cdn0.iconfinder.com/data/icons/pixel-perfect-at-24px-volume-6/24/2149-512.png",
                    "label": "Feedback Type"
                  },
                  "text": "${feedback.type}"
                },
                {
                  "lozenge": {
                    "text": "${lozengeText}",
                    "appearance": "${lozengeAppear}"
                  }
                }
              ],
              "context": {
                "text": "${source}",
                "icon": {
                  "url": "https://png.pngtree.com/svg/20170217/location_558775.png",
                  "label": "Source"
                }
              }
            }
          }
        ]
      }`;
}
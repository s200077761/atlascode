import { PMFData } from "../ipc/messaging";
import { AuthInfo, AuthProvider } from "../atlclients/authInfo";
import { Container } from "../container";
import { format } from 'date-fns';
import fetch from 'node-fetch';

const devPMF = {
    collectorId: "235854834",
    pmf: "fh68whZDMCBDYPTv2WD8W8dTXhRUaBWQ-PXTpgkvQNRGWo2W3SKsizTjZCaNvqQBi0.t0-1zSJyryfvH9VCmKT2wF7kpoGC.9ioZ8vV5NrUIHS9XJTiGYreWJ.aq1fzU",
    pageId: "77775470",
    q1Id: "287301718",
    q2Id: "287328853",
    q3Id: "287329058",
    q4Id: "287329180",
    q1Choices: [
        "1925556954",
        "1925556955",
        "1925556956"
    ]
};

const prodPMF = {
    collectorId: "236281099",
    pmf: "fh68whZDMCBDYPTv2WD8W8dTXhRUaBWQ-PXTpgkvQNRGWo2W3SKsizTjZCaNvqQBi0.t0-1zSJyryfvH9VCmKT2wF7kpoGC.9ioZ8vV5NrUIHS9XJTiGYreWJ.aq1fzU",
    pageId: "78407137",
    q1Id: "289181506",
    q2Id: "289181510",
    q3Id: "289181511",
    q4Id: "289181512",
    q1Choices: [
        "1935869265",
        "1935869266",
        "1935869267"
    ]
};

interface PMFPayload {
    custom_variables: {
        aaid: string;
        subproduct: string;
        version: string;
    };
    custom_value: string;
    date_created: string;
    pages: [
        {
            id: string;
            questions: [
                {
                    answers: PMFChoice[] | PMFText[],
                    id: string;
                }
            ]
        }
    ];
}

interface PMFChoice {
    choice_id: string;
}

interface PMFText {
    text: string;
}

function newPMFPayload(aaid: string, version: string, date: string, pageId: string, q1Id: string, q1Choice: string): PMFPayload {
    return {
        custom_variables: {
            aaid: aaid,
            subproduct: "atlascode",
            version: version
        },
        custom_value: "atlascode",
        date_created: date,
        pages: [
            {
                id: pageId,
                questions: [
                    {
                        answers: [
                            {
                                choice_id: q1Choice
                            }
                        ],
                        id: q1Id
                    }
                ]
            }
        ]
    };
}

export async function submitPMF(pmfData: PMFData): Promise<void> {
    let aaid = await getAAID();
    let pmfIds = Container.isDebugging ? devPMF : prodPMF;
    if (aaid) {
        let payload = newPMFPayload(aaid, Container.version, format(new Date(), 'YYYY-MM-DD[T]HH:mm:ssZZ'), pmfIds.pageId, pmfIds.q1Id, pmfIds.q1Choices[pmfData.q1]);

        if (pmfData.q2) {
            payload.pages[0].questions.push({
                answers: [
                    {
                        text: pmfData.q2
                    }
                ],
                id: pmfIds.q2Id
            });
        }

        if (pmfData.q3) {
            payload.pages[0].questions.push({
                answers: [
                    {
                        text: pmfData.q3
                    }
                ],
                id: pmfIds.q3Id
            });
        }

        if (pmfData.q4) {
            payload.pages[0].questions.push({
                answers: [
                    {
                        text: pmfData.q4
                    }
                ],
                id: pmfIds.q4Id
            });
        }

        fetch(`https://api.surveymonkey.com/v3/collectors/${pmfIds.collectorId}/responses`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${pmfIds.pmf}`
            },
            body: JSON.stringify(payload)

        });
    }
}

async function getAAID(): Promise<string | undefined> {
    let authInfo: AuthInfo | undefined = undefined;

    authInfo = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud);
    if (!authInfo) {
        authInfo = await Container.authManager.getAuthInfo(AuthProvider.BitbucketCloud);
    }
    if (!authInfo) {
        authInfo = await Container.authManager.getAuthInfo(AuthProvider.JiraCloudStaging);
    }
    if (!authInfo) {
        authInfo = await Container.authManager.getAuthInfo(AuthProvider.BitbucketCloudStaging);
    }

    if (authInfo) {
        return authInfo.user.id;
    }

    return undefined;
}
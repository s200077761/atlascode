import { JqlAutocompleteRestData, Suggestion } from '@atlassianlabs/guipi-jira-components';
import { FilterSearchResults, JQLErrors } from '@atlassianlabs/jira-pi-common-models';
import { ThemeProvider, useTheme } from '@material-ui/core';
import React, { useState } from 'react';
import { v4 } from 'uuid';
import { DetailedSiteInfo, emptySiteInfo } from '../../../../../atlclients/authInfo';
import { JQLEntry } from '../../../../../config/model';
import { ConfigAction } from '../../../../../lib/ipc/fromUI/config';
import { ConfigChanges, ConfigControllerApi, ConfigControllerContext, emptyApi } from '../../configController';
import { JQLEditDialog } from '../../jira/jql/JQLEditDialog';
import { JQLListEditor } from '../../jira/jql/JQLListEditor';
import restdata from './__fixtures__/autocompletedata.json';
export default {
    title: 'Config/jira/JQLEdit',
};

const mockConfigController: ConfigControllerApi = {
    ...emptyApi,
    postMessage: (action: ConfigAction): void => {
        console.log(`postMessage`, action);
    },

    updateConfig: (changes: ConfigChanges, removes?: string[]) => {
        console.log(`updateConfig`, changes);
    },

    fetchJqlOptions: (site: DetailedSiteInfo): Promise<JqlAutocompleteRestData> => {
        return new Promise((resolve) => {
            console.log('fetching options');
            setTimeout(resolve, 1000, restdata);
        });
    },
    fetchJqlSuggestions: (
        site: DetailedSiteInfo,
        fieldName: string,
        userInput: string,
        predicateName?: string,
        abortSignal?: AbortSignal
    ): Promise<Suggestion[]> => {
        return new Promise((resolve) => {
            resolve([
                { value: 'VSCODE', displayName: 'VSCODE (VSCode)' },
                { value: 'VTC', displayName: 'VTC (Classic)' },
                { value: 'VTS', displayName: 'VTS (Server)' },
                { value: 'VTN', displayName: 'VTN (Next Gen)' },
            ]);
        });
    },
    fetchFilterSearchResults: (
        site: DetailedSiteInfo,
        query: string,
        maxResults?: number,
        startAt?: number,
        abortSignal?: AbortSignal
    ): Promise<FilterSearchResults> => {
        const filterResults = {
            filters: [
                {
                    id: '1',
                    name: 'one',
                    owner: 'me',
                    jql: 'project = one',
                    viewUrlPath: 'http://viewurl/one',
                    favorite: false,
                },
                {
                    id: '2',
                    name: 'two',
                    owner: 'you',
                    jql: 'project = two',
                    viewUrlPath: 'http://viewurl/two',
                    favorite: true,
                },
                {
                    id: '3',
                    name: 'three',
                    owner: 'someone else',
                    jql: 'project = three',
                    viewUrlPath: 'http://viewurl/three',
                    favorite: false,
                },
            ],
            isLast: true,
            maxResults: 25,
            offset: 0,
            total: 0,
        };

        return new Promise((resolve) => {
            setTimeout(resolve, 1000, filterResults);
        });
    },
};

const sites: DetailedSiteInfo[] = [
    { ...emptySiteInfo, id: '1', name: 'one', avatarUrl: 'badurl' },
    { ...emptySiteInfo, id: '2', name: 'two', avatarUrl: 'badurl' },
    { ...emptySiteInfo, id: '3', name: 'three', avatarUrl: 'badurl' },
];

const handleJQLSave = (jqlEntry: JQLEntry) => {
    console.log('saving jql', jqlEntry);
};

export const EditDialog = () => {
    return (
        <ConfigControllerContext.Provider value={mockConfigController}>
            <JQLEditDialog jqlEntry={undefined} onCancel={() => {}} onSave={handleJQLSave} open={true} sites={sites} />
        </ConfigControllerContext.Provider>
    );
};

export const ErrorEditDialog = () => {
    const errorController: ConfigControllerApi = {
        ...mockConfigController,
        validateJql: (site: DetailedSiteInfo, jql: string, abortSignal?: AbortSignal): Promise<JQLErrors> => {
            return new Promise((resolve) => {
                if (jql.length > 0) {
                    resolve({ errors: ['bad, bad jql. baddest jql in the whole damn town.'] });
                } else {
                    resolve({ errors: [] });
                }
            });
        },
    };

    return (
        <ConfigControllerContext.Provider value={errorController}>
            <JQLEditDialog jqlEntry={undefined} onCancel={() => {}} onSave={handleJQLSave} open={true} sites={sites} />
        </ConfigControllerContext.Provider>
    );
};

export const EditList = () => {
    const [jqlList, setJQLList] = useState<JQLEntry[]>([
        { id: v4(), name: 'test1', siteId: '1', query: 'project = VTC', monitor: true, enabled: true },
        {
            id: v4(),
            filterId: v4(),
            name: 'filterTest',
            siteId: '1',
            query: 'project = VTC',
            monitor: true,
            enabled: true,
        },
    ]);
    const listController: ConfigControllerApi = {
        ...mockConfigController,
        updateConfig: (changes: ConfigChanges, removes?: string[]) => {
            setJQLList(changes['jira.jqlList']);
        },
    };

    const theme = useTheme();
    return (
        <ThemeProvider theme={theme}>
            <ConfigControllerContext.Provider value={listController}>
                <JQLListEditor sites={sites} jqlList={jqlList} />
            </ConfigControllerContext.Provider>
        </ThemeProvider>
    );
};

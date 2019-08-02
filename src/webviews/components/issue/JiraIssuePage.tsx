import * as React from 'react';
import { CommonEditorPageEmit, CommonEditorPageAccept, CommonEditorViewState, AbstractIssueEditorPage } from './AbstractIssueEditorPage';
import { EditIssueData } from '../../../ipc/issueMessaging';

type Emit = CommonEditorPageEmit;
type Accept = CommonEditorPageAccept | EditIssueData;
interface ViewState extends CommonEditorViewState, EditIssueData {
    isCreateBannerOpen: boolean;
    createdIssue: any;
}

export default class JiraIssuePage extends AbstractIssueEditorPage<Emit, Accept, {}, ViewState> {

    onMessageReceived(e: any): boolean {
        let handled = super.onMessageReceived(e);

        if (!handled) {
            switch (e.type) {
                case 'update': {
                    const issueData = e as EditIssueData;
                    this.setState({ ...issueData, ...{ isErrorBannerOpen: false, errorDetails: undefined, isSomethingLoading: false, loadingField: '' } });
                    break;
                }
            }
        }

        return handled;
    }

    public render() {
        return (
            <div>not implemented</div>
        );
    }
}

import * as React from 'react';
import { AbstractIssueEditor, CommonEditorViewState, CommonEditorEmit, CommonEditorAccept } from "./AbstractIssueEditor";

type Emit = CommonEditorEmit;
type Accept = CommonEditorAccept;
interface ViewState extends CommonEditorViewState {
    isCreateBannerOpen: boolean;
    createdIssue: any;
}

export default class JiraIssuePage extends AbstractIssueEditor<Emit, Accept, {}, ViewState> {

    public render() {
        return (
            <div>not implemented</div>
        );
    }
}

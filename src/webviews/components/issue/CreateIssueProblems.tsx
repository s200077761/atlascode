import * as React from 'react';
import { WebviewComponent } from "../WebviewComponent";
import { TransformerProblems } from "../../../jira/createIssueMeta";
import { HostErrorMessage, Action } from "../../../ipc/messaging";
import Page, { Grid, GridColumn } from "@atlaskit/page";
import ErrorBanner from '../ErrorBanner';

type Accept = TransformerProblems | HostErrorMessage;

interface ViewState {
    isErrorBannerOpen: boolean;
    errorDetails: any;
    problems: TransformerProblems;
}

export default class CreateIssueProblems extends WebviewComponent<Action, Accept, {}, ViewState> {
    onMessageReceived(e: any): void {
        switch (e.type) {
            case 'error': {
                this.setState({ isErrorBannerOpen: true, errorDetails: e.reason });

                break;
            }
            case 'screenRefresh': {
                const data = e as TransformerProblems;
                this.setState({ problems: data, isErrorBannerOpen: false, errorDetails: undefined });
                break;
            }

        }
    }

    handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    }

    public render() {
        return (
            <Page>
                <Grid>
                    <GridColumn medium={8}>
                        <div>

                            {this.state.isErrorBannerOpen &&
                                <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
                            }
                        </div>
                    </GridColumn>
                </Grid>
            </Page>
        );
    }
}
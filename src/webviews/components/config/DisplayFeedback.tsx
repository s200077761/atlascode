import * as React from 'react';
import Button from '@atlaskit/button';
import { FlagGroup } from '@atlaskit/flag';
import FeedbackForm, { FeedbackFlag } from '@atlaskit/feedback-collector';

type MyState = { isOpen: boolean, displayFlag: boolean };
const name = 'Feedback Sender';
const email = 'fsender@atlassian.com';
export default class DisplayFeedback extends React.Component<{}, MyState> {

  constructor(props: any) {
      super(props);
  }
  state = { isOpen: false, displayFlag: false };

  open = () => this.setState({ isOpen: true });
  close = () => this.setState({ isOpen: false });
  displayFlag = () => this.setState({ displayFlag: true });
  hideFlag = () => this.setState({ displayFlag: false });

  render() {
    const { isOpen, displayFlag } = this.state;
    return (
      <div>
        {displayFlag && (
          <FlagGroup onDismissed={this.hideFlag}>
            <FeedbackFlag />
          </FlagGroup>
        )}
        
        <Button appearance="primary" onClick={this.open}>
          Display Feedback
        </Button>

        {isOpen && (
          <FeedbackForm
            onClose={this.close}
            onSubmit={this.displayFlag}
            email={email}
            name={name}
          />
        )}

      </div>
    );
  }
}
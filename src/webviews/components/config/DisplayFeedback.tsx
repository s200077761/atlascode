import * as React from 'react';
import Button from '@atlaskit/button';
import { FeedbackForm } from '@atlaskit/feedback-collector';
import { FeedbackData } from '../../../ipc/configActions';

type MyState = { isOpen: boolean };

export default class DisplayFeedback extends React.Component<{onFeedback: (feedback:FeedbackData) => void}, MyState> {

  constructor(props: any) {
      super(props);
  }
  state = { isOpen: false };

  open = () => this.setState({ isOpen: true });
  close = () => this.setState({ isOpen: false });

  handleFeedback = (feedback:FeedbackData) => {
    this.setState({ isOpen: false });
    if(this.props.onFeedback) {
      this.props.onFeedback(feedback);
    }
  }
  render() {
    const { isOpen } = this.state;
    return (
      <div>
        <Button className='ak-button' onClick={this.open}>
          Send Feedback
        </Button>

        {isOpen && (
          <FeedbackForm
            onClose={this.close}
            onSubmit={this.handleFeedback}
          />
        )}

      </div>
    );
  }
}
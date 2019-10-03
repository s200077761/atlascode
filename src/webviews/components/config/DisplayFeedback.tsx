import * as React from 'react';
import Button from '@atlaskit/button';
import { FeedbackData } from '../../../ipc/configActions';
import Form, { FormFooter, Field, ErrorMessage } from '@atlaskit/form';
import { Checkbox } from '@atlaskit/checkbox';
import Select from '@atlaskit/select';
import Modal, { ModalTransition } from "@atlaskit/modal-dialog";
import * as FieldValidators from '../fieldValidators';
import { FeedbackUser } from '../../../ipc/configMessaging';

type MyState = { isOpen: boolean, description: string, canBeContacted: boolean };

export default class DisplayFeedback extends React.Component<{ userDetails: FeedbackUser, onFeedback: (feedback: FeedbackData) => void }, MyState> {

  constructor(props: any) {
    super(props);
    this.state = { isOpen: false, description: '', canBeContacted: true };
  }

  handleOpen = () => this.setState({ isOpen: true });
  handleClose = () => this.setState({ isOpen: false, description: '' });
  toggleCanBeContacted = () => this.setState({ canBeContacted: !this.state.canBeContacted });

  handleFeedback = (formData: any) => {

    const feedback: FeedbackData = {
      description: formData.description,
      type: formData.type.value,
      canBeContacted: formData.canBeContacted,
      userName: formData.userName,
      emailAddress: formData.email || 'do-not-reply@atlassian.com'
    };

    if (this.props.onFeedback) {
      this.props.onFeedback(feedback);
    }

    this.handleClose();
  }

  render() {
    const { isOpen } = this.state;

    const selectOptions = [
      { label: 'Ask a question', value: 'question' },
      { label: 'Leave a comment', value: 'comment' },
      { label: 'Report a bug', value: 'bug' },
      { label: 'Suggest an improvement', value: 'suggestion' },
    ];

    return (
      <div>
        <Button className='ac-button' onClick={this.handleOpen}>Send Feedback</Button>

        {isOpen && (
          <ModalTransition>
            <Modal
              onClose={this.handleClose}
              heading="Send Feedback"
              shouldCloseOnEscapePress={false}
            >
              <Form
                name="feedback-collector"
                onSubmit={this.handleFeedback}
              >
                {(frmArgs: any) => {
                  return (<form {...frmArgs.formProps}>
                    <Field defaultValue={selectOptions[0]}
                      label='Type of Feedback'
                      isRequired={true}
                      id='type'
                      name='type'
                      validate={FieldValidators.validateSingleSelect}>
                      {
                        (fieldArgs: any) => {
                          let errDiv = <span />;
                          if (fieldArgs.error === 'EMPTY') {
                            errDiv = <ErrorMessage>Issue Type is required</ErrorMessage>;
                          }
                          return (
                            <div>
                              <Select
                                {...fieldArgs.fieldProps}
                                className="ac-select-container"
                                classNamePrefix="ac-select"
                                options={selectOptions}
                                placeholder="Select Issue Type"
                                getOptionLabel={(option: any) => option.label}
                                getOptionValue={(option: any) => option.value}
                                menuPortalTarget={document.body}
                                styles={{ menuPortal: (base: any) => ({ ...base, zIndex: 9999 }) }}
                              />
                              {errDiv}
                            </div>
                          );
                        }
                      }
                    </Field>

                    <Field label='Description'
                      isRequired={true}
                      id='description'
                      name='description'
                      defaultValue={this.state.description}
                      validate={FieldValidators.validateString}>
                      {
                        (fieldArgs: any) => {
                          let errDiv = <span />;
                          if (fieldArgs.error === 'EMPTY') {
                            errDiv = <ErrorMessage>Description is required</ErrorMessage>;
                          }
                          return (
                            <div>
                              <textarea {...fieldArgs.fieldProps}
                                style={{ width: '100%', display: 'block' }}
                                className='ac-textarea'
                                rows={3}
                                onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, (item: any) => { this.setState({ description: item.target.value }); })}
                              />
                              {errDiv}
                            </div>
                          );
                        }
                      }
                    </Field>

                    <Field
                      name='canBeContacted'
                      id='canBeContacted'
                      defaultValue={this.state.canBeContacted}>
                      {
                        (fieldArgs: any) => {
                          return (
                            <Checkbox
                              defaultChecked
                              {...fieldArgs.fieldProps}
                              onChange={FieldValidators.chain(fieldArgs.fieldProps.onChange, this.toggleCanBeContacted)}
                              label='Atlassian can contact me about this feedback' />
                          );
                        }
                      }
                    </Field>

                    <Field label='Your name'
                      isRequired={false}
                      id='userName'
                      name='userName'
                      defaultValue={this.props.userDetails.userName}>
                      {
                        (fieldArgs: any) => {
                          let errDiv = <span />;
                          if (fieldArgs.error === 'EMPTY') {
                            errDiv = <ErrorMessage>userName is required</ErrorMessage>;
                          }
                          return (
                            <div>
                              <input {...fieldArgs.fieldProps}
                                style={{ width: '100%', display: 'block' }}
                                className='ac-inputField'
                              />
                              {errDiv}
                            </div>
                          );
                        }
                      }
                    </Field>

                    {this.state.canBeContacted &&
                      <Field label='Your contact email'
                        isRequired={true}
                        id='email'
                        name='email'
                        validate={FieldValidators.validateEmail}
                        defaultValue={this.props.userDetails.emailAddress}>
                        {
                          (fieldArgs: any) => {
                            let errDiv = <span />;
                            if (fieldArgs.error === 'EMPTY') {
                              errDiv = <ErrorMessage>email is required</ErrorMessage>;
                            }
                            return (
                              <div>
                                <input {...fieldArgs.fieldProps}
                                  style={{ width: '100%', display: 'block' }}
                                  className='ac-inputField'
                                />
                                {errDiv}
                              </div>
                            );
                          }
                        }
                      </Field>
                    }

                    <FormFooter actions={{}}>
                      <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
                        <Button type="submit"
                          className='ac-button'
                          isDisabled={(this.state.description.trim().length < 1)}
                        >
                          Submit
                        </Button>
                      </div>
                      <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
                        <Button
                          className='ac-button'
                          onClick={this.handleClose}
                        >
                          Cancel
                        </Button>
                      </div>
                    </FormFooter>
                    <div style={{ height: '20px' }} />
                  </form>);
                }}
              </Form>

            </Modal>
          </ModalTransition>
        )}

      </div>
    );
  }
}
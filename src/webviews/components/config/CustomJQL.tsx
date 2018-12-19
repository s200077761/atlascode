import React from "react";
import { JQLAutocompleteInput } from "./JQLAutocompleteInput";
import fetch, { Request, Response } from "node-fetch";
import { ConfigData } from "../../../ipc/configMessaging";
import { SiteJQL, emptyJQLEntry, JQLEntry } from "../../../config/model";

type changeObject = { [key: string]: any };

export default class CustomJQL extends React.Component<{
  configData: ConfigData;
  onConfigChange: (changes: changeObject, removes?: string[]) => void;
  cloudId: string;
  jiraAccessToken: string;
}> {
  constructor(props: any) {
    super(props);
  }

  async fetchEndpoint(endpoint: string): Promise<any> {
    const fullUrl = `https://api.atlassian.com/ex/jira/${
      this.props.cloudId
    }/rest/api/2/${endpoint}`;
    const r = new Request(fullUrl, {
      headers: {
        Authorization: `Bearer ${this.props.jiraAccessToken}`,
        "Content-Type": "application/json"
      }
    });

    return fetch(r).then((res: Response) => {
      return res.json();
    });
  }

  getSuggestionsRequest = async (fieldName: string) => {
    return this.fetchEndpoint(
      `jql/autocompletedata/suggestions?fieldName=${fieldName}`
    );
  }

  validationRequest = async (jql: string) => {
    return this.fetchEndpoint(
      `/search?startAt=0&maxResults=1&validateQuery=strict&fields=summary&jql=${jql}`
    );
  }

  getAutocompleteDataRequest = () => {
    return this.fetchEndpoint("/jql/autocompletedata");
  }

  onJQLChange = (event: any) => {
    this.setState({
      inputValue: event.target.value
    });

    const jqlList = this.siteJqlList();
    const jqlEntry = jqlList[event.target.dataIndex];
    jqlEntry.query = event.target.value;

    const changes = Object.create(null);
    changes["jira.customJql"] = this.props.configData.config.jira.customJql;

    if (this.props.onConfigChange) {
      this.props.onConfigChange(changes);
    }
  }

  private siteJqlList(): JQLEntry[] {
    const customJqlList = this.props.configData.config.jira.customJql;
    const siteJql = customJqlList.find((item: SiteJQL) => {
      return item.siteId === this.props.cloudId;
    });

    if (!siteJql) {
      const newJql = { siteId: this.props.cloudId, jql: [emptyJQLEntry] };
      customJqlList.push(newJql);
      return newJql.jql;
    }

    return siteJql.jql;
  }

  render() {
    if (!this.props.cloudId && !this.props.jiraAccessToken) {
      return <div />;
    }

    const jql = this.siteJqlList();

    return (
      <React.Fragment>
        {jql.map((element, index) => {
          return (
            <JQLAutocompleteInput
              data-index={index}
              getAutocompleteDataRequest={this.getAutocompleteDataRequest}
              getSuggestionsRequest={this.getSuggestionsRequest}
              initialValue={element.query}
              inputId={`jqlAutocomplete_${index}`}
              label={"JQL"}
              onChange={this.onJQLChange}
              // setValue={this.props.setValue}
              validationRequest={this.validationRequest}
            />
          );
        })}
      </React.Fragment>
    );
  }
}

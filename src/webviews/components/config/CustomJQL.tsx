import React from "react";
import { SiteJQL, emptyJQLEntry, JQLEntry } from "../../../config/model";
import Button from "@atlaskit/button";
import { Checkbox } from "@atlaskit/checkbox";
import Tooltip from '@atlaskit/tooltip';
import EditFilledIcon from '@atlaskit/icon/glyph/edit-filled';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import EditJQL from "./EditJQL";
import { v4 } from "uuid";
import { ButtonGroup } from "@atlaskit/button";
import { DetailedSiteInfo } from "../../../atlclients/authInfo";

type changeObject = { [key: string]: any };

export default class CustomJQL extends React.Component<
  {
    defaultSiteName: string;
    defaultSiteId: string;
    workingProject: string;
    sites: DetailedSiteInfo[];
    siteJqlList: SiteJQL[];
    onConfigChange: (changes: changeObject, removes?: string[]) => void;
    jqlFetcher: (site: DetailedSiteInfo, path: string) => Promise<any>;
  },
  {
    inputValue: string;
    editingEntry: JQLEntry | undefined;
    editingId: string | undefined;
    dragTargetIndex: number | undefined;
    dragSourceIndex: number | undefined;
  }
  > {
  constructor(props: any) {
    super(props);

    this.state = {
      inputValue: "",
      editingEntry: undefined,
      editingId: undefined,
      dragTargetIndex: undefined,
      dragSourceIndex: undefined
    };
  }

  private copySiteJql(siteJqlList: SiteJQL[]) {
    return siteJqlList.map((siteJql: SiteJQL) => {
      return {
        siteId: siteJql.siteId,
        jql: siteJql.jql.map((entry: JQLEntry) => {
          return Object.assign({}, entry);
        })
      };
    });
  }

  private publishChanges(inputSiteJQL: SiteJQL) {
    const siteJqlList = this.copySiteJql(this.props.siteJqlList);
    siteJqlList.forEach((siteJql: SiteJQL) => {
      if (siteJql.siteId === inputSiteJQL.siteId) {
        siteJql.jql = inputSiteJQL.jql;
      }
    });

    const changes = Object.create(null);
    changes["jira.customJql"] = siteJqlList;

    if (this.props.onConfigChange) {
      this.props.onConfigChange(changes);
    }
  }

  onNewQuery = () => {
    const id = v4();
    this.setState({
      editingId: id,
      editingEntry: { id: id, name: "", query: "", enabled: true }
    });
  }

  onEditQuery = (id: string) => {
    const entry = this.readJqlListFromProps().find((entry: JQLEntry) => {
      return entry.id === id;
    });
    if (entry) {
      this.setState({
        editingId: entry.id,
        editingEntry: Object.assign({}, entry)
      });
    } else {
      // This entry has disappered from under us.
      this.onNewQuery();
    }
  }

  deleteQuery = (id: string) => {
    var jqlList = this.readJqlListFromProps().map((entry: JQLEntry) => {
      return Object.assign({}, entry);
    });
    const index = this.indexForId(jqlList, id);
    if (index >= 0) {
      jqlList.splice(index, 1);
      this.publishChanges({ siteId: this.props.defaultSiteId, jql: jqlList });
    }
  }

  toggleEnable = (e: any) => {
    const id = e.target.value;
    var jqlList = this.readJqlListFromProps();
    const index = this.indexForId(jqlList, id);

    if (index >= 0) {
      const entry = jqlList[index];
      entry.enabled = e.target.checked;
      this.publishChanges({ siteId: this.props.defaultSiteId, jql: jqlList });
    }
  }

  private readJqlListFromProps(inputSiteId?: string): JQLEntry[] {
    const defaultSiteId = inputSiteId ? inputSiteId : this.props.defaultSiteId;
    const customJqlList = this.props.siteJqlList;
    const siteJql = customJqlList.find((item: SiteJQL) => {
      return item.siteId === defaultSiteId;
    });

    if (!siteJql) {
      const newJql = { siteId: defaultSiteId, jql: [emptyJQLEntry] };
      customJqlList.push(newJql);
      return newJql.jql;
    }

    return siteJql.jql.map((item: JQLEntry) => {
      return Object.assign({}, item);
    });
  }

  handleCancelEdit = () => {
    this.setState({ editingId: undefined, editingEntry: undefined });
  }

  indexForId(jqlList: JQLEntry[], id: string | undefined) {
    return jqlList.findIndex((entry: JQLEntry) => {
      return entry.id === id;
    });
  }

  handleSaveEdit = (siteId: string, jqlEntry: JQLEntry) => {
    const jqlList = this.readJqlListFromProps(siteId);
    const index = this.indexForId(jqlList, this.state.editingId);

    if (index >= 0) {
      jqlList[index] = jqlEntry;
    } else {
      jqlList.push(jqlEntry);
    }

    this.setState({
      editingId: undefined,
      editingEntry: undefined
    });
    this.publishChanges({ siteId: siteId, jql: jqlList });
  }

  handleDragStart = (e: any) => {
    const objIndex = e.target.getAttribute("data-index");
    if (!objIndex) {
      return;
    }
    const index = Number(objIndex);
    e.dataTransfer.dropEffect = "copy";
    this.setState({ dragSourceIndex: index });
  }

  handleDragEnd = (e: any) => {
    this.setState({ dragSourceIndex: undefined, dragTargetIndex: undefined });
  }

  handleDragEnter = (e: any) => {
    const objIndex = e.currentTarget.getAttribute("data-index");
    if (objIndex) {
      const index = Number(objIndex);
      if (index !== undefined) {
        this.setState({ dragTargetIndex: index });
      }
    }
  }

  handleDragOver = (e: any) => {
    e.preventDefault();
  }

  handleDrop = (e: any) => {
    e.preventDefault();

    if (this.state.dragSourceIndex !== undefined &&
      this.state.dragTargetIndex !== undefined &&
      this.state.dragSourceIndex !== this.state.dragTargetIndex) {
      var jql = this.readJqlListFromProps();
      const temp = jql[this.state.dragSourceIndex];
      jql.splice(this.state.dragSourceIndex, 1);
      jql.splice(this.state.dragTargetIndex, 0, temp);
      this.publishChanges({ siteId: this.props.defaultSiteId, jql: jql });
    }
    this.setState({ dragSourceIndex: undefined, dragTargetIndex: undefined });
  }

  htmlForJQLEntry = (element: JQLEntry, displayIndex: number) => {
    return (
      <div
        data-index={displayIndex}
        id="jql-row"
        data-id={element.id}
        draggable={true}
        onDragStart={this.handleDragStart}
        onDragEnd={this.handleDragEnd}
      >
        <div>
          <Checkbox
            value={element.id}
            isChecked={element.enabled}
            onChange={this.toggleEnable}
          />
        </div>

        <div style={{ flexGrow: 1 }}>{element.name}</div>

        <ButtonGroup>
          <Tooltip content="Edit">
            <Button
              className="ac-button"
              iconBefore={<EditFilledIcon label="edit" />}
              onClick={() => {
                this.onEditQuery(element.id);
              }}
            />
          </Tooltip>
          <Tooltip content="Delete">
            <Button
              className="ac-button"
              iconBefore={<TrashIcon label="delete" />}
              onClick={() => {
                this.deleteQuery(element.id);
              }}
            />
          </Tooltip>
        </ButtonGroup>
      </div>
    );
  }

  htmlElementAtIndex = (jql: JQLEntry[], index: number) => {
    var element = undefined;

    if (this.state.dragSourceIndex !== undefined && this.state.dragTargetIndex !== undefined) {
      if (index === this.state.dragTargetIndex) {
        element = <div id="empty-jql-row" data-index={index} />;
      } else if ((index < this.state.dragSourceIndex && index < this.state.dragTargetIndex) ||
        (index > this.state.dragSourceIndex && index > this.state.dragTargetIndex)) {
        element = this.htmlForJQLEntry(jql[index], index);
      } else if (this.state.dragSourceIndex < this.state.dragTargetIndex) {
        element = this.htmlForJQLEntry(jql[index + 1], index + 1);
      } else {
        element = this.htmlForJQLEntry(jql[index - 1], index - 1);
      }
    } else {
      element = this.htmlForJQLEntry(jql[index], index);
    }

    return (
      <div
        id="jql-row-container"
        data-index={index}
      >
        <div id="jql-row-drop-overlay"
          data-index={index}
          onDragEnter={this.handleDragEnter}
          onDragOver={this.handleDragOver}
          onDrop={this.handleDrop}
        >
          {element}
        </div>
      </div>
    );
  }

  render() {
    if (!this.props.defaultSiteId) {
      return <div />;
    }

    const jql = this.readJqlListFromProps();

    return (
      <React.Fragment>
        {this.state.editingEntry && (
          <EditJQL
            jqlFetcher={this.props.jqlFetcher}
            defaultSiteId={this.props.defaultSiteId}
            workingProject={this.props.workingProject}
            sites={this.props.sites}
            jqlEntry={this.state.editingEntry}
            onCancel={this.handleCancelEdit}
            onSave={this.handleSaveEdit}
          />
        )}
        <p><em>{jql.length === 0 ? 'No custom jql configured ' : 'Showing custom jql'} for default site - <strong>{this.props.defaultSiteName}</strong> (default site can be changed in the authentication section above)</em></p>
        {jql.map((_, index) => {
          return this.htmlElementAtIndex(jql, index);
        })}
        <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
          <Button className="ac-button" onClick={this.onNewQuery}>
            Add Query
        </Button>
        </div>
      </React.Fragment>
    );
  }
}

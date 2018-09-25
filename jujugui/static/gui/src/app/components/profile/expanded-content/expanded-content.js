/* Copyright (C) 2017 Canonical Ltd. */
'use strict';

const PropTypes = require('prop-types');
const React = require('react');
const shapeup = require('shapeup');

const EntityContentDiagram = require('../../entity-details/content/diagram/diagram');
const Button = require('../../shared/button/button');
const Link = require('../../link/link');

/**
  Display extra info for a charm or bundle in a user profile.
*/
class ProfileExpandedContent extends React.Component {
  /**
    Prevents click event passing through and closing the expanding row.
    @param evt {Object} The click event.
  */
  _stopPropagation(evt) {
    evt.stopPropagation();
  }

  /**
    Navigate to a user profile.
    @param username {String} A username.
  */
  _navigateToProfile(username) {
    this.props.changeState({
      hash: null,
      profile: username
    });
  }

  render() {
    const entity = this.props.entity;
    const getDiagramURL = this.props.getDiagramURL;
    const modelName = this.props.getModelName();
    const title = `Add to ${modelName || 'model'}`;
    const type = getDiagramURL ? 'bundle' : 'charm';
    return (
      <React.Fragment>
        <td>
          {this.props.mainInfo.icon}
          {this.props.entityLink}
          {entity.description ? (
            <span>{entity.description}</span>
          ) : null}
          {getDiagramURL ? (
            <EntityContentDiagram
              diagramUrl={getDiagramURL(entity.id)} />) : null}
        </td>
        <td>
          {this.props.mainInfo.series}
          {entity.bugUrl ? (
            <a href={entity.bugUrl}
              onClick={this._stopPropagation.bind(this)}
              target="_blank">
              Bugs
            </a>) : null}
          {entity.homepage ? (
            <a href={entity.homepage}
              onClick={this._stopPropagation.bind(this)}
              target="_blank">
              Homepage
            </a>) : null}
          <span>
            Writeable:
          </span>
          {this._generatePermissions(entity.perm.write)}
          <span>
            Readable:
          </span>
          {this._generatePermissions(entity.perm.read)}
        </td>
        <td>
          {this.props.mainInfo.version}
          <GenericButton
            action={this._handleDeploy.bind(this, entity.id)}
            disabled={this.props.acl.isReadOnly()}
            tooltip={
              `Add this ${type} to ${modelName ? 'your current' : 'a new'} model`}
            type="positive">
            {title}
          </GenericButton>
        </td>
      </React.Fragment>);
  }
};

ProfileExpandedContent.propTypes = {
  acl: shapeup.shape({
    isReadOnly: PropTypes.func.isRequired
  }).frozen.isRequired,
  addToModel: PropTypes.func.isRequired,
  changeState: PropTypes.func.isRequired,
  entity: PropTypes.object.isRequired,
  generatePath: PropTypes.func.isRequired,
  getDiagramURL: PropTypes.func,
  getModelName: PropTypes.func.isRequired,
  entityLink: PropTypes.object.isRequired
};

module.exports = ProfileExpandedContent;

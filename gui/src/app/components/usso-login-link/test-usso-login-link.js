/* Copyright (C) 2017 Canonical Ltd. */
'use strict';

const React = require('react');
const enzyme = require('enzyme');

const Analytics = require('test/fake-analytics');
const USSOLoginLink = require('./usso-login-link');
const {Button} = require('@canonical/juju-react-components');

describe('USSOLoginLink', () => {

  const renderComponent = (options = {}) => enzyme.shallow(
    <USSOLoginLink
      addNotification={options.addNotification || sinon.stub()}
      analytics={Analytics}
      displayType={options.displayType || 'text'}
      gisf={options.gisf}
      loginToController={options.loginToController || sinon.stub()}
      sendPost={options.sendPost || sinon.stub()}>
      {options.children}
    </USSOLoginLink>
  );

  it('can render a text link', () => {
    const wrapper = renderComponent();
    const expected = (
      <div className="usso-login v1">
        <a
          className="usso-login__action"
          onClick={wrapper.find('.usso-login__action').prop('onClick')}
          target="_blank">
            Login
        </a>
      </div>);
    assert.compareJSX(wrapper, expected);
  });

  it('calls loginToController on click for text link', () => {
    const loginToController = sinon.stub();
    const wrapper = renderComponent({loginToController});
    wrapper.find('.usso-login__action').simulate('click');
    assert.equal(loginToController.callCount, 1);
  });

  it('handles errors when logging in', () => {
    const addNotification = sinon.stub();
    const loginToController = sinon.stub().callsArgWith(0, 'Uh oh!');
    const wrapper = renderComponent({
      addNotification,
      loginToController
    });
    wrapper.find('.usso-login__action').simulate('click');
    assert.equal(addNotification.callCount, 1);
    assert.deepEqual(addNotification.args[0][0], {
      title: 'cannot log into the controller',
      message: 'cannot log into the controller: Uh oh!',
      level: 'error'
    });
  });

  it('can render a button link', () => {
    const wrapper = renderComponent({displayType: 'button'});
    var expected = (
      <div className="usso-login v1">
        <Button
          action={wrapper.find('Button').prop('action')}
          extraClasses="usso-login__action"
          modifier="positive" >
          Sign up/Log in with USSO
        </Button>
      </div>);
    assert.compareJSX(wrapper, expected);
  });

  it('can render a button link with custom content', () => {
    const wrapper = renderComponent({
      children: 'Scooby Doo',
      displayType: 'button'
    });
    assert.equal(wrapper.find('Button').children().text(), 'Scooby Doo');
  });

  it('can render a text link with custom content', () => {
    const wrapper = renderComponent({children: 'Scooby Doo'});
    assert.equal(wrapper.find('.usso-login__action').text(), 'Scooby Doo');
  });

  it('calls loginToController on click for button link', () => {
    const loginToController = sinon.stub();
    const wrapper = renderComponent({
      displayType: 'button',
      loginToController
    });
    wrapper.find('Button').props().action();
    assert.equal(loginToController.callCount, 1);
  });
});

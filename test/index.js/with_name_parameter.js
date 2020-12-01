const test = require('ava').serial;
const awsApiMock = require('@2iq/aws-sdk-nock-responses');

const underTest = require('../..');

require('@actions/core').info = () => {};  // turn off console logging for tests

test('should create repo and lifecycle if not existent', async t => {
  awsApiMock.ecrResponses.repoDoesNotExist();
  awsApiMock.ecrResponses.repoCreationSuccessful();
  awsApiMock.ecrResponses.lifecycleUpdateSuccessfull();

  await underTest.executeGitHubAction();

  t.true(awsApiMock.isDone());
});

test('should not do anything if repo exists already', async t => {
  awsApiMock.ecrResponses.repoExists();

  await underTest.executeGitHubAction();

  t.true(awsApiMock.isDone());
});

test('should throw exception if aws user did not has needed permissions', async t => {
  awsApiMock.ecrResponses.accessDenied();

  await t.throwsAsync(async () =>
    await underTest.executeGitHubAction(),
    { name: 'AccessDeniedException' }
  );
});

// TODO tests wrong credentials

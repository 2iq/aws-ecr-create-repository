delete process.env['INPUT_ECR-NAME'];

const test = require('ava').serial;
const awsApiMock = require('@2iq/aws-sdk-nock-responses');

require('@actions/core').info = () => {};  // turn off console logging for tests

const underTest = require('../..');

test('should use git repo name as ecr repo name if ecr-name parameter is not provided', async t => {
  awsApiMock.ecrResponses.repoExists('git_repo_name');

  await underTest.executeGitHubAction();

  t.is(process.env['INPUT_ECR-NAME'], undefined);
  t.true(awsApiMock.isDone());
});

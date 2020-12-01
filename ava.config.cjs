module.exports = {
  environmentVariables: {
    // prevent read from `~/.aws/(config|credentials)` files
    AWS_ACCESS_KEY_ID: 'AKIAXXX',
    AWS_SECRET_ACCESS_KEY: 'XYZ',
    AWS_REGION: 'foo-central-42',

    // value returned by `require('@actions/core').getInput('ecr-name')`
    'INPUT_ECR-NAME': 'ecr_repo_name',

    // file with content in require('@actions/github').context.payload
    GITHUB_EVENT_PATH: 'test/githubEvent.json',
  }
};

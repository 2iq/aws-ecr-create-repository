const core = require('@actions/core');
const github = require('@actions/github');
const {
  ECR,
  DescribeRepositoriesCommand,
  CreateRepositoryCommand,
  PutRegistryPolicyCommand
} = require('@aws-sdk/client-ecr');

const ecr = new ECR();

const executeGitHubAction = async () => {
  const ecrRepoName = core.getInput('ecr-name') || github.context.payload.repository.name;
  const pullAccountIds = core.getInput('pull-account-ids') || '';
  let wantedEcrRepo;

  try {
    core.info(`Checking ECR repo '${ecrRepoName}'.`);
    wantedEcrRepo = await ecr.send(new DescribeRepositoriesCommand({repositoryNames: [ecrRepoName]}))
    wantedEcrRepo = wantedEcrRepo.repositories[0];

    core.info(`ECR repo '${ecrRepoName}' already exists.`);
    // TODO check repo lifecycle policy
  } catch (error) {
    if (error.name !== 'RepositoryNotFoundException') {
      throw error;
    }

    core.info(`ECR repo '${ecrRepoName}' does not exist.`);
    wantedEcrRepo = await createNewEcrRepo(ecrRepoName);
    wantedEcrRepo = wantedEcrRepo.repository;
    if (pullAccountIds) {
      await setupPermissions(ecrRepoName, pullAccountIds);
    }
  }

  core.setOutput('ecr-name', wantedEcrRepo.repositoryName);
  core.setOutput('ecr-arn', wantedEcrRepo.repositoryArn);
  core.setOutput('ecr-uri', wantedEcrRepo.repositoryUri);
};

const createNewEcrRepo = async (repoName) => {
  core.info(`Create new ECR repo '${repoName}'.`);

  const params = {
    "repositoryName": repoName,
    "imageScanningConfiguration": {
      "scanOnPush": false
    }
  };
  return await ecr.send(new CreateRepositoryCommand(params));
};

const setupPermissions = async (repoName, pullAccountIds) => {
  core.info(`Set policy permission to ECR repo '${repoName}'.`);
  const principals = pullAccountIds.split(',').map((id) => {
    return `arn:aws:iam::${id.trim()}:root`;
  });
  const policy = {
    "Version": "2008-10-17",
    "Statement": [
      {
        "Sid": "AllowCrossAccountPull",
        "Effect": "Allow",
        "Principal": {
          "AWS": principals,
        },
        "Action": [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer"
        ]
      }
    ]
  };

  const params = {
    "repositoryName": repoName,
    "policyText": JSON.stringify(policy)
  };
  await ecr.send(new PutRegistryPolicyCommand(params));
}

module.exports = {
  executeGitHubAction: executeGitHubAction
};

/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
  executeGitHubAction();
}

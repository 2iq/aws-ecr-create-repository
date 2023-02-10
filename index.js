const core = require('@actions/core');
const github = require('@actions/github');
const {
  ECR,
  DescribeRepositoriesCommand,
  CreateRepositoryCommand,
  PutLifecyclePolicyCommand
} = require('@aws-sdk/client-ecr');

const ecr = new ECR();

const executeGitHubAction = async () => {
  const ecrRepoName = core.getInput('ecr-name') || github.context.payload.repository.name;

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
    await setupPermissions(ecrRepoName);
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

const setupPermissions = async (repoName) => {
  core.info(`Set policy permission to ECR repo '${repoName}'.`);
  const policy = {
    "Version": "2008-10-17",
    "Statement": [
      {
        "Sid": "AllowCrossAccountPull",
        "Effect": "Allow",
        "Principal": {
          "AWS": [
            "arn:aws:iam::933342162591:root",
            "arn:aws:iam::931137651704:root",
            "arn:aws:iam::001802907465:root"
          ]
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
  await ecr.send(new SetRepositoryPolicyRequest(params));
}

module.exports = {
  executeGitHubAction: executeGitHubAction
};

/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
  executeGitHubAction();
}

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

    core.info(`ECR repo '${ecrRepoName}' exists already.`);
    // TODO check repo lifecycle policy
  } catch (error) {
    if (error.name !== 'RepositoryNotFoundException') {
      throw error;
    }

    core.info(`ECR repo '${ecrRepoName}' did't exists.`);
    wantedEcrRepo = await createNewEcrRepo(ecrRepoName);
    wantedEcrRepo = wantedEcrRepo.repository;
    await setupLifecyclePolicy(ecrRepoName);
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
      "scanOnPush": true
    }
  };
  return await ecr.send(new CreateRepositoryCommand(params));
};

const setupLifecyclePolicy = async (repoName) => {
  core.info(`Set lifecycle to ECR repo '${repoName}'.`);

  const lifecyclePolicy = {
    "rules": [{
      "rulePriority": 1,
      "description": "Expire images older than 30 days",
      "selection": {
        "tagStatus": "untagged",
        "countType": "sinceImagePushed",
        "countUnit": "days",
        "countNumber": 30
      },
      "action": {
        "type": "expire"
      }
    }]
  };

  const params = {
    "repositoryName": repoName,
    "lifecyclePolicyText": JSON.stringify(lifecyclePolicy)
  };
  await ecr.send(new PutLifecyclePolicyCommand(params));
};

module.exports = {
  executeGitHubAction: executeGitHubAction
};

/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
  executeGitHubAction();
}

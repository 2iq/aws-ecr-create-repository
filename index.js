const core = require('@actions/core');
const github = require('@actions/github');
const {
  ECR,
  DescribeRepositoriesCommand,
  CreateRepositoryCommand,
  SetRepositoryPolicyCommand
} = require('@aws-sdk/client-ecr');

const ecr = new ECR();

const executeGitHubAction = async () => {
  const ecrRepoName = core.getInput('ecr-name') || github.context.payload.repository.name;
  const pullAccountIds = core.getInput('pull-account-ids') || '';
  let wantedEcrRepo;

  try {
    core.info(`Checking ECR repo '${ecrRepoName}'.`);
    wantedEcrRepo = await ecr.send(new DescribeRepositoriesCommand({ repositoryNames: [ecrRepoName] }))
    wantedEcrRepo = wantedEcrRepo.repositories[0];

    core.info(`ECR repo '${ecrRepoName}' already exists.`);
  } catch (error) {
    if (error.name !== 'RepositoryNotFoundException') {
      throw error;
    }

    core.info(`ECR repo '${ecrRepoName}' does not exist.`);
    wantedEcrRepo = await createNewEcrRepo(ecrRepoName);
    wantedEcrRepo = wantedEcrRepo.repository;
  }

  await updateRepositoryPolicyIfRequired(ecrRepoName, pullAccountIds);

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

const updateRepositoryPolicyIfRequired = async (repoName, pullAccountIds) => {

  const principals = pullAccountIds.split(',').map((id) => {
    return `arn:aws:iam::${id.trim()}:root`;
  });
  principals.sort();

  const lambdaSourceArns = pullAccountIds.split(',').map((id) => {
    return `arn:aws:lambda:eu-west-1:${id.trim()}:function:*`
  });
  lambdaSourceArns.sort();

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
      },
      {
        "Sid": "LambdaECRImageRetrievalPolicy",
        "Effect": "Allow",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Action": [
          "ecr:BatchGetImage",
          "ecr:DeleteRepositoryPolicy",
          "ecr:GetDownloadUrlForLayer",
          "ecr:GetRepositoryPolicy",
          "ecr:SetRepositoryPolicy"
        ],
        "Condition": {
          "StringLike": {
            "aws:sourceArn": lambdaSourceArns
          }
        }
      }
    ]
  };

  let newPolicyText = JSON.stringify(policy);
  let updateRepositoryPolicy = false;

  // Do we need to update repository policy?
  try {
    r = await ecr.getRepositoryPolicy({ repositoryName: repoName })
    let oldPolicyText = JSON.stringify(JSON.parse(r.policyText))

    // Update only if policy changed
    if (oldPolicyText !== newPolicyText) {
      updateRepositoryPolicy = true;
    }

  } catch (error) {
    if (error.name !== 'RepositoryPolicyNotFoundException') {
      throw error;
    }

    // OR if no Policy available yet
    updateRepositoryPolicy = true;
  }

  if (updateRepositoryPolicy && principals.length > 0) {
    core.info(`Set policy permission to ECR repo '${repoName}':`);
    core.info(newPolicyText);
    const params = {
      "repositoryName": repoName,
      "policyText": newPolicyText
    };
    await ecr.send(new SetRepositoryPolicyCommand(params));
  }
}

module.exports = {
  executeGitHubAction: executeGitHubAction
};

/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
  executeGitHubAction();
}

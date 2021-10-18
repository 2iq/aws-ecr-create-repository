# aws-ecr-create-repository

This GitHub action creates a new AWS ECR repository.

In case a ECR repository with the same name already exists, it will exit.
The name for the AWS ECR repository can be specified or it will fallback to the current git repository name.
On creation a lifecycle is added that removes untagged images after 30 days.

## Usage

The action uses defaults, that allow usage without custom configuration.

### Create ECR repo with default name

This is the most simple example.
It will create a ECR repository using the git repository's name.

```yaml
      - uses: @2iq/aws-ecr-create-repository@v1
```

### Create ECR repo with custom name

A custom name can set with the property `ecr-name`.

```yaml
      - uses: @2iq/aws-ecr-create-repository@v1
        with:
          ecr-name: my-custom-ecr-repo-name
```

### Usual usage example

This is mostly copy and paste-able example for common use case:

```yaml

jobs:
  build-and-upload:
    runs-on: ubuntu-20.04

    steps:
      # ...

      - name: Set AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{secrets.AWS_ACCESS_KEY_ID}}
          aws-secret-access-key: ${{secrets.AWS_SECRET_ACCESS_KEY}}
          aws-region: eu-central-1

      - name: Create ECR repo if necessary
        id: ecr-repo
        uses: @2iq/aws-ecr-create-repository@v1
        with:
          ecr-name: my-custom-ecr-repo-name

      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build, tag, and push image to Amazon ECR
        env:
          ECR_URI: ${{steps.ecr-repo.outputs.repository-uri}}
          IMAGE_TAG: ${{steps.deploy-context.outputs.env}}
        run: |
          docker build -t $ECR_URI:$IMAGE_TAG .
          docker push $ECR_URI:$IMAGE_TAG

      # ...
```

### Run without GitHub Actions

You can also run it locally on your CLI.

This example shows how to run it on fishshell:

```sh
env INPUT_ECR-NAME=foobar node index.js;
```

## Inputs

### `ecr-name`

The ECR repository name is optional.
It will fallback to the name of git repository where action is executed from.

## Outputs

### `ecr-name`

The name of the ECR repository; `ecr-name` from inputs.

Examples: `my-custom-ecr-repo-name`, `aws-ecr-create-repository`, `foo`

### `ecr-arn`

The ARN of the ECR repository.

Example: `arn:aws:ecr:eu-central-1:123456789012:repository/my-custom-ecr-repo-name`

### `ecr-uri`

The URI of the ECR repository.

Example: `123456789012.dkr.ecr.eu-central-1.amazonaws.com/my-custom-ecr-repo-name`

## Permissions

The action needs the following IAM permission to work properly:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowGithubActionAwsEcrCreateRepositoryAccess",
      "Effect": "Allow",
      "Action": [
        "ecr:DescribeRepositories",
        "ecr:CreateRepository",
        "ecr:PutLifecyclePolicy"
      ],
      "Resource": [
        "arn:aws:ecr:<REGION>:<ACCOUNT_ID>:repository/<REPO_NAME>"
      ]
    }
  ]
}
```

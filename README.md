# aws-ecr-create-repository

GitHub action that creates AWS ECR repository if not available.

## Usage

This action checks if wanted ECR repository exists.
If the ECR repository is not existent then the GitHub action creates one and sets lifecycle.
If repository is already existent then nothing else happens.
Outputs are set in any case.

## Examples

### Check and create ECR repo with default name

This is the most easy example:

```yaml
      - uses: @2iq/aws-ecr-create-repository@v1
```

Because `ecr-name` was not provided the GitHub Action will take default name.
Default name is the name of git repo (without organization) where action is running.
You can also use custom ECR name as example below shows.

### Create ECR repo with custom name

This is example with custom ECR name:

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

## Inputs

### `ecr-name`

**Required** The name ECR repository that needs to be created if not existent.
    Default: name of git repository where action is executed.

## Outputs

### `ecr-name`

The name of the ECR repository.
Same as `ecr-name` in inputs.

Examples: `my-custom-ecr-repo-name`, `aws-ecr-create-repository`, `foo`

### `ecr-arn`

The ARN of the ECR repository.

Example: `arn:aws:ecr:eu-central-1:123456789012:repository/my-custom-ecr-repo-name`

### `ecr-uri`

The URI of the ECR repository.

Example: `123456789012.dkr.ecr.eu-central-1.amazonaws.com/my-custom-ecr-repo-name`

## Needed IAM permissions

The action needs follows IAM permission to work properly:

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

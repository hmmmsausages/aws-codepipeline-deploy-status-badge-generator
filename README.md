# aws-codepipeline-deploy-status-badge-generator

[![aws-codepipeline-deploy-status-badge-generator Pipeline Status](https://<aws-codepipeline-deploy-status-badge-generator-api>/pipeline/aws-codepipeline-deploy-status-badge-generator-pipeline/status?label=aws-codepipeline-deploy-status-badge-generator)](https://eu-central-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/aws-codepipeline-deploy-status-badge-generator-pipeline/view?region=eu-west-2)
[![Deployed aws-codepipeline-deploy-status-badge-generator Commit](https://<aws-codepipeline-deploy-status-badge-generator-api>/pipeline/aws-codepipeline-deploy-status-badge-generator-pipeline/commit/id?label=aws-codepipeline-deploy-status-badge-generator)](https://<aws-codepipeline-deploy-status-badge-generator-api>/pipeline/aws-codepipeline-deploy-status-badge-generator-pipeline/commit/url)

AWS Lambda application that analyses CloudWatch CodePipeline Events, updates a DynamoDB table with the extracted deployment information
and serves GitHub badges via provided Rest API, alternatively status can be updated via API call directly
Complete overkill for something so simple but AWS CodePipeline / CodeDeploy doesn't offer you any help otherwise.
API serves content in a "non-cacheable" manner, so GitHub will show the most up-to-date badge.

## API Endpoints of `aws-codepipeline-deploy-status-badge-generator-api`

| Badge Name | Description | Example   |
|---|---|---|
| `GET /pipeline/{pipelineName}/status` | Deployment status of pipeline   | ![CodePipeline Status](https://<aws-codepipeline-deploy-status-badge-generator-api>/pipeline/aws-codepipeline-deploy-status-badge-generator-pipeline/status) |
| `GET /pipeline/{pipelineName}/status?label=Badge%20Generator` | Deployment status of pipeline with alternative label  | ![CodePipeline Status](https://<aws-codepipeline-deploy-status-badge-generator-api>/pipeline/aws-codepipeline-deploy-status-badge-generator-pipeline/status?label=Badge%20Generator) |
| `GET /pipeline/{pipelinaName}/id`  | Short SHA-1 hash of last successfully deployed commit of pipeline | ![GitHub Short SHA1](https://<aws-codepipeline-deploy-status-badge-generator-api>/pipeline/aws-codepipeline-deploy-status-badge-generator-pipeline/commit/id) |
| `GET /pipeline/{pipelinaName}/id?label=Badge%20Generator`  | Short SHA-1 hash of last successfully deployed commit of pipeline with alternative label | ![GitHub Short SHA1](https://<aws-codepipeline-deploy-status-badge-generator-api>/pipeline/aws-codepipeline-deploy-status-badge-generator-pipeline/commit/id?label=Badge%20Generator) |
| `GET /pipeline/{pipelinaName}/url` | Redirect link to GitHub commit of last deployed commit | [GitHub direct link to last deployed commit](https://<aws-codepipeline-deploy-status-badge-generator-api>/pipeline/aws-codepipeline-deploy-status-badge-generator-pipeline/commit/url) |
| `POST /pipeline/{pipelinaName}` | Update deployment status (requires API key) | `curl -d '{"status": "SUCCEEDED", "deployedCommitId": "123", "deployedCommitUrl": "https://commit.url"}' -H 'X-API-Key:123-123-123-123' https://<aws-codepipeline-deploy-status-badge-generator-api>/pipeline/test-piepeline` |


## Deployment

Deployment via AWS CodePipeline and automatically triggered on push event to `origin/master` branch.

CodePipeline: [aws-codepipeline-deploy-status-badge-generator-pipeline](https://eu-central-1.console.aws.amazon.com/codesuite/codepipeline/pipelines/aws-codepipeline-deploy-status-badge-generator-pipeline/view?region=eu-west-2)
 
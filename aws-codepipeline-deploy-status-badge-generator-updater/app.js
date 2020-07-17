const AWS = require('aws-sdk')

const codepipeline = new AWS.CodePipeline({
  apiVersion: '2015-07-09',
  region: process.env.AWS_REGION
})
const dynamoDb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION
})

const dynamoDbTableName = process.env.DYANMO_DB_TABLE_NAME

async function updatePipelineStatus (pipelineName, status) {
  try {
    await dynamoDb.update({
      TableName: dynamoDbTableName,
      Key: {
        pipelineName: pipelineName
      },
      UpdateExpression: 'SET #S = :s',
      ExpressionAttributeNames: {
        '#S': 'status'
      },
      ExpressionAttributeValues: {
        ':s': status
      }
    }).promise()
  } catch (error) {
    console.error(`Failed to update pipeline status in DynamoDB table '${dynamoDbTableName}' due to error: '${JSON.stringify(error)}'`)
  }
}

async function updatePipelineCommit (pipelineName, commitId, commitUrl) {
  try {
    await dynamoDb.update({
      TableName: dynamoDbTableName,
      Key: {
        pipelineName: pipelineName
      },
      UpdateExpression: 'SET #I = :i, #U = :u',
      ExpressionAttributeNames: {
        '#I': 'deployedCommitId',
        '#U': 'deployedCommitGitHubUrl'
      },
      ExpressionAttributeValues: {
        ':i': commitId,
        ':u': commitUrl
      }
    }).promise()
  } catch (error) {
    console.error(`Failed to update pipeline deployed commit information in DynamoDB table '${dynamoDbTableName}' due to error: '${JSON.stringify(error)}'`)
  }
}

const getDeploymentDetails = async (pipelineName, pipelineExecutionId) => {
  const listActionExecutionsResult = await codepipeline.listActionExecutions({
    pipelineName,
    filter: {
      pipelineExecutionId
    }
  }).promise()

  console.info(`Read CodePipeline action execution list: ${JSON.stringify(listActionExecutionsResult)}`)

  const {
    executionResult: {
      externalExecutionUrl: commitUrl
    },
    outputVariables: {
      CommitId: commitId
    }
  } = listActionExecutionsResult.actionExecutionDetails
    .find(actionExecution => actionExecution.stageName.toLowerCase().includes('source')).output

  return {
    commitId,
    commitUrl
  }
}

const handler = async event => {
  console.info(`Received CloudWatch event: ${JSON.stringify(event)}`)
  const {
    pipeline: pipelineName,
    'execution-id': pipelineExecutionId,
    stage: pipelineStage,
    state: pipelineStageState
  } = event

  // Ignore other stages
  if (!pipelineStage.toLowerCase().includes('deploy')) {
    console.info(`Skipped further processing as pipelineStage is: ${pipelineStage}`)
    return
  }

  console.info(`Updating CodePipeline deployment information for: ${pipelineName} ...`)

  await updatePipelineStatus(pipelineName, pipelineStageState)

  // update latest successfully deployed commit information if pipeline has finished successfully
  if (pipelineStageState === 'SUCCEEDED') {
    const {
      commitId,
      commitUrl
    } = await getDeploymentDetails(pipelineName, pipelineExecutionId)

    await updatePipelineCommit(pipelineName, commitId, commitUrl)
  }

  console.info(`Successfully updated CodePipeline deployment information for: ${pipelineName}`)
}

exports.handler = handler

const AWS = require('aws-sdk')
const badgen = require('badgen').badgen

const dynamoDb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION
})

const dynamoDbTableName = process.env.DYANMO_DB_TABLE_NAME

const pipelineStateToBadgeDetails = {
  STARTED: {
    color: 'yellow',
    status: 'Deploying...'
  },
  FAILED: {
    color: 'red',
    status: 'Failed'
  },
  SUCCEEDED: {
    color: 'green',
    status: 'Successful'
  }
}

const getPipelineDeploymentDetails = async pipelineName => {
  try {
    const result = await dynamoDb.get({
      Key: {
        pipelineName: pipelineName
      },
      TableName: dynamoDbTableName
    }).promise()
    console.info(`Fetched deployment information for '${pipelineName}' from DynamoDB: ${JSON.stringify(result.Item)}`)
    return result.Item || {}
  } catch (error) {
    console.error(`Failed to get pipeline status from DynamoDB table '${dynamoDbTableName}' due to error: '${JSON.stringify(error)}'`)
    return {}
  }
}

const updatePipelineDeploymentDetails = async (pipelineName, { status, deployedCommitId, deployedCommitGitHubUrl }, { status: newStatus, deployedCommitId: newDeployedCommitId, deployedCommitGitHubUrl: newDeployedCommitGitHubUrl }) => {
  try {
    await dynamoDb.update({
      Key: {
        pipelineName
      },
      TableName: dynamoDbTableName,
      UpdateExpression: 'SET #S = :s, #I = :i, #U = :u',
      ExpressionAttributeNames: {
        '#S': 'status',
        '#I': 'deployedCommitId',
        '#U': 'deployedCommitGitHubUrl'
      },
      ExpressionAttributeValues: {
        ':s': newStatus || status || '',
        ':i': newDeployedCommitId || deployedCommitId || '',
        ':u': newDeployedCommitGitHubUrl || deployedCommitGitHubUrl || ''
      }
    }).promise()

    return {
      statusCode: 200
    }
  } catch (error) {
    console.log('error', error)
    console.error(`Failed to update pipeline deployed information in DynamoDB table '${dynamoDbTableName}' due to error: '${JSON.stringify(error)}'`)
    return {
      statusCode: 500
    }
  }
}

const handler = async event => {
  console.info(`Received API event: ${JSON.stringify(event)}`)
  const { resource, pathParameters: { pipelineName }, queryStringParameters, body } = event

  const {
    status,
    deployedCommitId,
    deployedCommitGitHubUrl
  } = await getPipelineDeploymentDetails(pipelineName)

  // Allow overwriting pipeline name label via query parameter 'label' (e.g. ?label=new-name)
  const pipelineNameLabel = (queryStringParameters || {}).label || pipelineName

  let response = {
    statusCode: 404
  }

  switch (resource) {
    case '/pipeline/{pipelineName}':
      try {
        const { status: newStatus, deployedCommitId: newDeployedCommitId, deployedCommitGitHubUrl: newDeployedCommitGitHubUrl } = JSON.parse(body)
        if (typeof newStatus === 'undefined' && typeof newDeployedCommitId === 'undefined' && typeof newDeployedCommitGitHubUrl === 'undefined') {
          throw new Error('At least one of \'status\', \'deployedCommitId\' or \'deployedCommitGitHubUrl\' needs to be defined in the body')
        }
        if (newStatus && !['STARTED', 'FAILED', 'SUCCEEDED'].includes(newStatus)) {
          throw new Error('\'status\' needs to be one of [\'STARTED\', \'FAILED\', \'SUCCEEDED\']')
        }

        response = await updatePipelineDeploymentDetails(
          pipelineName,
          {
            status,
            deployedCommitId,
            deployedCommitGitHubUrl
          },
          {
            status: newStatus,
            deployedCommitId: newDeployedCommitId,
            deployedCommitGitHubUrl: newDeployedCommitGitHubUrl
          }
        )
      } catch (error) {
        console.error(`Failed to update pipeline deployed information due to error: '${error.message}'`)
        response = {
          statusCode: 400,
          body: error.message
        }
      }
      break
    case '/pipeline/{pipelineName}/commit/id':
      response = {
        statusCode: 200,
        headers: {
          'content-type': 'image/svg+xml',
          'cache-control': 'no-cache',
          etag: `${pipelineNameLabel}:${deployedCommitId}`
        },
        body: badgen({
          label: `${pipelineNameLabel} - last deployed commit`,
          status: deployedCommitId ? deployedCommitId.substring(0, 7) : 'unknown',
          color: deployedCommitId ? 'green' : 'grey'
        })
      }
      break
    case '/pipeline/{pipelineName}/commit/url':
      response = {
        statusCode: 302,
        headers: {
          location: deployedCommitGitHubUrl || 'https://github.com'
        }
      }
      break
    case '/pipeline/{pipelineName}/status':
      response = {
        statusCode: 200,
        headers: {
          'content-type': 'image/svg+xml',
          'cache-control': 'no-cache',
          etag: `${pipelineNameLabel}:${status}`
        },
        body: badgen({
          label: `${pipelineNameLabel} - current status`,
          status: status ? pipelineStateToBadgeDetails[status].status : 'unknown',
          color: status ? pipelineStateToBadgeDetails[status].color : 'grey'
        })
      }
      break
    default:
      break
  }

  console.info(`Call to resource: '${resource}' for pipeline: '${pipelineName}' and query: '${JSON.stringify(queryStringParameters)}' generated following response: '${JSON.stringify(response)}'`)

  return response
}

exports.handler = handler
